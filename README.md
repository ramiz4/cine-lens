# CineLens

<div align="center">


### 🎬 Identify any movie scene instantly using the power of Gemini AI

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Deployment](#-deploying-to-github-pages) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

**CineLens** is an intelligent web application that solves the "what movie is this?" problem. By strictly recording a short video clip of a scene, CineLens utilizes Google's **Gemini 1.5 Flash** model to analyze the visual context—characters, setting, lighting, and costumes—to identify the movie with remarkable accuracy.

Beyond simple identification, CineLens acts as your personal movie assistant, fetching high-quality posters, official information links, and real-time streaming availability, prioritizing free platforms.

## ✨ Features

- **🎥 In-App Video Recorder**: Seamlessly record video clips directly from your browser.
- **🧠 Advanced AI Vision**: Powered by Gemini 1.5 Flash for high-fidelity video frame analysis.
- **🔒 Local AI Mode**: Privacy-first on-device processing using transformers.js with vision capabilities - no API key required, completely private.
- **🔄 Smart Context Loop**: Validates guesses with you. If the AI is wrong, it learns from the mistake and tries again with added context.
- **📺 Streaming Discovery**: Instantly find where to watch the identified movie, with a focus on free services (Tubi, Pluto TV, etc.).
- **⚡ Modern & Fast**: Built with React 19 and Vite for a lightning-fast experience.
- **🎨 Sleek Design**: A premium, dark-mode first UI designed with Tailwind CSS.

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: 
  - [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (Gemini 1.5 Flash) - Primary AI provider
  - [Transformers.js](https://huggingface.co/docs/transformers.js) (Local browser-based AI with vision) - Privacy-first alternative
- **Language**: TypeScript

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- **Node.js**: Version 18 or higher.
- **pnpm**: Fast, disk space efficient package manager. Install it globally with `npm install -g pnpm`.
- **Gemini API Key** (Optional): Get a free API key from [Google AI Studio](https://aistudio.google.com/) if you want to use Gemini AI. You can also use the local AI mode without an API key.

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/cine-lens.git
    cd cine-lens
    ```

2.  **Install Dependencies**

    ```bash
    pnpm install
    ```

3.  **Configure Environment (Optional for Gemini API)**

    To use Gemini API, create a `.env` file in the root directory.

    ```bash
    touch .env
    ```

    Add your Gemini API key to the file:

    ```env
    VITE_API_KEY=your_actual_api_key_here
    ```
    
    **Note**: You can skip this step if you plan to use the local AI mode only.

4.  **Run the Application**

    Start the development server:

    ```bash
    pnpm dev
    ```

    Open your browser and navigate to `http://localhost:3000`.

## 🤖 AI Modes

CineLens offers two AI modes that you can switch between using the toggle in the header:

### Gemini API Mode (Default - Recommended)
- **Pros**: Most accurate results, fast inference, excellent at identifying movies, native vision analysis
- **Cons**: Requires API key, sends data to Google servers, requires internet connection
- **Best for**: Users who want the best accuracy and have a Gemini API key

### Local AI Mode (Privacy-First)
- **Pros**: Complete privacy (runs entirely in your browser), no API key needed, works offline after models are downloaded
- **Cons**: Lower accuracy compared to Gemini, requires modern browser with WebGPU for best performance, initial model download (~200MB), slower inference
- **How it works**: Uses image-to-text model (ViT-GPT2) to generate captions from video frames, then uses a text generation model (SmolLM2) to identify the movie from those captions
- **Best for**: Privacy-conscious users, offline usage, or users without an API key
- **Browser Support**: Best in Chrome/Edge with WebGPU. Falls back to WebAssembly in other browsers.
- **Model Cache**: After first download (~200MB total), models are cached in browser storage (IndexedDB) for offline use.

**Note**: Local AI mode uses a two-step approach (vision → captions → identification) which may be less accurate than Gemini's direct vision analysis, but provides a fully private, no-API-key alternative.

To switch modes, simply click the toggle switch in the header. The first time you enable Local AI mode, the models will download and initialize (this may take 1-2 minutes).

## 🚀 Deploying to GitHub Pages

CineLens is configured to automatically deploy to GitHub Pages whenever you push to the `main` branch. To enable Gemini API functionality in your deployed application, you need to add your API key as a GitHub secret.

### Setting Up GitHub Secrets

1. **Get your Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Sign in with your Google account
   - Generate a free API key

2. **Add the Secret to Your GitHub Repository**
   - Go to your repository on GitHub
   - Click on **Settings** (top menu bar)
   - In the left sidebar, navigate to **Secrets and variables** → **Actions**
   - Click the **New repository secret** button
   - Add the following secret:
     - **Name**: `VITE_API_KEY`
     - **Value**: Your actual Gemini API key (e.g., `AIza...`)
   - Click **Add secret**

3. **Trigger Deployment**
   - The GitHub Actions workflow will automatically build and deploy your site
   - The API key will be securely injected during the build process
   - Your deployed application will now have full Gemini API functionality

### Important Notes

- **API Key Security**: The API key is embedded in the client-side JavaScript bundle and is visible to users who visit your site. This is the intended design for client-side Gemini API usage. To protect your key:
  - Set up HTTP referrer restrictions in [Google AI Studio](https://aistudio.google.com/) to limit usage to your domain
  - Monitor your API usage regularly
  - Consider using Local AI mode for privacy-sensitive deployments (no API key required)
- **Never commit your API key** to the repository. The `.env` file (if you create one locally) is already ignored by `.gitignore`
- If you see the error "Gemini API key not configured" on your deployed site, verify that:
  1. The `VITE_API_KEY` secret is correctly set in GitHub
  2. The deployment workflow has run successfully after adding the secret
- Local AI mode does not require any API key and can be used as an alternative

📖 **For detailed deployment instructions with troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md)**

## 📁 Project Structure

```bash
cine-lens/
├── src/
│   ├── components/      # Reusable UI components (Loader, VideoRecorder, etc.)
│   ├── services/        # AI service integration (Gemini API calls)
│   ├── utils/           # Helper utilities (Video frame extraction)
│   ├── App.tsx          # Main application controller
│   └── main.tsx         # Entry point
├── .env.example         # Example environment variables
├── tailwind.config.js   # Tailwind CSS configuration
└── vite.config.ts       # Vite project configuration
```

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
