from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import asyncio
import json
import os
import sys
import requests
from dotenv import load_dotenv
import re
import uuid
from pathlib import Path
import tempfile
import shutil

# TTS imports
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False

try:
    import win32com.client
    SAPI_AVAILABLE = True
except ImportError:
    SAPI_AVAILABLE = False

# Audio processing imports
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False

load_dotenv()

app = FastAPI(title="GitHub Podcast Generator")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for serving audio
os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

GITHUB_API_KEY = os.getenv("GITHUB_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except:
            self.disconnect(websocket)

manager = ConnectionManager()

def parse_github_url(url):
    if "github.com" not in url:
        raise Exception("Invalid GitHub URL.")
    parts = url.split("github.com/")[1].split('/')
    owner, repo = parts[0], parts[1].replace(".git", "")
    return owner, repo

def fetch_repo_info(owner, repo):
    headers = {
        "Authorization": f"Bearer {GITHUB_API_KEY}",
        "Accept": "application/vnd.github.v3+json"
    }

    def gh(endpoint):
        url = f"https://api.github.com/repos/{owner}/{repo}{endpoint}"
        res = requests.get(url, headers=headers)
        if not res.ok:
            raise Exception(f"GitHub API error: {endpoint} - {res.status_code}")
        return res.json()

    # Fetch repo details
    repo_data = gh("")
    readme = ""
    try:
        readme_res = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/readme",
            headers={**headers, "Accept": "application/vnd.github.v3.raw"}
        )
        if readme_res.ok:
            readme = readme_res.text
        else:
            readme = "No README found."
    except Exception:
        readme = "No README found."

    pkg = ""
    try:
        pkg_res = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/package.json",
            headers={**headers, "Accept": "application/vnd.github.v3.raw"}
        )
        if pkg_res.ok:
            pkg = pkg_res.text
    except Exception:
        pkg = ""

    try:
        languages = gh("/languages")
    except Exception:
        languages = {}

    try:
        contributors = gh("/contributors")
        contributors_str = ', '.join([c.get("login", "") for c in contributors[:5]])
    except Exception:
        contributors_str = ""

    return {
        "owner": owner,
        "repo": repo,
        "desc": repo_data.get("description", ""),
        "topics": repo_data.get("topics", []),
        "stars": repo_data.get("stargazers_count", 0),
        "forks": repo_data.get("forks_count", 0),
        "watchers": repo_data.get("watchers_count", 0),
        "homepage": repo_data.get("homepage", ""),
        "license": (repo_data.get("license") or {}).get("spdx_id", ""),
        "languages": languages,
        "contributors": contributors_str,
        "readme": readme,
        "pkg": pkg
    }

def generate_prompt(info):
    return f"""
Pretend you're a podcast host interviewing a guest developer. Given the following GitHub project details:
- Name: {info['owner']}/{info['repo']}
- Description: {info['desc']}
- Main language(s): {', '.join(info['languages'].keys())}
- Stars: {info['stars']}
- Top contributors: {info['contributors']}
- Topics: {', '.join(info['topics'])}
- Homepage: {info['homepage']}
- License: {info['license']}
- README: {info['readme'][:2000]}
- package.json: {info['pkg'][:1000]}

Generate a detailed podcast script (at least 10 minutes long) with natural conversation between host and guest. Cover:
- What the project is and how it works
- Key features and usage
- The big idea and what problem it solves
- How the code is structured
- Interesting or challenging parts of the implementation
- Disadvantages or limitations
- Who should use it and why

Format as a script with clear speaker changes using exactly "Host:" and "Guest:" prefixes. Make it conversational and engaging. Avoid overly technical jargon. Keep individual responses to 2-3 sentences for better audio flow.
"""

def call_gemini(prompt):
    model = "gemini-2.0-flash"
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.9,
            "topP": 1,
            "topK": 1,
            "maxOutputTokens": 2048
        }
    }

    res = requests.post(endpoint, json=body)
    if not res.ok:
        raise Exception("Gemini API Error: " + res.text)

    data = res.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print("⚠️ Unexpected Gemini Response:", data)
        return "No valid text response from Gemini."

