import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function identifyMovieFromFrames(base64Frames: string[], previousGuesses: string[] = []): Promise<string> {
  if (base64Frames.length === 0) {
    throw new Error("No frames provided to identify the movie.");
  }

  const model = 'gemini-2.5-flash';

  let prompt = "Analyze these video frames carefully. Consider the characters, setting, costumes, and overall visual style. Based on this visual evidence, what is the most likely movie title? Respond with only the movie title. If you have analyzed all the visual information and still cannot identify the movie with any confidence, respond with the single word 'Unknown'.";
  if (previousGuesses.length > 0) {
    const guessList = previousGuesses.join(', ');
    prompt = `Analyze these video frames carefully. My previous attempts to identify the movie were ${guessList}, but those were incorrect. Please re-examine the visual evidence (characters, setting, style) and provide a different, more accurate movie title. Respond with only the movie title. If you have analyzed all the visual information and still cannot identify the movie with any confidence, respond with the single word 'Unknown'.`;
  }

  const textPart = { text: prompt };

  const imageParts = base64Frames.map(frame => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: frame,
    },
  }));
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [textPart, ...imageParts] },
    });
    
    const resultText = response.text.trim();
    if (!resultText) {
      // Treat an empty response as an inability to identify.
      return "Unknown";
    }

    return resultText;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("The AI failed to process the video. Please try again.");
  }
}

export async function searchMovieInfo(movieTitle: string): Promise<{ movieInfoUrl: string | null; posterUrl: string | null; streamingPlatforms: { name: string; type: string; url: string; }[] }> {
  const model = 'gemini-2.5-flash';
  const prompt = `Your task is to act as a movie information finder. You MUST use Google Search grounding to find the following details for the movie: "${movieTitle}".

1.  **Movie Info URL**: Find a direct URL to the movie's official page on a major, reliable database like IMDb, The Movie Database (TMDB), Rotten Tomatoes, or Wikipedia. Prioritize the most comprehensive and official source. If your search does not yield a reliable link from a well-known database, the value for this key **must** be null.

2.  **Poster URL**: Find a direct, public URL to a high-quality poster image for the movie. The URL should link directly to an image file (e.g., .jpg, .png). If your search does not find a reliable and direct link to a poster, the value for this key **must** be null.

3.  **Streaming Platforms**: Find a list of platforms where the movie can be watched. Prioritize any free streaming options.

Please format your entire response as a single, valid JSON object. Do not include any other text, explanations, or markdown formatting (like \`\`\`json) outside of the JSON object itself.

Here is an example of the required JSON structure:
{
  "movieInfoUrl": "https://www.imdb.com/title/tt0111161/",
  "posterUrl": "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
  "streamingPlatforms": [
    {
      "name": "Netflix",
      "type": "Subscription",
      "url": "https://www.netflix.com/title/80057281"
    },
    {
      "name": "Tubi TV",
      "type": "Free",
      "url": "https://tubitv.com/movies/566333/the-shawshank-redemption"
    }
  ]
}

If no streaming platforms are found, provide an empty array for "streamingPlatforms".`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        // Disabling the thinking budget can improve latency for requests
        // where the model can respond without extensive reasoning.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    let jsonString = response.text.trim();
    // The model sometimes wraps the JSON in ```json ... ```, so we need to strip that.
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.substring(7, jsonString.length - 3).trim();
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
    }
    
    const parsedData = JSON.parse(jsonString);

    if (parsedData.movieInfoUrl === undefined || !Array.isArray(parsedData.streamingPlatforms) || parsedData.posterUrl === undefined) {
      throw new Error("AI returned data in an unexpected format.");
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
    console.error("Error calling Gemini API for search or parsing response:", error);
    if (error instanceof SyntaxError) {
        throw new Error("The AI returned movie details in an invalid format. Please try again.");
    }
    throw new Error("The AI failed to search for movie details. Please try again.");
  }
}