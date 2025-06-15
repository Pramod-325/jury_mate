import { useState ,useEffect } from 'react';
import { Github, Code, User, FileText, Star, GitFork, Clock } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Header from '../components/Header';


const GitHubRepoAnalyzer = () => {

  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [repositoryData, setRepositoryData] = useState('');
  const [info,setInfo]=useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const styledHtmlContent = htmlContent
    .replace(/<h1>/g, '<h1 class="text-3xl font-bold mb-2">') // Example for h1
    .replace(/<strong>/g, '<strong class="font-bold">')   // Example for strong
    .replace(/<em>/g, '<em class="italic">')    
      .replace(/^# (.*$)/gim, '<h1 class="text-sm text-blue-600 font-bold mb-3">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-2 text-white">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-1 text-white">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 class="text-md font-bold mb-1 text-white">$1</h4>')
      .replace(/^##### (.*$)/gim, '<h5 class="text-base font-bold mb-1 text-white">$1</h5>')
      .replace(/^###### (.*$)/gim, '<h6 class="text-sm font-bold mb-1 text-white">$1</h6>')
      
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 rounded-lg overflow-x-auto mb-3"><code class="text-green-400 text-sm">$2</code></pre>')
      
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-2 py-1 rounded text-green-400 text-sm">$1</code>')
      
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="font-bold text-white">$1</strong>')
      
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic text-blue-600">$1</em>')
      .replace(/_(.*?)_/g, '<em class="italic text-blue-600">$1</em>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-green-400 hover:text-green-300 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg mb-4" />')
      
      // Unordered lists
      .replace(/^\- (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>')
      .replace(/^\* (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>')
      
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>')
      
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-green-500 pl-4 italic text-gray-400 mb-4">$1</blockquote>')
      
      // Horizontal rule
      .replace(/^---$/gim, '<hr class="border-gray-700 my-4" />')
      
      // Line breaks
      .replace(/\n/g, '<br />');
    useEffect(() => {
    if (repositoryData) {
      // Configure marked for options like GFM (GitHub Flavored Markdown)
      marked.setOptions({
        gfm: true, // Enable GitHub Flavored Markdown tables, strikethrough, etc.
        breaks: true, // Enable GFM line breaks (single newline creates <br>)
        // You can add more options here: https://marked.js.org/using_advanced#options
      });

      // Convert Markdown to HTML using marked
      const rawHtml = marked.parse(repositoryData.readme);
      console.log(rawHtml);
      // Sanitize the HTML to prevent XSS attacks
      // This is crucial if markdownText comes from an untrusted source (e.g., user input)
    //   const cleanHtml = DOMPurify.sanitize(rawHtml);

      setHtmlContent(rawHtml);
    } else {
      setHtmlContent(''); // Clear content if markdownText is empty
    }
  }, [repositoryData]);

  const isValidGithubUrl = (input) => {
    const regex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return regex.test(input);
  };

  const handleAnalyze = async () => {
    setError('');
    setUrl('');
    setCopied(false);

    if (!isValidGithubUrl(url)) {
      setError('Invalid GitHub URL. Example: https://github.com/user/repo');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/analyze-repo?repoUrl=${url}`);
      console.log(response);
      const result = await response.json(); // or .json() if backend returns JSON
      console.log(result);
      console.log(result.aiAnalysis);
      setInfo(result.repository);
      setRepositoryData(result.aiAnalysis);
    } catch (err) {
      setError('Error fetching analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(repositoryData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Code Analyzer
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Analyze any GitHub repository and get detailed insights about the codebase
            </p>
          </div>

          {/* Input Section */}
          <div className="mb-8">
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 hover:border-green-500/30 transition-all duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label htmlFor="github-url" className="block text-sm font-medium text-gray-300 mb-3">
                    GitHub Repository URL
                  </label>
                  <div className="relative">
                    <Github className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="github-url"
                      type="url"
                      placeholder="https://github.com/username/repository"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-12 w-xl h-14 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20 rounded-xl text-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={!url || loading}
                  className="h-14 px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-bold text-lg rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <div className='flex items-center'> 
                      <Code className="mr-2 h-5 w-5" />
                      Analyze
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400">
              {error}
            </div>
          )}

          {/* Repository Data Display */}
          {repositoryData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Left Side - Repository Overview */}
              <div className="space-y-6">
                <div className="bg-gray-900/40 backdrop-blur-xl border-gray-800/50 hover:border-green-500/30 transition-all duration-500 p-8">
                  <div>
                    <div className="flex items-center text-green-400 mb-4">
                      <Github className="mr-3 h-6 w-6" />
                      Repository Overview
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300">Owner:</span>
                      <span className="text-white font-semibold">{info.owner}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Code className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300">Repository:</span>
                      <span className="text-white font-semibold">{info.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                         <Star className="h-4 w-4 text-yellow-400" />
                         <span className="text-gray-300">{info.stars}</span>
                  </div>
                    <div className="flex items-center space-x-2">
                         <p className="text-yellow-400">Commits</p>
                         <span className="text-gray-300">{info.commitsCount}</span>
                  </div>
                    {/* // <div className="flex items-center space-x-6">
                    //   
                    //   <div className="flex items-center space-x-2">
                    //     <GitFork className="h-4 w-4 text-gray-400" />
                    //     <span className="text-gray-300">{repositoryData.forks}</span>
                    //   </div>
                    //   <div className="flex items-center space-x-2">
                    //     <Clock className="h-4 w-4 text-gray-400" />
                    //     <span className="text-gray-300">{repositoryData.lastUpdated}</span>
                    //   </div>
                    // </div> */}
                    <p className="text-gray-400 leading-relaxed">{info.description}</p>
                  </div>
                </div>

                <div className="p-6 bg-gray-900/40 backdrop-blur-xl border-gray-800/50 hover:border-green-500/30 transition-all duration-500">
                  <div>
                    <div className="flex items-center text-green-400 mb-6">
                      <Code className="mr-3 h-6 w-6" />
                      Tech Stack
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {repositoryData.tech_stack.map((tech, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-medium hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-start items-center gap-6">
                        <span className="text-gray-200 text-lg">Primary Language:</span>
                        <div className="flex flex-wrap gap-2">
                      {repositoryData.langs_used.map((lang, index) => (
                        <span
                          key={index}
                          className=" text-gray-300 text-sm font-medium hover:text-green-500/30 transition-all duration-300"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                      </div>
                    {/* //   <div className="flex justify-between">
                    //     <span className="text-gray-300">License:</span>
                    //     <span className="text-white font-semibold">{repositoryData.license}</span>
                    //   </div> */}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - README  */}
              <div>
                <div className="bg-gray-900/40 backdrop-blur-xl border-gray-800/50 hover:border-green-500/30 transition-all duration-500 h-full p-6">
                  <div>
                    <div className="flex items-center text-green-400">
                      <FileText className="mr-3 mb-4 h-6 w-6" />
                      README
                    </div>
                    </div>
                    
                    <div className="prose prose-invert prose-green max-w-none">
                        <div 
                        className="text-gray-300 leading-relaxed max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{ 
                            __html: styledHtmlContent 
                        }}
                        />
                    </div>
                    
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GitHubRepoAnalyzer;