def parse_script_speakers(script_text):
    """Parse the script and separate host and guest parts"""
    lines = script_text.split('\n')
    speakers = []
    
    for line in lines:
        line = line.strip()
        if line.startswith('Host:'):
            speakers.append(('host', line[5:].strip()))
        elif line.startswith('Guest:'):
            speakers.append(('guest', line[6:].strip()))
        elif line and not line.startswith('#') and not line.startswith('*'):
            if speakers and speakers[-1][1]:
                speakers[-1] = (speakers[-1][0], speakers[-1][1] + ' ' + line)
    
    return speakers

def clean_text_for_tts(text):
    """Clean text for better TTS output"""
    # Remove markdown formatting
    clean_text = re.sub(r'\*\*.*?\*\*', '', text)
    clean_text = re.sub(r'#{1,6}\s', '', clean_text)
    clean_text = re.sub(r'\[.*?\]\(.*?\)', '', clean_text)  # Remove markdown links
    clean_text = re.sub(r'`.*?`', '', clean_text)  # Remove code blocks
    
    # Fix common pronunciation issues
    clean_text = re.sub(r'\bGitHub\b', 'Git Hub', clean_text)
    clean_text = re.sub(r'\bAPI\b', 'A P I', clean_text)
    clean_text = re.sub(r'\bURL\b', 'U R L', clean_text)
    clean_text = re.sub(r'\bHTML\b', 'H T M L', clean_text)
    clean_text = re.sub(r'\bCSS\b', 'C S S', clean_text)
    clean_text = re.sub(r'\bJS\b', 'JavaScript', clean_text)
    
    # Clean up whitespace
    clean_text = re.sub(r'\s+', ' ', clean_text)
    clean_text = clean_text.strip()
    
    return clean_text

async def combine_audio_with_pydub(file_list, output_filename):
    """Combine audio files using pydub (more reliable than ffmpeg)"""
    try:
        print(f"🔗 Combining {len(file_list)} audio segments with pydub...")
        
        combined = AudioSegment.empty()
        
        for i, audio_file in enumerate(file_list):
            if os.path.exists(audio_file) and os.path.getsize(audio_file) > 0:
                try:
                    # Load audio segment
                    segment = AudioSegment.from_mp3(audio_file)
                    
                    # Add a small pause between segments
                    if i > 0:
                        pause = AudioSegment.silent(duration=500)  # 0.5 second pause
                        combined += pause
                    
                    combined += segment
                    print(f"✅ Added segment {i+1}/{len(file_list)}")
                    
                except Exception as e:
                    print(f"⚠️ Failed to load segment {audio_file}: {e}")
                    continue
        
        if len(combined) > 0:
            # Export the combined audio
            combined.export(output_filename, format="mp3", bitrate="128k")
            print(f"✅ Successfully combined audio: {len(combined)}ms total")
            return True
        else:
            print("❌ No audio segments to combine")
            return False
            
    except Exception as e:
        print(f"❌ Pydub combination failed: {e}")
        return False

