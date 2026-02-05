# CineLens - GitHub Copilot Instructions

## Project Overview

CineLens is an intelligent web application that identifies movies from video clips using AI vision models. The app allows users to record video clips directly in their browser, then uses either Google's Gemini 1.5 Flash API or local browser-based AI (Transformers.js) to analyze the visual context and identify the movie. It also provides streaming platform availability information.

**Key Features:**
- In-app video recording with camera controls
- Dual AI modes: Cloud-based (Gemini API) and privacy-first local AI (Transformers.js)
- Smart context loop that validates guesses and learns from mistakes
- Streaming platform discovery
- Dark-mode first UI

## Technology Stack

- **Frontend Framework**: React 19 with functional components and hooks
- **Build Tool**: Vite 6.2.0
- **Styling**: Tailwind CSS via CDN (inline utility classes, dark-mode first; no Tailwind build pipeline)
- **Language**: TypeScript (strict mode)
- **AI Integration**:
  - Google GenAI SDK (@google/genai) for Gemini 1.5 Flash
  - Transformers.js (@huggingface/transformers) for local browser-based AI
- **Package Manager**: pnpm

## Coding Standards

### React/TypeScript
- **ALWAYS** use functional components with React hooks
- **NEVER** use class components
- Use TypeScript with strict typing - avoid `any` types
- Prefer `interface` over `type` for object types
- Use default exports for components
- Components should be in PascalCase (e.g., `VideoRecorder.tsx`)

### File Organization
- Components: `/components/` directory
- Services: `/services/` directory (AI integrations)
- Utils: `/utils/` directory (helper functions)
- Types: Define shared types in `types.ts` or inline with components

### State Management
- Use React hooks (useState, useEffect, useCallback, useRef) for component state
- Use refs for values that shouldn't trigger re-renders
- Clean up effects and event listeners properly

### Code Style
- Use destructuring for props and state
- Prefer arrow functions
- Use template literals for string concatenation
- Use optional chaining (?.) and nullish coalescing (??) where appropriate

## AI Service Integration Patterns

### Gemini API (geminiService.ts)
- Uses Google's Gemini 2.5 Flash model for video frame analysis
- Requires API key from environment variable `VITE_API_KEY`
- Processes video frames directly with native vision capabilities
- Use for high-accuracy movie identification

### Local LLM (localLlmService.ts)
- Privacy-first, browser-based AI using Transformers.js
- Two-step process: image-to-text (ViT-GPT2) → text generation (Xenova/SmolLM2-360M-Instruct)
- WebGPU support for best performance, falls back to WebAssembly
- Models cached in IndexedDB (~200MB)
- Always check WebGPU support before initialization

## Architecture Guidelines

### Component Structure
- Keep components focused and single-responsibility
- Use props for component communication
- Maintain clear separation between UI and business logic
- Services handle AI API calls and complex logic

### Video Handling
- Use MediaRecorder API for video capture
- Extract frames with `extractFramesFromVideo()` utility
- Max recording time: 15 seconds
- Support both front and rear cameras (facingMode)

### Error Handling
- Always handle errors from AI services gracefully
- Provide user-friendly error messages
- Use try-catch blocks for async operations
- Clean up resources (streams, timers) on errors

## Security Best Practices

- **NEVER** commit API keys or secrets to the repository
- Store sensitive data in `.env` file (use `.env.example` as template)
- Use environment variables with `VITE_` prefix for client-side access
- Sanitize user inputs before processing
- Clean up media streams and stop camera tracks when done

## Build and Development

### Scripts
```bash
pnpm install    # Install dependencies (standard pnpm command, not a project script)
pnpm dev        # Start development server on port 3000
pnpm build      # Build for production
pnpm preview    # Preview production build
```

### Environment Setup
- Optional: Create `.env` file with `VITE_API_KEY` for Gemini API
- Local AI mode works without any API keys

## Best Practices

### Do
- Use functional components with hooks
- Write strict TypeScript types
- Clean up side effects in useEffect
- Handle loading and error states
- Test both AI modes (Gemini and local)
- Maintain dark-mode first design consistency

### Don't
- Don't use class components
- Don't use `any` type unless absolutely necessary
- Don't commit sensitive credentials
- Don't directly manipulate the DOM
- Don't forget to stop media streams
- Don't mix inline styles with CSS files (use Tailwind only)

## Common Patterns

### Loading States
```typescript
const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
const [loaderMessage, setLoaderMessage] = useState<string>('');
```

### AI Service Calls
```typescript
// Gemini API
await geminiService.identifyMovieFromFrames(frames, previousGuesses);

// Local LLM
await localLlmService.identifyMovieFromFrames(frames, previousGuesses);
```

### Cleanup Pattern
```typescript
useEffect(() => {
  // Setup
  return () => {
    // Cleanup
  };
}, [dependencies]);
```

## Project Structure

```
cine-lens/
├── .github/              # GitHub configuration
├── assets/               # Static assets
├── components/           # React components
│   ├── VideoRecorder.tsx
│   ├── ResultDisplay.tsx
│   └── Loader.tsx
├── services/             # AI service integrations
│   ├── geminiService.ts
│   └── localLlmService.ts
├── utils/                # Helper utilities
├── App.tsx               # Main application
├── index.tsx             # Entry point
├── types.ts              # Shared TypeScript types
├── vite.config.ts        # Vite configuration
└── tsconfig.json         # TypeScript configuration
```

## Additional Notes

- The app runs entirely in the browser
- Video processing happens client-side
- Support modern browsers with MediaRecorder API
- WebGPU support enhances local AI performance
- Always provide fallbacks for features that may not be supported
