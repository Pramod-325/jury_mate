import { useState } from 'react';

const GitHubRepoAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isValidGithubUrl = (input) => {
    const regex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return regex.test(input);
  };

  const handleAnalyze = async () => {
    setError('');
    setCode('');
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
      setCode(result);
    } catch (err) {
      setError('Error fetching analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-gray-900 p-6 rounded-xl shadow-lg space-y-6">
        <h1 className="text-2xl font-bold text-green-400">GitHub Repo Analyzer</h1>
        <div>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError('');
            }}
            placeholder="https://github.com/user/repository"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold text-black disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>

        {/* {code && (
          <div className="relative bg-gray-800 rounded-lg p-4 text-sm overflow-auto">
            <pre className="whitespace-pre-wrap break-words">{code}</pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default GitHubRepoAnalyzer;