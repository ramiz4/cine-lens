import { pipeline, Pipeline } from "@huggingface/transformers";

// Cache the pipeline instances to avoid re-initialization
let textGenerationPipeline: Pipeline | null = null;
let imageToTextPipeline: Pipeline | null = null;

// Initialize the local LLM pipeline for text generation
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
    textGenerationPipeline = await pipeline(
      'text-generation',
      'Xenova/SmolLM2-360M-Instruct',
      {
        device: device,
        dtype: 'q8', // Use quantized model for smaller size
      }
    );
  } catch (error) {
    console.error("Error initializing local LLM:", error);
    throw new Error("Failed to initialize local LLM. Please ensure your browser supports WebGPU or WebAssembly.");
  }
}

// Initialize the image-to-text pipeline for vision analysis
export async function initializeImageToText(): Promise<void> {
  if (imageToTextPipeline) {
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

    // Use BLIP for image captioning - it's well-tested and reliable for browser use
    imageToTextPipeline = await pipeline(
      'image-to-text',
      'Xenova/vit-gpt2-image-captioning',
      {
        device: device,
      }
    );
  } catch (error) {
    console.error("Error initializing image-to-text pipeline:", error);
    throw new Error("Failed to initialize vision model. Please ensure your browser supports WebGPU or WebAssembly.");
  }
}

export async function identifyMovieFromFrames(
  base64Frames: string[],
  previousGuesses: string[] = []
): Promise<string> {
  if (base64Frames.length === 0) {
    throw new Error("No frames provided to identify the movie.");
  }

  // Initialize both pipelines if not already done
  if (!imageToTextPipeline) {
    await initializeImageToText();
  }
  if (!textGenerationPipeline) {
    await initializeLocalLlm();
  }

  if (!imageToTextPipeline || !textGenerationPipeline) {
    throw new Error("Local AI models not initialized");
  }

  try {
    // Step 1: Generate captions for each frame using image-to-text
    const captions: string[] = [];
    
    // Process up to 3 frames to keep it manageable
    const framesToProcess = base64Frames.slice(0, 3);
    
    for (const frame of framesToProcess) {
      // Convert base64 to data URL
      const imageUrl = `data:image/jpeg;base64,${frame}`;
      
      // Generate caption for this frame
      const result = await imageToTextPipeline(imageUrl);
      
      // Extract the generated text from the result
      if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
        captions.push(result[0].generated_text);
      }
    }

    if (captions.length === 0) {
      throw new Error("Could not generate captions from video frames.");
    }

    // Step 2: Use text generation model to identify the movie from captions
    const captionsText = captions.map((c, i) => `Frame ${i + 1}: ${c}`).join('\n');
    
    let prompt = `You are a movie identification expert. Based on these scene descriptions from video frames, identify the movie title.

${captionsText}

Previous incorrect guesses: ${previousGuesses.length > 0 ? previousGuesses.join(', ') : 'None'}

Based on the visual descriptions above, what is the most likely movie title? Respond with ONLY the movie title, nothing else. If you cannot identify the movie with confidence, respond with "Unknown".

Movie title:`;

    const response = await textGenerationPipeline(prompt, {
      max_new_tokens: 30,
      do_sample: false,
      temperature: 0.1,
    });

    // Extract the generated text
    if (!Array.isArray(response) || response.length === 0 || !response[0].generated_text) {
      throw new Error("No response from text generation model");
    }

    const fullText = response[0].generated_text;
    
    // Extract just the movie title (after the prompt)
    const movieTitle = fullText.replace(prompt, '').trim();
    
    // Clean up the response
    const cleanedTitle = movieTitle
      .split('\n')[0] // Take first line only
      .replace(/^["']|["']$/g, '') // Remove quotes
      .trim();
    
    if (!cleanedTitle || cleanedTitle.toLowerCase() === 'unknown') {
      return "Unknown";
    }

    return cleanedTitle;
  } catch (error) {
    console.error("Error calling local AI for movie identification:", error);
    throw new Error("The local AI failed to process the video frames. Please try again.");
  }
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
  // or streaming platform information without access to search or current databases.
  // Instead of hallucinating data, we'll provide common/likely sources
  // and let users know this is limited.
  
  console.warn(
    "Local AI mode has limited movie information capabilities. " +
    "Providing common sources only. For accurate streaming info, use Gemini API mode."
  );
  
  // Provide common movie database URLs based on the title
  const encodedTitle = encodeURIComponent(movieTitle);
  
  return {
    movieInfoUrl: `https://www.imdb.com/find?q=${encodedTitle}`,
    posterUrl: null, // Cannot reliably provide poster URLs without search
    streamingPlatforms: [
      {
        name: "Search on JustWatch",
        type: "Search",
        url: `https://www.justwatch.com/us/search?q=${encodedTitle}`
      },
      {
        name: "Search on IMDb",
        type: "Info",
        url: `https://www.imdb.com/find?q=${encodedTitle}`
      }
    ]
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
