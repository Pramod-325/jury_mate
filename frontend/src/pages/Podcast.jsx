import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import { Play, Pause, Github, Volume2, Loader2, AlertCircle, CheckCircle, Download, Mic, MicOff } from 'lucide-react';


const GitHubPodcastGenerator = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [stepMessage, setStepMessage] = useState('');
  const [podcastData, setPodcastData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  
  const wsRef = useRef(null);
  const audioRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      
      ws.onopen = () => {
        setIsConnected(true);
        setError('');
        console.log('🔗 Connected to WebSocket');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Received:', data);
        
        switch (data.type) {
          case 'progress':
            setCurrentStep(data.step);
            setStepMessage(data.message);
            if (data.step === 'fetching_repo') setProgress(25);
            else if (data.step === 'generating_script') setProgress(50);
            else if (data.step === 'generating_audio') setProgress(75);
            break;
            
          case 'podcast_ready':
            setPodcastData(data);
            setIsGenerating(false);
            setProgress(100);
            setCurrentStep('completed');
            setStepMessage('Podcast ready to play!');
            break;
            
          case 'error':
            setError(data.message);
            setIsGenerating(false);
            setProgress(0);
            setCurrentStep('');
            break;
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        console.log('🔌 WebSocket disconnected');
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Connection error. Please check if the server is running.');
      };
      
      wsRef.current = ws;
    };

    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const isValidGithubUrl = (url) => {
    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return githubRegex.test(url);
  };

  const handleGenerate = () => {
    setError('');
    
    if (!repoUrl.trim()) {
      setError('GitHub URL cannot be empty.');
      return;
    }
    
    if (!isValidGithubUrl(repoUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo).');
      return;
    }
    
    if (!isConnected) {
      setError('Not connected to server. Please wait...');
      return;
    }
    
    setIsGenerating(true);
    setProgress(0);
    setPodcastData(null);
    
    wsRef.current.send(JSON.stringify({
      type: 'generate_podcast',
      repo_url: repoUrl
    }));
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMicrophone = () => {
    setIsMicActive(!isMicActive);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const getStepIcon = (step) => {
    if (currentStep === step) {
      return <Loader2 className="h-4 w-4 animate-spin text-green-500" />;
    } else if (currentStep === 'completed' || 
               (step === 'fetching_repo' && ['generating_script', 'generating_audio', 'completed'].includes(currentStep)) ||
               (step === 'generating_script' && ['generating_audio', 'completed'].includes(currentStep)) ||
               (step === 'generating_audio' && currentStep === 'completed')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <div className="h-4 w-4 rounded-full border-2 border-gray-600"></div>;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-6xl font-black mb-6 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Podcast Generator
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Transform any GitHub repository into an engaging AI-powered podcast discussion
            </p>
          </div>

          {/* Connection Status */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              {isConnected ? 'Connected to Server' : 'Connecting to Server...'}
            </div>
          </div>

          {/* Input Section */}
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 mb-8 hover:border-green-500/30 transition-all duration-500">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <label htmlFor="github-url" className="block text-lg font-medium text-gray-200 mb-3">
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <Github className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="github-url"
                    type="url"
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full px-12 h-14 bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20 rounded-xl text-lg focus:outline-none focus:ring-2"
                    disabled={isGenerating}
                  />
                  {error && (
                    <p className="text-red-500 text-sm mt-2 ml-1 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {error}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!repoUrl || isGenerating || !isConnected}
                className="h-14 px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-bold text-lg rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </button>
            </div>
          </div>

          {/* Progress Section */}
          {isGenerating && (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 mb-8 hover:border-green-500/30 transition-all duration-500 animate-fade-in">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">Generating Podcast</span>
                  <span className="text-green-400 font-medium">{progress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  {getStepIcon('fetching_repo')}
                  <span className="text-white">Fetching repository information</span>
                </div>
                <div className="flex items-center space-x-3">
                  {getStepIcon('generating_script')}
                  <span className="text-white">Generating podcast script with AI</span>
                </div>
                <div className="flex items-center space-x-3">
                  {getStepIcon('generating_audio')}
                  <span className="text-white">Converting script to audio</span>
                </div>
              </div>

              {stepMessage && (
                <div className="mt-4 p-3 bg-green-500/20 rounded-lg">
                  <p className="text-green-300 text-sm">{stepMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Audio Control Section */}
          {podcastData && (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 hover:border-green-500/30 transition-all duration-500 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                    <Volume2 className="mr-3 h-6 w-6 text-green-400" />
                    {podcastData.repo_info.owner}/{podcastData.repo_info.repo}
                  </h2>
                  <p className="text-gray-300">{podcastData.repo_info.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <span>⭐ {podcastData.repo_info.stars}</span>
                    <span>🔤 {podcastData.repo_info.languages.join(', ')}</span>
                  </div>
                </div>
              </div>
              
              {/* Audio Visualizer */}
              <div className="bg-gray-800/50 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center space-x-2 h-20">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full transition-all duration-300 ${
                        isPlaying 
                          ? 'animate-pulse' 
                          : 'h-4'
                      }`}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        height: isPlaying ? `${Math.random() * 60 + 20}px` : '16px'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center space-x-6 mb-6">
                <button
                  onClick={handlePlayPause}
                  className="group relative p-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black rounded-full transform hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-green-500/30"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <Play className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                </button>

                <button
                  onClick={toggleMicrophone}
                  className={`group relative p-4 rounded-full transform hover:scale-110 transition-all duration-300 ${
                    isMicActive 
                      ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30' 
                      : 'bg-gray-800/50 border border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400'
                  }`}
                >
                  {isMicActive ? (
                    <MicOff className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <Mic className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                </button>

                <a
                  href={`http://localhost:8000${podcastData.audio_url}`}
                  download={`${podcastData.repo_info.owner}-${podcastData.repo_info.repo}-podcast.mp3`}
                  className="group relative p-4 bg-gray-800/50 border border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400 rounded-full transform hover:scale-110 transition-all duration-300"
                >
                  <Download className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                </a>
              </div>
              
              <audio
                ref={audioRef}
                src={`http://localhost:8000${podcastData.audio_url}`}
                onEnded={handleAudioEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Status Text */}
              <div className="text-center mb-6">
                <p className="text-gray-400">
                  {isPlaying ? 'Playing audio analysis...' : 'Click play to hear the repository analysis'}
                </p>
              </div>

              {/* Script Preview */}
              <div className="bg-gray-800/50 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Podcast Script Preview</h4>
                <div className="max-h-64 overflow-y-auto text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {podcastData.script.substring(0, 1000)}...
                </div>
              </div>
            </div>
          )}
        </div>
      </main>


      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default GitHubPodcastGenerator;