async def combine_audio_with_ffmpeg(file_list, output_filename):
    """Fallback: combine audio files using ffmpeg"""
    try:
        print(f"🔗 Combining {len(file_list)} audio segments with ffmpeg...")
        
        # Create a temporary directory for this operation
        with tempfile.TemporaryDirectory() as temp_dir:
            filelist_path = os.path.join(temp_dir, "filelist.txt")
            
            # Create a list file for ffmpeg
            with open(filelist_path, "w") as f:
                for audio_file in file_list:
                    if os.path.exists(audio_file):
                        f.write(f"file '{os.path.abspath(audio_file)}'\n")
            
            # Try to combine with ffmpeg
            process = await asyncio.create_subprocess_exec(
                'ffmpeg', '-y', '-f', 'concat', '-safe', '0', 
                '-i', filelist_path, '-c', 'copy', output_filename,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                print("✅ Combined audio segments with ffmpeg")
                return True
            else:
                print(f"⚠️ ffmpeg failed with code {process.returncode}")
                if stderr:
                    print(f"Error: {stderr.decode()}")
                return False
                
    except Exception as e:
        print(f"❌ ffmpeg combination failed: {e}")
        return False

async def combine_audio_simple_concat(file_list, output_filename):
    """Simple fallback: just use the first valid file or concatenate binary data"""
    try:
        print("🔗 Using simple file concatenation...")
        
        # Find the first valid file
        valid_files = [f for f in file_list if os.path.exists(f) and os.path.getsize(f) > 0]
        
        if not valid_files:
            return False
        
        if len(valid_files) == 1:
            # Just copy the single file
            shutil.copy2(valid_files[0], output_filename)
            print("✅ Used single audio file")
            return True
        
        # Try simple binary concatenation (works for some formats)
        with open(output_filename, 'wb') as outfile:
            for fname in valid_files:
                with open(fname, 'rb') as infile:
                    outfile.write(infile.read())
        
        print(f"✅ Simple concatenation of {len(valid_files)} files")
        return True
        
    except Exception as e:
        print(f"❌ Simple concatenation failed: {e}")
        return False

async def generate_audio_edge_tts(script_text, filename):
    """Generate audio using Microsoft Edge TTS with different voices"""
    print("🔊 Generating audio with Edge TTS (dual voice)...")
    
    speakers = parse_script_speakers(script_text)
    
    if not speakers:
        print("⚠️ No speakers found")
        return False
    
    # Create a temporary directory for audio segments
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_files = []
        
        # Define voices for host and guest
        host_voice = "en-US-JennyNeural"  # Female voice
        guest_voice = "en-US-GuyNeural"   # Male voice
        
        for i, (speaker, text) in enumerate(speakers):
            if not text.strip():
                continue
            
            # Clean text for TTS
            clean_text = clean_text_for_tts(text)
            
            if clean_text:
                voice = host_voice if speaker == 'host' else guest_voice
                temp_filename = os.path.join(temp_dir, f"temp_{speaker}_{i}.mp3")
                
                try:
                    # Generate speech
                    communicate = edge_tts.Communicate(clean_text, voice)
                    await communicate.save(temp_filename)
                    
                    if os.path.exists(temp_filename) and os.path.getsize(temp_filename) > 0:
                        temp_files.append(temp_filename)
                        print(f"📦 Created {speaker} segment {i} with {voice}")
                    else:
                        print(f"⚠️ Empty audio file for segment {i}")
                        
                except Exception as e:
                    print(f"⚠️ Failed to generate segment {i}: {e}")
                    continue
        
        # Try multiple methods to combine audio files
        if temp_files:
            success = False
            
            # Method 1: Try pydub (most reliable)
            if PYDUB_AVAILABLE and not success:
                success = await combine_audio_with_pydub(temp_files, filename)
            
            # Method 2: Try ffmpeg
            if not success:
                success = await combine_audio_with_ffmpeg(temp_files, filename)
            
            # Method 3: Simple fallback
            if not success:
                success = await combine_audio_simple_concat(temp_files, filename)
            
            return success
    
    return False

async def generate_audio_pyttsx3_dual(script_text, filename):
    """Generate audio using pyttsx3 with voice switching"""
    try:
        print("🔊 Generating audio with pyttsx3 (dual voice)...")
        
        speakers = parse_script_speakers(script_text)
        if not speakers:
            return False
        
        import threading
        import queue
        
        def tts_worker(text_queue, file_queue, voice_id):
            try:
                engine = pyttsx3.init()
                voices = engine.getProperty('voices')
                
                if voices and len(voices) > voice_id:
                    engine.setProperty('voice', voices[voice_id].id)
                
                engine.setProperty('rate', 180)
                engine.setProperty('volume', 0.9)
                
                while True:
                    item = text_queue.get()
                    if item is None:
                        break
                    
                    idx, text = item
                    temp_file = f"temp_pyttsx3_{idx}.wav"
                    engine.save_to_file(text, temp_file)
                    engine.runAndWait()
                    
                    if os.path.exists(temp_file):
                        file_queue.put(temp_file)
                    
                    text_queue.task_done()
                    
            except Exception as e:
                print(f"⚠️ pyttsx3 worker error: {e}")
        
        # Create queues for threading
        host_queue = queue.Queue()
        guest_queue = queue.Queue()
        file_queue = queue.Queue()
        
        # Start worker threads
        host_thread = threading.Thread(target=tts_worker, args=(host_queue, file_queue, 0))
        guest_thread = threading.Thread(target=tts_worker, args=(guest_queue, file_queue, 1 if len(pyttsx3.init().getProperty('voices')) > 1 else 0))
        
        host_thread.start()
        guest_thread.start()
        
        # Queue up the work
        for i, (speaker, text) in enumerate(speakers):
            clean_text = clean_text_for_tts(text)
            if clean_text:
                if speaker == 'host':
                    host_queue.put((i, clean_text))
                else:
                    guest_queue.put((i, clean_text))
        
        # Signal completion
        host_queue.put(None)
        guest_queue.put(None)
        
        # Wait for completion
        host_thread.join()
        guest_thread.join()
        
        # Collect generated files
        temp_files = []
        while not file_queue.empty():
            temp_files.append(file_queue.get())
        
        # Combine files
        if temp_files:
            if PYDUB_AVAILABLE:
                success = await combine_audio_with_pydub(temp_files, filename)
            else:
                success = await combine_audio_simple_concat(temp_files, filename)
            
            # Clean up
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            return success
        
    except Exception as e:
        print(f"❌ pyttsx3 dual voice failed: {e}")
    
    return False

async def generate_audio_gtts_single(script_text, filename):
    """Generate audio using Google TTS (single voice fallback)"""
    try:
        print("🔊 Using Google TTS (single voice fallback)...")
        
        # Clean up the script text
        clean_text = re.sub(r'Host:|Guest:', '', script_text)
        clean_text = clean_text_for_tts(clean_text)
        clean_text = re.sub(r'\n+', '. ', clean_text)
        
        if clean_text:
            tts = gTTS(text=clean_text, lang='en', slow=False)
            tts.save(filename)
            print("✅ Generated single voice audio with gTTS")
            return True
            
    except Exception as e:
        print(f"❌ gTTS failed: {e}")
    
    return False

async def generate_audio_sapi_dual(script_text, filename):
    """Generate audio using Windows SAPI with dual voices"""
    try:
        print("🔊 Generating audio with Windows SAPI (dual voice)...")
        
        speakers = parse_script_speakers(script_text)
        if not speakers:
            return False
        
        import comtypes.client
        
        # Initialize SAPI
        sapi = comtypes.client.CreateObject("SAPI.SpVoice")
        voices = sapi.GetVoices()
        
        temp_files = []
        
        for i, (speaker, text) in enumerate(speakers):
            clean_text = clean_text_for_tts(text)
            if not clean_text:
                continue
            
            temp_filename = f"temp_sapi_{speaker}_{i}.wav"
            
            try:
                # Select voice (try to use different voices for host/guest)
                if speaker == 'host' and voices.Count > 0:
                    sapi.Voice = voices.Item(0)
                elif speaker == 'guest' and voices.Count > 1:
                    sapi.Voice = voices.Item(1)
                elif voices.Count > 0:
                    sapi.Voice = voices.Item(0)
                
                # Set up file output
                file_stream = comtypes.client.CreateObject("SAPI.SpFileStream")
                file_stream.Open(temp_filename, 3)  # Write mode
                sapi.AudioOutputStream = file_stream
                
                # Speak to file
                sapi.Speak(clean_text, 0)  # Synchronous
                file_stream.Close()
                
                if os.path.exists(temp_filename) and os.path.getsize(temp_filename) > 0:
                    temp_files.append(temp_filename)
                    print(f"📦 Created {speaker} segment {i} with SAPI")
                
            except Exception as e:
                print(f"⚠️ SAPI segment {i} failed: {e}")
                continue
        
        # Combine files
        if temp_files:
            if PYDUB_AVAILABLE:
                success = await combine_audio_with_pydub(temp_files, filename)
            else:
                success = await combine_audio_simple_concat(temp_files, filename)
            
            # Clean up
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            return success
        
    except Exception as e:
        print(f"❌ Windows SAPI failed: {e}")
    
    return False

async def generate_audio_with_fallbacks(script_text, filename):
    """Try multiple TTS engines with dual voice support and fallbacks"""
    success = False
    
    # Method 1: Edge TTS (best quality, dual voice)
    if EDGE_TTS_AVAILABLE and not success:
        print("🎯 Trying Edge TTS...")
        success = await generate_audio_edge_tts(script_text, filename)
    
    # Method 2: Windows SAPI (dual voice, Windows only)
    if SAPI_AVAILABLE and not success:
        print("🎯 Trying Windows SAPI...")
        success = await generate_audio_sapi_dual(script_text, filename)
    
    # Method 3: pyttsx3 (dual voice attempt)
    if PYTTSX3_AVAILABLE and not success:
        print("🎯 Trying pyttsx3...")
        success = await generate_audio_pyttsx3_dual(script_text, filename)
    
    # Method 4: Google TTS (single voice fallback)
    if GTTS_AVAILABLE and not success:
        print("🎯 Trying Google TTS (single voice)...")
        success = await generate_audio_gtts_single(script_text, filename)
    
    return success

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "generate_podcast":
                repo_url = message["repo_url"]
                session_id = str(uuid.uuid4())
                
                try:
                    # Send progress updates
                    await manager.send_message(websocket, {
                        "type": "progress",
                        "step": "fetching_repo",
                        "message": "Fetching repository information..."
                    })
                    
                    # Parse and fetch repo info
                    owner, repo = parse_github_url(repo_url)
                    info = fetch_repo_info(owner, repo)
                    
                    await manager.send_message(websocket, {
                        "type": "progress",
                        "step": "generating_script",
                        "message": "Generating podcast script with AI..."
                    })
                    
                    # Generate script
                    prompt = generate_prompt(info)
                    podcast_text = call_gemini(prompt)
                    
                    await manager.send_message(websocket, {
                        "type": "progress",
                        "step": "generating_audio",
                        "message": "Converting script to audio with dual voices (this may take a few minutes)..."
                    })
                    
                    # Generate audio with multiple fallback methods
                    audio_filename = f"podcast_{owner}_{repo}_{session_id}.mp3"
                    audio_path = f"static/audio/{audio_filename}"
                    
                    success = await generate_audio_with_fallbacks(podcast_text, audio_path)
                    
                    if success and os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
                        # Send completion message
                        await manager.send_message(websocket, {
                            "type": "podcast_ready",
                            "audio_url": f"/static/audio/{audio_filename}",
                            "script": podcast_text,
                            "repo_info": {
                                "owner": owner,
                                "repo": repo,
                                "description": info["desc"],
                                "stars": info["stars"],
                                "languages": list(info["languages"].keys())
                            }
                        })
                    else:
                        raise Exception("Failed to generate audio file with any available TTS engine")
                        
                except Exception as e:
                    await manager.send_message(websocket, {
                        "type": "error",
                        "message": f"Error: {str(e)}"
                    })
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
async def read_index():
    return {"message": "GitHub Podcast Generator API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "tts_engines": {
            "edge_tts": EDGE_TTS_AVAILABLE,
            "pyttsx3": PYTTSX3_AVAILABLE,
            "gtts": GTTS_AVAILABLE,
            "sapi": SAPI_AVAILABLE,
            "pydub": PYDUB_AVAILABLE
        },
        "api_keys": {
            "github": bool(GITHUB_API_KEY),
            "gemini": bool(GEMINI_API_KEY)
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting GitHub Podcast Generator Server...")
    print("📋 Available TTS Engines:")
    print(f"   Edge TTS: {'✅' if EDGE_TTS_AVAILABLE else '❌'}")
    print(f"   pyttsx3: {'✅' if PYTTSX3_AVAILABLE else '❌'}")
    print(f"   gTTS: {'✅' if GTTS_AVAILABLE else '❌'}")
    print(f"   Windows SAPI: {'✅' if SAPI_AVAILABLE else '❌'}")
    print(f"   Pydub (audio processing): {'✅' if PYDUB_AVAILABLE else '❌'}")
    print("🔑 API Keys:")
    print(f"   GitHub: {'✅' if GITHUB_API_KEY else '❌'}")
    print(f"   Gemini: {'✅' if GEMINI_API_KEY else '❌'}")
    print("\n🌐 Server will start at http://localhost:8000")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)