const axios = require("axios");
const dotenv = require("dotenv");
const { URL } = require("url");
const atob = require("atob");

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const HEADERS = { Authorization: `token ${GITHUB_TOKEN}` };

const IMPORTANT_DIRS = new Set(["src", "app", "component", "components", "pages", "readme"]);
const IMPORTANT_FILE_EXTENSIONS = [".py", ".js", ".ts", ".java", ".cpp", ".ipynb", ".html", ".css"];
const SKIP_KEYWORDS = new Set(["test", "mock", "logo", "docs", "doc", "readme", "config", "setup", "LICENSE", "env", "data"]);

function parseRepoUrl(repoUrl) {
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
        codeData[filePath] = fileResp.data;
      } catch {
        continue;
      }
    } else if (item.type === "dir") {
      const subCodeData = await getCodeFiles(owner, repo, item.path);
      Object.assign(codeData, subCodeData);
    }
  }

  return codeData;
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

async function main() {
  const repoUrl = "https://github.com/Pramod-325/whatsthat.git"
  const { owner, repo } = parseRepoUrl(repoUrl);

  const repoInfo = await getRepoInfo(owner, repo);
  const languages = await getLanguages(owner, repo);
  const contributors = await getContributorsCount(owner, repo);
  const commits = await getCommitsCount(owner, repo);
  const readme = await getReadme(owner, repo);

  console.log("\n--- Project Info ---");
  console.log(`Project Name: ${repoInfo.name}`);
  console.log(`Description: ${repoInfo.description || "No description"}`);
  console.log(`Languages Used: ${languages.length ? languages.join(", ") : "Unknown"}`);
  console.log(`Number of Contributors: ${contributors}`);
  console.log(`Number of Commits: ${commits}`);
  console.log("\n--- README ---\n");
  console.log(readme.slice(0, 2000) + "\n...");

  console.log("\n--- Important Code Files ---");
  const codeFiles = await getCodeFiles(owner, repo);
  for (const [filePath, code] of Object.entries(codeFiles)) {
    console.log(`\n--- ${filePath} ---`);
    console.log(code);
  }
}


main().catch(err => console.error(err));