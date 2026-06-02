import { AutoProcessor, AutoModelForVision2Seq, RawImage, env } from "@huggingface/transformers";

// Disable WASM multi-threading to avoid SharedArrayBuffer requirement.
// GitHub Pages does not serve COOP/COEP headers, and iOS Safari requires
// explicit opt-in. Single-threaded WASM is universally compatible.
(env as any).backends.onnx.wasm.numThreads = 1;

const MODEL_ID = 'onnx-community/SmolVLM-256M-Instruct';

// A single vision-language model replaces the previous two-model pipeline.
// SmolVLM-256M-Instruct accepts an image + text prompt directly and produces
// a coherent natural-language answer — no separate captioning step required.
let vlmProcessor: InstanceType<typeof AutoProcessor> | null = null;
let vlmModel: Awaited<ReturnType<typeof AutoModelForVision2Seq.from_pretrained>> | null = null;

async function initializeVlm(): Promise<void> {
  if (vlmModel) return;

  try {
    vlmProcessor = await AutoProcessor.from_pretrained(MODEL_ID);

    try {
      // WebGPU path — mixed precision for best performance.
      // fp16 vision/embed + q4 decoder works on all WebGPU devices including
      // iPhone 16 Pro (Apple GPU via Metal) with iOS 17.4+.
      vlmModel = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
        dtype: {
          embed_tokens: 'fp16',
          vision_encoder: 'fp16',
          decoder_model_merged: 'q4',
        },
        device: 'webgpu',
      });
    } catch (webgpuError) {
      // WASM fallback — uniform q4 keeps the download ~200 MB and fits within
      // iOS Safari's memory budget. numThreads=1 (set above) avoids
      // SharedArrayBuffer, making this path work on GitHub Pages and iOS.
      console.warn('WebGPU initialization failed, retrying with WASM:', webgpuError);
      vlmModel = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
        dtype: 'q4',
        device: 'wasm',
      });
    }
  } catch (error) {
    vlmProcessor = null;
    vlmModel = null;
    console.error("Error initializing SmolVLM:", error);
    throw new Error(
      `Failed to initialize local AI model: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Public initializers — both delegate to the single VLM so callers in App.tsx
// that call each one independently still work correctly.
export async function initializeLocalLlm(): Promise<void> {
  await initializeVlm();
}

export async function initializeImageToText(): Promise<void> {
  await initializeVlm();
}

export async function identifyMovieFromFrames(
  base64Frames: string[],
  previousGuesses: string[] = []
): Promise<string> {
  if (base64Frames.length === 0) {
    throw new Error("No frames provided to identify the movie.");
  }

  if (!vlmModel || !vlmProcessor) {
    await initializeVlm();
  }

  if (!vlmModel || !vlmProcessor) {
    throw new Error("Local AI model not initialized");
  }

  try {
    const previousGuessContext = previousGuesses.length > 0
      ? ` The following guesses were already made and are incorrect — do not repeat them: ${previousGuesses.join(', ')}.`
      : '';

    // Query up to 3 frames independently; pick the most common answer.
    const frameAnswers: string[] = [];

    for (const frame of base64Frames.slice(0, 3)) {
      const image = await RawImage.fromURL(`data:image/jpeg;base64,${frame}`);

      const messages = [
        {
          role: 'user',
          content: [
            { type: 'image' },
            {
              type: 'text',
              text: `You are a movie expert. Examine this video frame and identify the movie or TV show it is from. Consider the actors, costumes, set design, cinematography, and any visible text or logos.${previousGuessContext} Reply with ONLY the movie or TV show title. If you cannot identify it with confidence, reply with "Unknown".`,
            },
          ],
        },
      ];

      const promptStr = (vlmProcessor as any).apply_chat_template(messages, {
        add_generation_prompt: true,
      });

      const inputs = await (vlmProcessor as any)(promptStr, [image], {
        do_image_splitting: false,
      });

      const generatedIds = await (vlmModel as any).generate({
        ...inputs,
        max_new_tokens: 50,
        do_sample: false,
      });

      // Decode only the newly generated tokens (skip the prompt tokens).
      const inputLength = inputs.input_ids.dims.at(-1);
      const decoded: string[] = (vlmProcessor as any).batch_decode(
        generatedIds.slice(null, [inputLength, null]),
        { skip_special_tokens: true }
      );

      const answer = decoded[0]?.trim();
      if (answer && answer.toLowerCase() !== 'unknown') {
        frameAnswers.push(answer);
      }
    }

    if (frameAnswers.length === 0) {
      return "Unknown";
    }

    // Return the most frequently agreed-upon title across frames.
    const frequency: Record<string, number> = {};
    for (const answer of frameAnswers) {
      frequency[answer] = (frequency[answer] || 0) + 1;
    }
    const best = Object.entries(frequency).sort((a, b) => b[1] - a[1])[0][0];

    return best
      .split('\n')[0]
      .replace(/^["']|["']$/g, '')
      .trim() || "Unknown";

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
  // Initialize model if not already done
  if (!vlmModel) {
    await initializeVlm();
  }

  if (!vlmModel) {
    throw new Error("Local AI model not initialized");
  }

  // LIMITATION: Small local VLMs cannot provide accurate real-time URLs
  // or streaming platform information without access to search or current databases.
  // Instead of hallucinating data, we provide common/likely sources
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
