import React, { useState, useRef, useEffect } from 'react';
import { Github, FileText, Copy, Download, CheckCircle, AlertCircle, Loader2, Code, Sparkles, Eye } from 'lucide-react';

const GitHubReadmeGenerator = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isConnected, setIsConnected] = useState(true); // Simulating connection for demo
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [stepMessage, setStepMessage] = useState('');
  const [readmeData, setReadmeData] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const readmeRef = useRef(null);

  // Simulate WebSocket connection status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.1); // 90% uptime simulation
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const isValidGithubUrl = (url) => {
    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return githubRegex.test(url);
  };

  const simulateGeneration = () => {
    const steps = [
      { step: 'fetching_repo', message: 'Analyzing repository structure...', progress: 20 },
      { step: 'analyzing_code', message: 'Understanding codebase and dependencies...', progress: 40 },
      { step: 'generating_sections', message: 'Creating README sections...', progress: 60 },
      { step: 'formatting_content', message: 'Formatting markdown content...', progress: 80 },
      { step: 'completed', message: 'README generated successfully!', progress: 100 }
    ];

    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        const currentStepData = steps[stepIndex];
        setCurrentStep(currentStepData.step);
        setStepMessage(currentStepData.message);
        setProgress(currentStepData.progress);
        
        if (currentStepData.step === 'completed') {
          // Generate mock README content
          const mockReadme = generateMockReadme();
          setReadmeData(mockReadme);
          setIsGenerating(false);
          clearInterval(stepInterval);
        }
        stepIndex++;
      }
    }, 1500);
  };

  const generateMockReadme = () => {
    const urlParts = repoUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];
    
    return {
      repo_info: {
        owner,
        repo,
        description: 'An awesome project built with modern technologies',
        stars: Math.floor(Math.random() * 1000),
        languages: ['JavaScript', 'React', 'Node.js']
      },
      readme_content: `# ${repo}

![GitHub stars](https://img.shields.io/github/stars/${owner}/${repo}?style=social)
![GitHub forks](https://img.shields.io/github/forks/${owner}/${repo}?style=social)
![GitHub issues](https://img.shields.io/github/issues/${owner}/${repo})

## 🚀 Overview

${repo} is a modern, feature-rich application built with cutting-edge technologies. This project demonstrates best practices in software development and provides a solid foundation for building scalable applications.

## ✨ Features

- 🎯 **Modern Architecture**: Built with the latest web technologies
- 🔥 **High Performance**: Optimized for speed and efficiency  
- 📱 **Responsive Design**: Works seamlessly across all devices
- 🛡️ **Type Safe**: Written with TypeScript for better code quality
- 🎨 **Beautiful UI**: Crafted with attention to detail
- ⚡ **Fast Development**: Hot reload and instant feedback

## 🛠️ Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/${owner}/${repo}.git

# Navigate to project directory
cd ${repo}

# Install dependencies
npm install

# Start development server
npm start
\`\`\`

## 📖 Usage

\`\`\`javascript
import { ${repo} } from './${repo}';

// Initialize the application
const app = new ${repo}({
  apiKey: 'your-api-key',
  environment: 'development'
});

// Start the application
app.start();
\`\`\`

## 🔧 Configuration

Create a \`.env\` file in the root directory:

\`\`\`env
API_KEY=your_api_key_here
DATABASE_URL=your_database_url
PORT=3000
\`\`\`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **${owner}** - *Initial work* - [@${owner}](https://github.com/${owner})

## 🙏 Acknowledgments

- Thanks to all contributors who helped build this project
- Special thanks to the open source community
- Built with ❤️ using modern web technologies

---

⭐ Don't forget to star this repository if you found it helpful!`
    };
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
    setReadmeData(null);
    setShowPreview(false);
    
    simulateGeneration();
  };

  const handleCopy = async () => {
    if (!readmeData) return;
    
    try {
      await navigator.clipboard.writeText(readmeData.readme_content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    if (!readmeData) return;
    
    const blob = new Blob([readmeData.readme_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepIcon = (step) => {
    if (currentStep === step) {
      return <Loader2 className="h-4 w-4 animate-spin text-green-500" />;
    } else if (currentStep === 'completed' || 
               (step === 'fetching_repo' && ['analyzing_code', 'generating_sections', 'formatting_content', 'completed'].includes(currentStep)) ||
               (step === 'analyzing_code' && ['generating_sections', 'formatting_content', 'completed'].includes(currentStep)) ||
               (step === 'generating_sections' && ['formatting_content', 'completed'].includes(currentStep)) ||
               (step === 'formatting_content' && currentStep === 'completed')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <div className="h-4 w-4 rounded-full border-2 border-gray-600"></div>;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-green-400" />
            <span className="text-xl font-bold">Jury Mate</span>
          </div>
        </div>
      </header>
      
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-6xl font-black mb-6 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              README Generator
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Generate comprehensive, professional README files for your GitHub repositories using AI
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
              {isConnected ? 'Connected to AI Service' : 'Connecting to AI Service...'}
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
                    <Sparkles className="animate-spin h-5 w-5 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 mr-2" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress Section */}
          {isGenerating && (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 mb-8 hover:border-green-500/30 transition-all duration-500 animate-fade-in">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">Generating README</span>
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
                  {getStepIcon('analyzing_code')}
                  <span className="text-white">Analyzing codebase structure</span>
                </div>
                <div className="flex items-center space-x-3">
                  {getStepIcon('generating_sections')}
                  <span className="text-white">Generating README sections</span>
                </div>
                <div className="flex items-center space-x-3">
                  {getStepIcon('formatting_content')}
                  <span className="text-white">Formatting markdown content</span>
                </div>
              </div>

              {stepMessage && (
                <div className="mt-4 p-3 bg-green-500/20 rounded-lg">
                  <p className="text-green-300 text-sm">{stepMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* README Output Section */}
          {readmeData && (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 hover:border-green-500/30 transition-all duration-500 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                    <FileText className="mr-3 h-6 w-6 text-green-400" />
                    {readmeData.repo_info.owner}/{readmeData.repo_info.repo}
                  </h2>
                  <p className="text-gray-300">{readmeData.repo_info.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <span>⭐ {readmeData.repo_info.stars}</span>
                    <span>🔤 {readmeData.repo_info.languages.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <button
                  onClick={handleCopy}
                  className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-medium rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/30 flex items-center"
                >
                  {copySuccess ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5 mr-2" />
                      Copy README
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="group relative px-6 py-3 bg-gray-800/50 border border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400 font-medium rounded-xl transform hover:scale-105 transition-all duration-300 flex items-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download
                </button>

                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="group relative px-6 py-3 bg-gray-800/50 border border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400 font-medium rounded-xl transform hover:scale-105 transition-all duration-300 flex items-center"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>

              {/* README Content with Animation */}
              <div className="bg-gray-800/50 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-700/50 border-b border-gray-600">
                  <div className="flex items-center space-x-2">
                    <Code className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">README.md</span>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                
                <div className="p-6 max-h-96 overflow-y-auto">
                  <pre 
                    ref={readmeRef}
                    className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono typing-animation"
                  >
                    {readmeData.readme_content}
                  </pre>
                </div>
              </div>

              {showPreview && (
                <div className="mt-6 bg-gray-800/50 rounded-2xl p-6 animate-fade-in">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-green-400" />
                    Markdown Preview
                  </h4>
                  <div className="prose prose-invert prose-green max-w-none">
                    <div className="text-gray-300 text-sm leading-relaxed">
                      {/* This would be the rendered markdown in a real implementation */}
                      <p className="text-gray-400 italic">
                        Preview would show the rendered markdown here...
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
        
        @keyframes typing {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .typing-animation {
          overflow: hidden;
          white-space: nowrap;
          animation: typing 3s steps(40, end);
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};

export default GitHubReadmeGenerator;