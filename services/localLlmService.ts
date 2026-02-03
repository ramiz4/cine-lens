import { pipeline, Pipeline } from "@huggingface/transformers";

// Cache the pipeline instance to avoid re-initialization
let textGenerationPipeline: Pipeline | null = null;

// Initialize the local LLM pipeline
// Using a smaller model optimized for browser usage
export async function initializeLocalLlm(): Promise<void> {
  if (textGenerationPipeline) {
    return; // Already initialized
  }

  try {
    // Try WebGPU first, fall back to WebAssembly if unavailable
    let device: 'webgpu' | 'wasm' = 'webgpu';
    try {
      const adapter = await (navigator as any).gpu?.requestAdapter();
      if (!adapter) {
        device = 'wasm';
      }
    } catch {
      device = 'wasm';
    }

    // Use a small, efficient model suitable for browser inference
    // Xenova/SmolLM2-360M-Instruct is a good balance of size and capability
    textGenerationPipeline = await pipeline(
      'text-generation',
      'Xenova/SmolLM2-360M-Instruct',
      {
        device: device,
        dtype: device === 'webgpu' ? 'q8' : 'q8', // Use quantized model for smaller size
      }
    );
  } catch (error) {
    console.error("Error initializing local LLM:", error);
    throw new Error("Failed to initialize local LLM. Please ensure your browser supports WebGPU or WebAssembly.");
  }
}

export async function identifyMovieFromFrames(
  base64Frames: string[],
  previousGuesses: string[] = []
): Promise<string> {
  if (base64Frames.length === 0) {
    throw new Error("No frames provided to identify the movie.");
  }

  // Initialize pipeline if not already done
  if (!textGenerationPipeline) {
    await initializeLocalLlm();
  }

  if (!textGenerationPipeline) {
    throw new Error("Local LLM not initialized");
  }

  // LIMITATION: The local text-based LLM cannot process visual frames
  // This is a significant limitation compared to Gemini's vision capabilities
  // For a real implementation, you would need a vision-language model
  // or extract text descriptions from frames using another model
  throw new Error(
    "Local AI mode does not support visual analysis yet. " +
    "Please switch to Gemini API mode for movie identification from video frames. " +
    "Vision-language models for browser are still experimental."
  );
}

export async function searchMovieInfo(movieTitle: string): Promise<{
  movieInfoUrl: string | null;
  posterUrl: string | null;
  streamingPlatforms: { name: string; type: string; url: string; }[];
}> {
  // Initialize pipeline if not already done
  if (!textGenerationPipeline) {
    await initializeLocalLlm();
  }

  if (!textGenerationPipeline) {
    throw new Error("Local LLM not initialized");
  }

  // LIMITATION: Small local LLMs cannot provide accurate real-time URLs 
  // or streaming platform information. They don't have access to search
  // or current databases. They would hallucinate responses.
  // Return empty results to avoid providing false information.
  console.warn(
    "Local AI mode cannot provide movie information (URLs, posters, streaming). " +
    "This requires internet search capabilities. Returning empty results."
  );
  
  return {
    movieInfoUrl: null,
    posterUrl: null,
    streamingPlatforms: []
  };
}

// Check if the browser supports WebGPU
export async function checkWebGPUSupport(): Promise<boolean> {
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }
  return false;
}
