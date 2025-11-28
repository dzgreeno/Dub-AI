# Dub-AI: Autonomous AI Video Dubbing Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini-blue)](https://deepmind.google/technologies/gemini/)
[![Demo](https://img.shields.io/badge/Demo-Live%20App-success)](https://dub-ai-beta.vercel.app/)

**Dub-AI** is an advanced, autonomous AI agent designed to seamlessly dub videos into other languages. It extracts audio, transcribes and translates dialogue, generates synchronized voiceovers, and reintegrates them into the original video with professional-grade audio mixing—all running entirely in the browser.

## 🚀 Key Features

*   **Autonomous Workflow**: Handles the entire pipeline from video upload to final dubbed output without manual intervention.
*   **Smart Script Adaptation**: Uses **Gemini 2.5 Flash** to analyze video context and generate translated scripts that match the original timing (isochrony) and lip movements.
*   **AI Voice Generation**: Leverages **Gemini 2.5 Flash TTS** to generate expressive, character-matched voiceovers (e.g., assigning deep voices to male characters, soft voices to female characters).
*   **Vocal Suppression (DSP)**: Features a built-in Digital Signal Processing (DSP) engine to remove original vocals while preserving background music and sound effects (Karaoke mode).
*   **Dynamic Audio Mixing**:
    *   **Auto-Ducking**: Automatically lowers background volume when the dubbed voice speaks.
    *   **Spatial Reverb**: Adds environmental ambience to make the new voices sound natural.
    *   **Compression**: Professional audio compression for a polished final mix.
*   **Gemini Free Tier Support**: Optimized to work with the free tier of the Gemini API, making it accessible to everyone.
*   **Privacy First**: All audio processing happens locally in your browser using the Web Audio API.

## 🛠️ Tech Stack

*   **Frontend**: React 19, Vite, TypeScript
*   **AI Core**: Google GenAI SDK (`@google/genai`)
*   **Audio Engine**: Web Audio API (OfflineAudioContext for rendering, AudioWorklets for real-time processing)
*   **Styling**: TailwindCSS (implied or custom CSS)

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/Dub-AI.git
    cd Dub-AI
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    *   Create a `.env.local` file in the root directory.
    *   Add your Gemini API key:
        ```env
        VITE_GEMINI_API_KEY=your_api_key_here
        ```
    *   *Note: The application also allows users to input their own API key directly in the UI.*

4.  **Run the development server**
    ```bash
    npm run dev
    ```

## 🎮 Usage

1.  Open the application in your browser (usually `http://localhost:5173`).
2.  **Upload a Video**: Select a video file to dub.
3.  **Select Target Language**: Choose the language you want to dub into.
4.  **Start Process**: Click "Start Dubbing". The agent will:
    *   Analyze the video script.
    *   Generate a time-aligned translation.
    *   Synthesize speech for each segment.
    *   Mix the audio with the original background track.
5.  **Preview & Export**: Watch the dubbed video in real-time or export the final result.

## 🔮 Future Roadmap

*   **Lip-Syncing**: Integration with video generation models to modify lip movements to match the new audio.
*   **Multi-Speaker Detection**: Improved speaker diarization for complex scenes with multiple overlapping voices.
*   **Voice Cloning**: Ability to clone the original actor's voice for the dubbed version.
*   **SRT/Subtitle Export**: Option to export synchronized subtitles along with the dubbed video.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
