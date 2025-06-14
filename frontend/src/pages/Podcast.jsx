import { useState } from 'react';
import { Github, Mic, MicOff, Play, Pause, Volume2 } from 'lucide-react';
import Header from './Header';

const Podcast = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState('');

  const isValidGithubUrl = (url) => {
  const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
  return githubRegex.test(url);
};
  const handleAnalyze = async () => {
      setError(''); // Clear previous errors

  if (!githubUrl) {
    setError('GitHub URL cannot be empty.');
    return;
  }

  if (!isValidGithubUrl(githubUrl)) {
    setError('Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo).');
    return;
  }
    setIsAnalyzing(true);
    // Simulate analysis - replace with actual backend call
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
    }, 3000);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    // Add actual audio playback logic here
  };

  const toggleMicrophone = () => {
    setIsMicActive(!isMicActive);
    // Add actual microphone logic here
  };
return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-6xl font-black mb-6 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Podcast
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Enter your GitHub repository URL and get AI-powered audio analysis of your codebase
            </p>
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
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="px-12 w-xl h-14 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20 rounded-xl text-lg"
                  />
                  {error && (
  <p className="text-red-500 text-sm mt-2 ml-1">{error}</p>
)}
                </div>
              </div>
 <button
                onClick={handleAnalyze}
                disabled={!githubUrl || isAnalyzing}
                className="h-14 px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-bold text-lg rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
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

          {/* Audio Control Section */}
          {analysisComplete && (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 hover:border-green-500/30 transition-all duration-500 animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Volume2 className="mr-3 h-6 w-6 text-green-400" />
                Audio Analysis Ready
              </h2>
              
              {/* Audio Visualizer Mock */}
              <div className="bg-gray-800/50 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center space-x-2 h-20">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full transition-all duration-300 ${
                        isPlaying 
                          ? `animate-pulse h-${Math.floor(Math.random() * 16) + 4}` 
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
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={togglePlayback}
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
                  variant="outline"
                  className={`group relative p-4 rounded-full transform hover:scale-110 transition-all duration-300 ${
                    isMicActive 
                      ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30' 
                      : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400'
                  }`}
                >
                  {isMicActive ? (
                    <MicOff className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <Mic className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                </button>
              </div>
              {/* Status Text */}
              <div className="text-center mt-6">
                <p className="text-gray-400">
                  {isPlaying ? 'Playing audio analysis...' : 'Click play to hear the repository analysis'}
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-12 text-center animate-fade-in">
              <div className="inline-flex items-center space-x-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Analyzing Repository</h3>
                  <p className="text-gray-400">Our AI is examining your codebase and preparing audio insights...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Podcast;

