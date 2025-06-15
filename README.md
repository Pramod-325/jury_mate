"# JuryMate: AI-Assisted Hackathon Jury Web App 🤖🏆

JuryMate is an innovative web application designed to streamline the judging process at hackathons. Leveraging the power of AI, it analyzes GitHub repositories of hackathon projects and generates concise, insightful podcast-style summaries. This helps jury members quickly grasp the essence of each project, its technical stack, and key functionalities, making their evaluation more efficient and informed.

## ✨ Features

*   **GitHub Repository Analysis**: Automatically fetches and parses project details from GitHub URLs, including descriptions, languages, stars, contributors, and README content.
*   **AI-Powered Summarization**: Utilizes the Google Gemini API to generate intelligent, conversational podcast scripts based on the extracted repository information.
*   **Text-to-Speech (TTS) Generation**: Converts the AI-generated scripts into audio, providing an audible summary of each project.
*   **Web Interface**: A user-friendly web interface for submitting repository URLs and listening to the generated project summaries.
*   **Scalable Architecture**: Built with a modular backend (Node.js and Python) to handle different processing tasks.

## 🚀 Tech Stack

JuryMate is built with a robust and modern technology stack:

*   **Frontend**: HTML, CSS (with Tailwind CSS for styling)
*   **Backend (API & GitHub API Integration)**: Node.js, Express.js, Axios
*   **Backend (AI & TTS)**: Python, FastAPI, Requests
*   **AI Model**: Google Gemini API Flash-2.5
*   **Text-to-Speech**: Multiple Python libraries (Edge TTS, pyttsx3, gTTS, SAPI) for flexible audio generation.
*   **Audio Processing**: pydub (for handling audio files)
*   **Environment Management**: `dotenv` for secure API key handling.

## 🏗️ Project Structure & Architecture

The project follows a client-server architecture with a clear separation of concerns:

*   **`frontend/`**: Contains the static web assets (HTML, CSS, JavaScript) that constitute the user interface. The `App.css` and `index.css` files indicate the use of Tailwind CSS for styling.
*   **`server.js`**: This is the main Node.js Express backend server. It handles incoming requests from the frontend, interacts with the GitHub API to fetch repository data, and likely orchestrates calls to the Python backend for AI processing.
*   **`generate_podcast.py`**: A Python FastAPI application acting as a dedicated microservice for AI-driven podcast script generation and text-to-speech conversion. It consumes GitHub project data, processes it with the Gemini API, and generates audio files.

The Node.js server and Python FastAPI service communicate to provide a comprehensive solution, with the frontend consuming APIs from the Node.js server.

## ⚙️ Installation

To set up JuryMate locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Pramod-325/jury_mate.git
    cd jury_mate
    ```

2.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add your API keys:
    ```env
    GITHUB_TOKEN=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
    GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
    ```
    *   **GitHub Token**: Generate a personal access token from your GitHub settings with `repo` scope.
    *   **Gemini API Key**: Obtain an API key from Google AI Studio.

3.  **Install Node.js Dependencies (Backend):**
    ```bash
    npm install
    ```

4.  **Install Python Dependencies (Backend):**
    It's recommended to use a virtual environment.
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: `venv\Scripts\activate`
    pip install -r requirements.txt # Assuming a requirements.txt exists or install individually:
    pip install fastapi uvicorn python-dotenv requests pydub
    # Install preferred TTS libraries (e.g., edge-tts, pyttsx3, gtts)
    pip install edge-tts
    ```

5.  **Run the Python Backend:**
    ```bash
    uvicorn generate_podcast:app --host 0.0.0.0 --port 8000
    ```

6.  **Run the Node.js Backend:**
    ```bash
    node server.js
    ```

7.  **Access the Frontend:**
    Open your web browser and navigate to `http://localhost:3000` (or whatever port your Node.js server is running on).
     ```bash
    cd ./frontend
    npm install
    npm run dev
    ```

## 💡 Usage

1.  Enter a GitHub repository URL into the input field on the web application.
2.  Submit the URL.
3.  The application will fetch project details, generate an AI-powered summary, and convert it to audio.
4.  Listen to the generated podcast to get a quick overview of the hackathon project.

Open the application from: "http://localhost:5173/"

## 🤝 Contributing

Contributions are welcome! If you'd like to improve JuryMate, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes and commit them (`git commit -m 'Add new feature'`).
4.  Push to your branch (`git push origin feature/your-feature-name`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the GPL-V3 License. See the `LICENSE` file for details.

---
Made with ❤️ by the JuryMate Team

[⭐ Pramod](https://github.com/Pramod-325)
[⭐ Vigneshwar](https://github.com/Vigneshwar4053)
[⭐ Keerthi](https://github.com/keerthiboga)
"