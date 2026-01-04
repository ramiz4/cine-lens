# CineLens

<div align="center">


### 🎬 Identify any movie scene instantly using the power of Gemini AI

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

**CineLens** is an intelligent web application that solves the "what movie is this?" problem. By strictly recording a short video clip of a scene, CineLens utilizes Google's **Gemini 1.5 Flash** model to analyze the visual context—characters, setting, lighting, and costumes—to identify the movie with remarkable accuracy.

Beyond simple identification, CineLens acts as your personal movie assistant, fetching high-quality posters, official information links, and real-time streaming availability, prioritizing free platforms.

## ✨ Features

- **🎥 In-App Video Recorder**: Seamlessly record video clips directly from your browser.
- **🧠 Advanced AI Vision**: Powered by Gemini 1.5 Flash for high-fidelity video frame analysis.
- **🔄 Smart Context Loop**: Validates guesses with you. If the AI is wrong, it learns from the mistake and tries again with added context.
- **📺 Streaming Discovery**: Instantly find where to watch the identified movie, with a focus on free services (Tubi, Pluto TV, etc.).
- **⚡ Modern & Fast**: Built with React 19 and Vite for a lightning-fast experience.
- **🎨 Sleek Design**: A premium, dark-mode first UI designed with Tailwind CSS.

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (Gemini 1.5 Flash)
- **Language**: TypeScript

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- **Node.js**: Version 18 or higher.
- **Gemini API Key**: Get a free API key from [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/cine-lens.git
    cd cine-lens
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Configure Environment**

    Create a `.env` file in the root directory.

    ```bash
    touch .env
    ```

    Add your Gemini API key to the file:

    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Run the Application**

    Start the development server:

    ```bash
    npm run dev
    ```

    Open your browser and navigate to `http://localhost:3000`.

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
