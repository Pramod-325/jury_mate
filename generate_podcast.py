import sys
import requests
import os
from dotenv import load_dotenv
import re

# For text-to-speech - choose one of these options:
# Option 1: Using pyttsx3 (offline, free)
try:
    import pyttsx3
    TTS_ENGINE = "pyttsx3"
except ImportError:
    TTS_ENGINE = None

# Option 2: Using gTTS (Google Text-to-Speech, requires internet)
try:
    from gtts import gTTS
    TTS_ENGINE = "gtts" if TTS_ENGINE is None else TTS_ENGINE
except ImportError:
    pass

# Option 3: Using Windows SAPI (Windows only)
try:
    import win32com.client
    SAPI_AVAILABLE = True
except ImportError:
    SAPI_AVAILABLE = False

# Option 4: Using edge-tts (Microsoft Edge TTS, free)
try:
    import edge_tts
    import asyncio
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False

# Option 3: Using OpenAI TTS (requires OpenAI API key)
# Uncomment if you want to use OpenAI's TTS
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

load_dotenv()

GITHUB_API_KEY = os.getenv("GITHUB_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

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
            # If no speaker prefix, assume it continues from previous speaker
            if speakers and speakers[-1][1]:
                speakers[-1] = (speakers[-1][0], speakers[-1][1] + ' ' + line)
    
    return speakers

def generate_audio_pyttsx3_dual_voice(script_text, filename="podcast.wav"):
    """Generate audio using pyttsx3 with different voices for host and guest"""
    print("🔊 Generating audio with pyttsx3 (dual voice)...")
    
    try:
        engine = pyttsx3.init()
        
        # Get available voices
        voices = engine.getProperty('voices')
        print(f"📢 Available voices: {len(voices)}")
        
        # List available voices
        for i, voice in enumerate(voices):
            print(f"  Voice {i}: {voice.name} ({voice.languages})")
        
        # Set voice properties
        rate = engine.getProperty('rate')
        engine.setProperty('rate', rate - 30)  # Slower for clarity
        
        # Parse script into host and guest parts
        speakers = parse_script_speakers(script_text)
        
        if not speakers:
            print("⚠️ No speakers found, using single voice")
            return generate_audio_pyttsx3(script_text, filename)
        
        # Create temporary audio files for each speaker
        temp_files = []
        
        for i, (speaker, text) in enumerate(speakers):
            if not text.strip():
                continue
                
            # Select voice based on speaker
            if speaker == 'host' and len(voices) > 0:
                engine.setProperty('voice', voices[0].id)  # First voice for host
            elif speaker == 'guest' and len(voices) > 1:
                engine.setProperty('voice', voices[1].id)  # Second voice for guest
            elif len(voices) > 0:
                engine.setProperty('voice', voices[0].id)  # Fallback
            
            # Clean text
            clean_text = re.sub(r'\*\*.*?\*\*', '', text)
            clean_text = re.sub(r'#{1,6}\s', '', clean_text)
            clean_text = clean_text.strip()
            
            if clean_text:
                temp_filename = f"temp_{speaker}_{i}.wav"
                engine.save_to_file(clean_text, temp_filename)
                engine.runAndWait()
                
                if os.path.exists(temp_filename) and os.path.getsize(temp_filename) > 0:
                    temp_files.append(temp_filename)
                    print(f"📦 Created {speaker} segment {i}")
        
        # Combine audio files
        if temp_files:
            combine_audio_files(temp_files, filename)
            
            # Clean up temporary files
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
        
        # Check final file
        if os.path.exists(filename):
            file_size = os.path.getsize(filename)
            print(f"✅ Dual voice audio saved to {filename} (Size: {file_size} bytes)")
        else:
            print("❌ Dual voice audio file was not created!")
            
    except Exception as e:
        print(f"❌ Error generating dual voice audio: {e}")
        print("🔄 Falling back to single voice...")
        return generate_audio_pyttsx3(script_text, filename)

def generate_audio_edge_tts(script_text, filename="podcast.mp3"):
    """Generate audio using Microsoft Edge TTS with different voices"""
    print("🔊 Generating audio with Edge TTS (dual voice)...")
    
    try:
        import edge_tts
        import asyncio
        
        # Parse script into host and guest parts
        speakers = parse_script_speakers(script_text)
        
        if not speakers:
            print("⚠️ No speakers found")
            return
        
        async def create_audio():
            temp_files = []
            
            # Define voices for host and guest
            host_voice = "en-US-JennyNeural"  # Female voice
            guest_voice = "en-US-GuyNeural"   # Male voice
            
            for i, (speaker, text) in enumerate(speakers):
                if not text.strip():
                    continue
                
                # Clean text
                clean_text = re.sub(r'\*\*.*?\*\*', '', text)
                clean_text = re.sub(r'#{1,6}\s', '', clean_text)
                clean_text = clean_text.strip()
                
                if clean_text:
                    voice = host_voice if speaker == 'host' else guest_voice
                    temp_filename = f"temp_{speaker}_{i}.mp3"
                    
                    # Generate speech
                    communicate = edge_tts.Communicate(clean_text, voice)
                    await communicate.save(temp_filename)
                    
                    if os.path.exists(temp_filename) and os.path.getsize(temp_filename) > 0:
                        temp_files.append(temp_filename)
                        print(f"📦 Created {speaker} segment {i} with {voice}")
            
            # Combine audio files
            if temp_files:
                combine_audio_files(temp_files, filename)
                
                # Clean up temporary files
                for temp_file in temp_files:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
        
        # Run async function
        asyncio.run(create_audio())
        
        # Check final file
        if os.path.exists(filename):
            file_size = os.path.getsize(filename)
            print(f"✅ Edge TTS dual voice audio saved to {filename} (Size: {file_size} bytes)")
        else:
            print("❌ Edge TTS audio file was not created!")
            
    except Exception as e:
        print(f"❌ Error generating Edge TTS audio: {e}")
        raise

def generate_audio_sapi(script_text, filename="podcast.wav"):
    """Generate audio using Windows SAPI with different voices"""
    print("🔊 Generating audio with Windows SAPI (dual voice)...")
    
    try:
        import win32com.client
        
        # Initialize SAPI
        sapi = win32com.client.Dispatch("SAPI.SpVoice")
        
        # Get available voices
        voices = sapi.GetVoices()
        print(f"📢 Available SAPI voices: {voices.Count}")
        
        # Parse script into host and guest parts
        speakers = parse_script_speakers(script_text)
        
        if not speakers:
            print("⚠️ No speakers found")
            return
        
        temp_files = []
        
        for i, (speaker, text) in enumerate(speakers):
            if not text.strip():
                continue
            
            # Select voice (0 for host, 1 for guest if available)
            voice_index = 0 if speaker == 'host' else min(1, voices.Count - 1)
            sapi.Voice = voices.Item(voice_index)
            
            # Clean text
            clean_text = re.sub(r'\*\*.*?\*\*', '', text)
            clean_text = re.sub(r'#{1,6}\s', '', clean_text)
            clean_text = clean_text.strip()
            
            if clean_text:
                temp_filename = f"temp_{speaker}_{i}.wav"
                
                # Save to file
                file_stream = win32com.client.Dispatch("SAPI.SpFileStream")
                file_stream.Open(temp_filename, 3)  # 3 = write mode
                sapi.AudioOutputStream = file_stream
                sapi.Speak(clean_text)
                file_stream.Close()
                
                if os.path.exists(temp_filename) and os.path.getsize(temp_filename) > 0:
                    temp_files.append(temp_filename)
                    print(f"📦 Created {speaker} segment {i}")
        
        # Combine audio files
        if temp_files:
            combine_audio_files(temp_files, filename)
            
            # Clean up temporary files
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
        
        # Check final file
        if os.path.exists(filename):
            file_size = os.path.getsize(filename)
            print(f"✅ SAPI dual voice audio saved to {filename} (Size: {file_size} bytes)")
        else:
            print("❌ SAPI audio file was not created!")
            
    except Exception as e:
        print(f"❌ Error generating SAPI audio: {e}")
        raise

def combine_audio_files(file_list, output_filename):
    """Combine multiple audio files into one"""
    print(f"🔗 Combining {len(file_list)} audio segments...")
    
    try:
        import subprocess
        
        # Create a list file for ffmpeg
        with open("filelist.txt", "w") as f:
            for audio_file in file_list:
                f.write(f"file '{audio_file}'\n")
        
        # Try to combine with ffmpeg
        result = subprocess.run([
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0', 
            '-i', 'filelist.txt', '-c', 'copy', output_filename
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Combined audio segments with ffmpeg")
        else:
            print("⚠️ ffmpeg failed, trying alternative method...")
            raise subprocess.CalledProcessError(result.returncode, 'ffmpeg')
            
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback: simple concatenation for WAV files
        print("🔄 Using simple audio concatenation...")
        try:
            import wave
            
            # Combine WAV files
            if output_filename.endswith('.wav'):
                with wave.open(output_filename, 'wb') as output_wav:
                    for i, audio_file in enumerate(file_list):
                        if audio_file.endswith('.wav'):
                            with wave.open(audio_file, 'rb') as input_wav:
                                if i == 0:
                                    # Set parameters from first file
                                    output_wav.setparams(input_wav.getparams())
                                # Copy audio data
                                output_wav.writeframes(input_wav.readframes(input_wav.getnframes()))
                print("✅ Combined WAV files using wave library")
            else:
                # For non-WAV files, just use the first file
                print("⚠️ Using first audio segment only")
                if file_list:
                    os.rename(file_list[0], output_filename)
                    
        except Exception as e:
            print(f"⚠️ Audio combination failed: {e}")
            # Use first file as fallback
            if file_list and os.path.exists(file_list[0]):
                os.rename(file_list[0], output_filename)
                print("📁 Using first audio segment as output")
    
    finally:
        # Clean up list file
        if os.path.exists("filelist.txt"):
            os.remove("filelist.txt")

def generate_audio_gtts(script_text, filename="podcast.mp3"):
    """Generate audio using Google Text-to-Speech"""
    print("🔊 Generating audio with Google TTS...")
    
    try:
        # Clean up the script text
        clean_text = re.sub(r'Host:|Guest:', '', script_text)
        clean_text = re.sub(r'\*\*.*?\*\*', '', clean_text)  # Remove bold text
        clean_text = re.sub(r'#{1,6}\s', '', clean_text)  # Remove markdown headers
        clean_text = re.sub(r'\n+', '. ', clean_text)  # Replace newlines with periods
        clean_text = clean_text.strip()
        
        print(f"📝 Text length: {len(clean_text)} characters")
        print(f"📄 First 100 chars: {clean_text[:100]}...")
        
        if not clean_text:
            raise Exception("No text to convert to speech")
        
        # Split text if it's too long (gTTS has limits)
        max_length = 5000
        if len(clean_text) > max_length:
            print(f"📏 Text is long ({len(clean_text)} chars), splitting into chunks...")
            chunks = [clean_text[i:i+max_length] for i in range(0, len(clean_text), max_length)]
            
            # Create temporary files for each chunk
            temp_files = []
            for i, chunk in enumerate(chunks):
                temp_filename = f"temp_chunk_{i}.mp3"
                tts = gTTS(text=chunk, lang='en', slow=False)
                tts.save(temp_filename)
                temp_files.append(temp_filename)
                print(f"📦 Created chunk {i+1}/{len(chunks)}")
            
            # Combine chunks (simple concatenation for now)
            print("🔗 Combining audio chunks...")
            import subprocess
            
            # Create a list file for ffmpeg
            with open("filelist.txt", "w") as f:
                for temp_file in temp_files:
                    f.write(f"file '{temp_file}'\n")
            
            # Try to combine with ffmpeg if available
            try:
                subprocess.run(['ffmpeg', '-f', 'concat', '-safe', '0', '-i', 'filelist.txt', '-c', 'copy', filename], 
                             check=True, capture_output=True)
                print("✅ Combined chunks with ffmpeg")
            except (subprocess.CalledProcessError, FileNotFoundError):
                print("⚠️ ffmpeg not found, using first chunk only")
                os.rename(temp_files[0], filename)
            
            # Clean up temporary files
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            if os.path.exists("filelist.txt"):
                os.remove("filelist.txt")
        else:
            # Generate TTS for the whole text
            tts = gTTS(text=clean_text, lang='en', slow=False)
            tts.save(filename)
        
        # Check if file was created and has content
        if os.path.exists(filename):
            file_size = os.path.getsize(filename)
            print(f"✅ Audio saved to {filename} (Size: {file_size} bytes)")
            if file_size == 0:
                print("⚠️ Warning: Audio file is empty!")
        else:
            print("❌ Audio file was not created!")
            
    except Exception as e:
        print(f"❌ Error generating audio with gTTS: {e}")
        raise

def generate_audio_openai(script_text, filename="podcast.mp3"):
    """Generate audio using OpenAI TTS API (requires OpenAI API key)"""
    print("🔊 Generating audio with OpenAI TTS...")
    
    # This requires OpenAI API key
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise Exception("OpenAI API key not found. Please set OPENAI_API_KEY environment variable.")
    
    # Clean up the script text
    clean_text = re.sub(r'Host:|Guest:', '', script_text)
    clean_text = re.sub(r'\*\*.*?\*\*', '', clean_text)
    clean_text = re.sub(r'\n+', '. ', clean_text)
    clean_text = clean_text.strip()
    
    # Call OpenAI TTS API
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "tts-1",
        "input": clean_text,
        "voice": "alloy"
    }
    
    response = requests.post("https://api.openai.com/v1/audio/speech", 
                           headers=headers, json=data)
    
    if response.ok:
        with open(filename, "wb") as f:
            f.write(response.content)
        print(f"✅ Audio saved to {filename}")
    else:
        raise Exception(f"OpenAI TTS API error: {response.text}")

def save_audio(script_text, filename_prefix="podcast"):
    """Save script as audio file using available TTS engine with dual voices"""
    
    print(f"🎬 Script preview (first 200 chars):")
    print(f"'{script_text[:200]}...'")
    print(f"📊 Total script length: {len(script_text)} characters")
    
    if not script_text.strip():
        print("❌ Error: Script text is empty!")
        return
    
    # Save script as text backup
    with open(f"{filename_prefix}_script.txt", "w", encoding="utf-8") as f:
        f.write(script_text)
    print(f"💾 Script backup saved to {filename_prefix}_script.txt")
    
    # Try different TTS engines in order of preference
    success = False
    
    # Option 1: Edge TTS (best quality, dual voice)
    if EDGE_TTS_AVAILABLE and not success:
        try:
            print("🎭 Trying Edge TTS with dual voices...")
            generate_audio_edge_tts(script_text, f"{filename_prefix}.mp3")
            success = True
        except Exception as e:
            print(f"❌ Edge TTS failed: {e}")
    
    # Option 2: Windows SAPI (Windows only, dual voice)
    if SAPI_AVAILABLE and not success:
        try:
            print("🎭 Trying Windows SAPI with dual voices...")
            generate_audio_sapi(script_text, f"{filename_prefix}.wav")
            success = True
        except Exception as e:
            print(f"❌ Windows SAPI failed: {e}")
    
    # Option 3: pyttsx3 with dual voices
    if TTS_ENGINE == "pyttsx3" and not success:
        try:
            print("🎭 Trying pyttsx3 with dual voices...")
            generate_audio_pyttsx3_dual_voice(script_text, f"{filename_prefix}.wav")
            success = True
        except Exception as e:
            print(f"❌ pyttsx3 dual voice failed: {e}")
            # Fallback to single voice
            try:
                print("🔄 Trying pyttsx3 single voice...")
                generate_audio_pyttsx3_single(script_text, f"{filename_prefix}.wav")
                success = True
            except Exception as e2:
                print(f"❌ pyttsx3 single voice also failed: {e2}")
    
    # Option 4: gTTS (single voice only)
    if TTS_ENGINE == "gtts" and not success:
        try:
            print("🎭 Trying Google TTS (single voice)...")
            generate_audio_gtts(script_text, f"{filename_prefix}.mp3")
            success = True
        except Exception as e:
            print(f"❌ gTTS failed: {e}")
    
    if not success:
        print("❌ No TTS engine worked. Please install one of:")
        print("   pip install edge-tts  # For Microsoft Edge TTS (recommended)")
        print("   pip install pyttsx3  # For offline TTS")
        print("   pip install gtts  # For Google TTS")
        print("   On Windows: pywin32 for SAPI support")
        print(f"✅ Script saved as text to {filename_prefix}_script.txt")

def generate_audio_pyttsx3_single(script_text, filename="podcast.wav"):
    """Generate audio using pyttsx3 (single voice fallback)"""
    print("🔊 Generating audio with pyttsx3 (single voice)...")
    
    try:
        engine = pyttsx3.init()
        
        # Set voice properties
        voices = engine.getProperty('voices')
        print(f"📢 Available voices: {len(voices)}")
        
        # Set slower rate for better clarity
        rate = engine.getProperty('rate')
        engine.setProperty('rate', rate - 50)
        
        # Clean the script text
        clean_text = re.sub(r'Host:|Guest:', '', script_text)
        clean_text = re.sub(r'\*\*.*?\*\*', '', clean_text)  # Remove bold text
        clean_text = re.sub(r'#{1,6}\s', '', clean_text)  # Remove markdown headers
        clean_text = re.sub(r'\n+', '. ', clean_text)  # Replace newlines with periods
        clean_text = clean_text.strip()
        
        print(f"📝 Text length: {len(clean_text)} characters")
        print(f"📄 First 100 chars: {clean_text[:100]}...")
        
        if not clean_text:
            raise Exception("No text to convert to speech")
        
        # Save to file
        engine.save_to_file(clean_text, filename)
        engine.runAndWait()
        
        # Check if file was created and has content
        if os.path.exists(filename):
            file_size = os.path.getsize(filename)
            print(f"✅ Audio saved to {filename} (Size: {file_size} bytes)")
            if file_size == 0:
                print("⚠️ Warning: Audio file is empty!")
        else:
            print("❌ Audio file was not created!")
            
    except Exception as e:
        print(f"❌ Error generating audio with pyttsx3: {e}")
        raise

def test_tts():
    """Test TTS functionality with simple text and dual voices"""
    test_script = """Host: Hello everyone, welcome to our podcast. Today we're testing our dual voice system.

Guest: Hi there! Thanks for having me on the show. This is really exciting to test different voices.

Host: Absolutely! This should demonstrate how we can have different voices for different speakers in our podcast.

Guest: That's right. The host voice should sound different from the guest voice if everything is working properly."""
    
    print("🧪 Testing TTS functionality with dual voices...")
    print("📝 Test script:")
    print(test_script)
    print("\n" + "="*50 + "\n")
    
    # Test Edge TTS first (best quality)
    if EDGE_TTS_AVAILABLE:
        try:
            print("🎭 Testing Edge TTS (dual voice)...")
            generate_audio_edge_tts(test_script, "test_edge_tts.mp3")
        except Exception as e:
            print(f"❌ Edge TTS test failed: {e}")
    
    # Test Windows SAPI
    if SAPI_AVAILABLE:
        try:
            print("🎭 Testing Windows SAPI (dual voice)...")
            generate_audio_sapi(test_script, "test_sapi.wav")
        except Exception as e:
            print(f"❌ SAPI test failed: {e}")
    
    # Test pyttsx3 dual voice
    if TTS_ENGINE == "pyttsx3":
        try:
            print("🎭 Testing pyttsx3 (dual voice)...")
            generate_audio_pyttsx3_dual_voice(test_script, "test_pyttsx3_dual.wav")
        except Exception as e:
            print(f"❌ pyttsx3 dual voice test failed: {e}")
            try:
                print("🔄 Testing pyttsx3 (single voice)...")
                generate_audio_pyttsx3_single(test_script, "test_pyttsx3_single.wav")
            except Exception as e2:
                print(f"❌ pyttsx3 single voice test also failed: {e2}")
                
    # Test gTTS (single voice only)
    elif TTS_ENGINE == "gtts":
        try:
            print("🎭 Testing gTTS (single voice)...")
            generate_audio_gtts(test_script, "test_gtts.mp3")
        except Exception as e:
            print(f"❌ gTTS test failed: {e}")
    
    print("\n" + "="*50)
    print("🎧 Check the generated test files:")
    test_files = ["test_edge_tts.mp3", "test_sapi.wav", "test_pyttsx3_dual.wav", "test_pyttsx3_single.wav", "test_gtts.mp3"]
    for test_file in test_files:
        if os.path.exists(test_file):
            size = os.path.getsize(test_file)
            print(f"  ✅ {test_file} ({size} bytes)")
        else:
            print(f"  ❌ {test_file} (not created)")
    
    print("\n💡 Recommended installation for best dual voice experience:")
    print("   pip install edge-tts")
    print("   (or on Windows: pip install pywin32)")

def main():
    if len(sys.argv) == 2 and sys.argv[1] == "--test":
        test_tts()
        return
        
    if len(sys.argv) != 2:
        print("Usage: python generate_podcast.py <GitHub_Repo_URL>")
        print("       python generate_podcast.py --test  # Test TTS functionality")
        return

    repo_url = sys.argv[1]
    owner, repo = parse_github_url(repo_url)
    print(f"📥 Fetching repo: {owner}/{repo} ...")
    info = fetch_repo_info(owner, repo)
    print("🎙 Generating podcast script with Gemini AI...")
    prompt = generate_prompt(info)
    podcast_text = call_gemini(prompt)
    
    # Save as audio
    filename_prefix = f"podcast_{owner}_{repo}"
    save_audio(podcast_text, filename_prefix)

if __name__ == "__main__":
    main()