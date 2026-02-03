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
    // Use a small, efficient model suitable for browser inference
    // Xenova/SmolLM2-360M-Instruct is a good balance of size and capability
    textGenerationPipeline = await pipeline(
      'text-generation',
      'Xenova/SmolLM2-360M-Instruct',
      {
        device: 'webgpu', // Use WebGPU for acceleration when available
        dtype: 'q8', // Use quantized model for smaller size
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

  // Build the prompt
  let prompt = "You are a movie expert AI. Based on visual descriptions, identify the movie title. ";
  
  if (previousGuesses.length > 0) {
    const guessList = previousGuesses.join(', ');
    prompt += `Previous incorrect guesses: ${guessList}. `;
  }
  
  prompt += "Analyze these movie frames: The frames show specific scenes with characters, settings, and visual style. ";
  prompt += "What is the most likely movie title? Respond with ONLY the movie title, nothing else. ";
  prompt += "If you cannot identify the movie with confidence, respond with 'Unknown'.\n\n";
  prompt += "Movie title:";

  try {
    const response = await textGenerationPipeline(prompt, {
      max_new_tokens: 50,
      do_sample: false,
      temperature: 0.1,
    });

    const resultText = response[0].generated_text.trim();
    
    // Extract just the movie title from the response
    // The model returns the full text including the prompt
    const movieTitle = resultText.replace(prompt, '').trim();
    
    if (!movieTitle || movieTitle.toLowerCase() === 'unknown') {
      return "Unknown";
    }

    return movieTitle;
  } catch (error) {
    console.error("Error calling local LLM:", error);
    throw new Error("The local LLM failed to process the request. Please try again.");
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

  const prompt = `You are a movie information assistant. For the movie "${movieTitle}", provide information in JSON format.
Include:
1. movieInfoUrl: A URL to IMDb, TMDB, or Wikipedia (or null if unknown)
2. posterUrl: A direct URL to the movie poster image (or null if unknown)
3. streamingPlatforms: An array of platforms where it can be watched

Format your response as valid JSON only:
{
  "movieInfoUrl": "url or null",
  "posterUrl": "url or null",
  "streamingPlatforms": []
}

JSON response:`;

  try {
    const response = await textGenerationPipeline(prompt, {
      max_new_tokens: 256,
      do_sample: false,
      temperature: 0.1,
    });

    const resultText = response[0].generated_text.trim();
    
    // Extract JSON from the response
    let jsonString = resultText.replace(prompt, '').trim();
    
    // Try to find JSON in the response
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const parsedData = JSON.parse(jsonString);

    // Validate the structure
    if (parsedData.movieInfoUrl === undefined || 
        !Array.isArray(parsedData.streamingPlatforms) || 
        parsedData.posterUrl === undefined) {
      // Return default structure if parsing fails
      return {
        movieInfoUrl: null,
        posterUrl: null,
        streamingPlatforms: []
      };
    }

    // Sort platforms to prioritize "Free"
    parsedData.streamingPlatforms.sort((a: any, b: any) => {
      if (a.type === 'Free' && b.type !== 'Free') return -1;
      if (a.type !== 'Free' && b.type === 'Free') return 1;
      if (a.type === 'Subscription' && b.type === 'Rent/Buy') return -1;
      if (a.type === 'Rent/Buy' && b.type === 'Subscription') return 1;
      return 0;
    });

    return {
      movieInfoUrl: parsedData.movieInfoUrl,
      posterUrl: parsedData.posterUrl,
      streamingPlatforms: parsedData.streamingPlatforms
    };
  } catch (error) {
    console.error("Error calling local LLM for search:", error);
    // Return default structure on error
    return {
      movieInfoUrl: null,
      posterUrl: null,
      streamingPlatforms: []
    };
  }
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
