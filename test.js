const {
  GoogleGenAI,
} = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `
You are a software engineer and help students create software products.
1. A comprehensive analysis of the project structure and architecture
2. Technology stack assessment
3. Project complexity evaluation
4. Suggestions for improvements or potential issues
5. Overall project summary
`;
const ai = new GoogleGenAI({ apiKey: "GEMINI_API_KEY" });

async function analyzeWithGemini(projectData){
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents:
      `${projectData}`,
    config: {
      responseMimeType: "application/json",
      systemInstruction: `${SYSTEM_PROMPT}`,
      maxOutputTokens: 500,
      temperature: 1
    },
  });

  // console.log(response.text);
  return(response.text);
}

analyzeWithGemini("todo list").then((data)=>{
  console.log(data);
  
});
