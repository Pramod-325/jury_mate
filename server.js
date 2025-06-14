const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const { URL } = require("url");
const atob = require("atob");
const {
  GoogleGenAI,
  Type,
  HarmBlockThreshold,
  HarmCategory,
} = require('@google/genai');


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const HEADERS = { Authorization: `token ${GITHUB_TOKEN}` };

// Constants from your original file
const IMPORTANT_DIRS = new Set(["src", "app", "component", "components", "pages", "readme"]);
const IMPORTANT_FILE_EXTENSIONS = [".py", ".js", ".ts", ".java", ".cpp", ".ipynb", ".html", ".css"];
const SKIP_KEYWORDS = new Set(["test", "mock", "logo", "docs", "doc", "readme", "config", "setup", "LICENSE", "env", "data"]);

// System prompt for Gemini AI
const SYSTEM_PROMPT = `
You are a software engineer analyzing GitHub repositories for a hackathon. Based on the provided repository project data, please provide:

1. A comprehensive analysis of the project structure and architecture
2. Technology stack assessment
3. Code quality observations
4. Project complexity evaluation
5. Suggestions for improvements or potential issues
6. Overall project summary

Be technical but accessible, and provide response stricty using the given structured schema, if readme is not provided in the projectData or else generate it based on your analysis of the repo.
`;


const ai = new GoogleGenAI({ apiKey: `${GEMINI_API_KEY}` });

// Helper functions (from your original file)
async function parseRepoUrl(repoUrl) {
  const parsed = new URL(repoUrl);
  const pathParts = parsed.pathname.replace(/^\/|\/$/g, "").split("/");
  if (pathParts.length < 2) {
    throw new Error("Invalid GitHub repository URL.");
  }
  const owner = pathParts[0];
  const repo = pathParts[1].replace(".git", "");
  return { owner, repo };
}

async function getRepoInfo(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const resp = await axios.get(url, { headers: HEADERS });
  return resp.data;
}

async function getLanguages(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/languages`;
  const resp = await axios.get(url, { headers: HEADERS });
  return Object.keys(resp.data);
}

async function getContributorsCount(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=1`;
  const resp = await axios.get(url, { headers: HEADERS });
  const linkHeader = resp.headers.link;
  if (linkHeader && linkHeader.includes('rel="last"')) {
    const lastPage = linkHeader.match(/page=(\d+)>; rel="last"/)[1];
    return parseInt(lastPage, 10);
  }
  return resp.data.length;
}

async function getCommitsCount(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`;
  const resp = await axios.get(url, { headers: HEADERS });
  const linkHeader = resp.headers.link;
  if (linkHeader && linkHeader.includes('rel="last"')) {
    const lastPage = linkHeader.match(/page=(\d+)>; rel="last"/)[1];
    return parseInt(lastPage, 10);
  }
  return resp.data.length;
}

function isImportantFile(filePath, fileName) {
  const lowerName = fileName.toLowerCase();
  if ([...SKIP_KEYWORDS].some(skip => lowerName.includes(skip))) {
    return false;
  }
  if (!IMPORTANT_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
    return false;
  }
  const parts = filePath.toLowerCase().split("/");
  if ([...IMPORTANT_DIRS].some(dir => parts.includes(dir))) {
    return true;
  }
  if (lowerName.includes("main") || lowerName.includes("app") || parts.length === 1) {
    return true;
  }
  return false;
}

async function getCodeFiles(owner, repo, path = "") {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  try {
    const resp = await axios.get(url, { headers: HEADERS });
    if (resp.status === 404) {
      return {};
    }
    const items = resp.data;

    const codeData = {};

    for (const item of items) {
      const filePath = item.path;
      const fileName = item.name;

      if (item.type === "file" && isImportantFile(filePath, fileName)) {
        try {
          const fileResp = await axios.get(item.download_url);
          // Limit file size to prevent overwhelming the API
          const content = fileResp.data.toString();
          codeData[filePath] = content.length > 5000 ? content.slice(0, 5000) + "\n... (truncated)" : content;
        } catch {
          continue;
        }
      } else if (item.type === "dir") {
        const subCodeData = await getCodeFiles(owner, repo, item.path);
        Object.assign(codeData, subCodeData);
      }
    }

    return codeData;
  } catch (error) {
    console.error(`Error fetching contents for ${path}:`, error.message);
    return {};
  }
}

async function getReadme(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
  try {
    const resp = await axios.get(url, { headers: HEADERS });
    const content = resp.data.content;
    return atob(content);
  } catch {
    return "No README found.";
  }
}



async function analyzeWithGemini(projectData){
  const response = await ai.models.generateContent({
    // model: "gemini-2.0-flash",
    model: "gemini-2.5-flash-preview-05-20",
    contents:
      `${projectData}`,
    config: {
      responseMimeType: "application/json",
      systemInstruction: `${SYSTEM_PROMPT}`,
      responseSchema: {
        type: Type.OBJECT,
        properties:{
          repo_name:{
            type: Type.STRING
          },
          owner:{
            type: Type.STRING
          },
          langs_used:{
            type: Type.ARRAY,
            items:{
              type: Type.STRING
            }
          },
          tech_stack:{
            type: Type.ARRAY,
            items:{
              type: Type.STRING
            }
          },
          readme:{
            type: Type.STRING
          },
          matched_requirements:{
            type: Type.BOOLEAN
          },
          final_remarks:{
            type: Type.STRING
          },
        }
      },
      maxOutputTokens: 5000,
      temperature: 1
    },
  });

  // console.log(response.text);
  return(response.text);
}

// Main route to analyze GitHub repository
app.get('/analyze-repo', async (req, res) => {
  try {
    const { repoUrl } = req.query;
    
    if (!repoUrl) {
      return res.status(400).json({ 
        error: 'Repository URL is required',
        message: 'Please provide a repoUrl query parameter'
      });
    }

    // Validate environment variables
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ 
        error: 'GitHub token not configured',
        message: 'GITHUB_TOKEN environment variable is required'
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured',
        message: 'GEMINI_API_KEY environment variable is required'
      });
    }

    console.log(`Analyzing repository: ${repoUrl}`);

    // Parse repository URL
    const { owner, repo } = await parseRepoUrl(repoUrl);

    // Gather all repository data
    const [repoInfo, languages, contributors, commits, readme, codeFiles] = await Promise.all([
      getRepoInfo(owner, repo),
      getLanguages(owner, repo),
      getContributorsCount(owner, repo),
      getCommitsCount(owner, repo),
      getReadme(owner, repo),
      getCodeFiles(owner, repo)
    ]);

    // Create the data model
    const projectData = {
      repository: {
        name: repoInfo.name,
        description: repoInfo.description || "No description",
        url: repoUrl,
        owner: owner,
        stars: repoInfo.stargazers_count,
        createdAt: repoInfo.created_at,
        updatedAt: repoInfo.updated_at
      },
      statistics: {
        languages: languages,
        contributorsCount: contributors,
        commitsCount: commits
      },
      documentation: {
        readme: readme.slice(0, 2000) + (readme.length > 2000 ? "\n... (truncated)" : "")
      },
      // codeFiles: codeFiles,
      analysis: {
        totalFiles: Object.keys(codeFiles).length,
        fileTypes: [...new Set(Object.keys(codeFiles).map(file => file.split('.').pop()))],
        directories: [...new Set(Object.keys(codeFiles).map(file => file.split('/')[0]))]
      }
    };
    // console.log(projectData);
    
    // Analyze with Gemini AI
    const aiAnalysis = await analyzeWithGemini(JSON.stringify(projectData));
    // console.log(aiAnalysis);
    
    // Return the final response
    res.json({
      // projectData
      success: true,
      aiAnalysis: JSON.parse(aiAnalysis),
      // timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing repository:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: {
      githubToken: !!GITHUB_TOKEN,
      geminiApiKey: !!GEMINI_API_KEY
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GitHub Repository Analyzer API',
    endpoints: {
      analyze: '/analyze-repo?repoUrl=<github-repo-url>',
      health: '/health'
    },
    example: '/analyze-repo?repoUrl=https://github.com/facebook/react'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Analyze repos at: http://localhost:${PORT}/analyze-repo?repoUrl=<github-repo-url>`);
  console.log(`💚 Health check at: http://localhost:${PORT}/health`);
});