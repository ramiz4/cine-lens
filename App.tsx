import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStatus } from './types';
import VideoRecorder from './components/VideoRecorder';
import ResultDisplay from './components/ResultDisplay';
import Loader from './components/Loader';
import * as geminiService from './services/geminiService';
import * as localLlmService from './services/localLlmService';
import { extractFramesFromVideo } from './utils/video';

interface StreamingPlatform {
  name: string;
  type: string;
  url: string;
}
interface MovieInfo {
  movieInfoUrl: string | null;
  posterUrl: string | null;
  streamingPlatforms: StreamingPlatform[];
}

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [movieTitle, setMovieTitle] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [previousGuesses, setPreviousGuesses] = useState<string[]>([]);
  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);
  const [loaderMessage, setLoaderMessage] = useState<string>('');
  const [useLocalLlm, setUseLocalLlm] = useState<boolean>(false);
  const [localLlmInitialized, setLocalLlmInitialized] = useState<boolean>(false);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  
  // Ref to track the status before initialization starts
  const statusBeforeInitRef = useRef<AppStatus>(AppStatus.IDLE);

  // Check WebGPU support on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = await localLlmService.checkWebGPUSupport();
      setWebGPUSupported(supported);
    };
    checkSupport();
  }, []);

  // Initialize local LLM when toggled on
  useEffect(() => {
    const initLlm = async () => {
      if (useLocalLlm && !localLlmInitialized) {
        try {
          // Capture the current status before we start initialization
          statusBeforeInitRef.current = status;
          
          setLoaderMessage('Initializing local AI models (downloading ~200MB, this may take 1-2 minutes)...');
          setStatus(AppStatus.PROCESSING);
          
          // Initialize both the vision model and text generation model
          await Promise.all([
            localLlmService.initializeImageToText(),
            localLlmService.initializeLocalLlm()
          ]);
          
          setLocalLlmInitialized(true);
          
          // Restore the previous status if it wasn't IDLE or PROCESSING
          // This preserves RECORDED state when toggling AI provider
          const previousStatus = statusBeforeInitRef.current;
          if (previousStatus !== AppStatus.IDLE && previousStatus !== AppStatus.PROCESSING) {
            setStatus(previousStatus);
          } else {
            setStatus(AppStatus.IDLE);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize local AI';
          setError(errorMessage);
          setStatus(AppStatus.ERROR);
          setUseLocalLlm(false); // Fall back to API mode
        }
      }
    };
    initLlm();
  }, [useLocalLlm, localLlmInitialized, status]);

  const handleVideoRecorded = (blob: Blob) => {
    setVideoBlob(blob);
    setStatus(AppStatus.RECORDED);
  };

  const handleIdentifyMovie = useCallback(async (guesses: string[] = []) => {
    if (!videoBlob) {
      setError('No video recorded.');
      setStatus(AppStatus.ERROR);
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setLoaderMessage('Preparing your video clip...');
    setError('');
    setMovieTitle('');

    try {
      const frames = await extractFramesFromVideo(videoBlob, 5);
      if (frames.length === 0) {
        throw new Error('Could not extract frames from the video.');
      }
      
      setLoaderMessage(useLocalLlm ? 'Analyzing scene with local AI...' : 'Analyzing scene with Gemini AI...');
      
      // Use the appropriate service based on the toggle
      const service = useLocalLlm ? localLlmService : geminiService;
      const title = await service.identifyMovieFromFrames(frames, guesses);
      
      if (title.trim().toLowerCase() === 'unknown') {
        throw new Error("The AI could not confidently identify the movie from this clip. Please try recording a clearer or longer scene.");
      }

      setMovieTitle(title);
      setStatus(AppStatus.AWAITING_FEEDBACK);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Identification failed:', errorMessage);
      setError(`Failed to identify movie. ${errorMessage}`);
      setStatus(AppStatus.ERROR);
    }
  }, [videoBlob]);

  const handleWrongGuess = useCallback(() => {
    const newGuesses = [...previousGuesses, movieTitle];
    setPreviousGuesses(newGuesses);
    handleIdentifyMovie(newGuesses);
  }, [previousGuesses, movieTitle, handleIdentifyMovie]);

  const handleCorrectGuess = useCallback(async () => {
    setStatus(AppStatus.PROCESSING);
    setLoaderMessage(`Searching for details on "${movieTitle}"...`);
    try {
      // Use the appropriate service based on the toggle
      const service = useLocalLlm ? localLlmService : geminiService;
      const info = await service.searchMovieInfo(movieTitle);
      setMovieInfo(info);
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to fetch movie details. ${errorMessage}`);
      setStatus(AppStatus.ERROR);
    }
  }, [movieTitle, useLocalLlm]);

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setVideoBlob(null);
    setMovieTitle('');
    setError('');
    setPreviousGuesses([]);
    setMovieInfo(null);
  };

  const renderContent = () => {
    switch (status) {
      case AppStatus.PROCESSING:
        return <Loader message={loaderMessage} />;
      case AppStatus.AWAITING_FEEDBACK:
        return (
          <div className="text-center animate-fade-in">
            <h2 className="text-xl text-gray-300 mb-2">My guess is:</h2>
            <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-6 break-words">
              {movieTitle}
            </p>
            <p className="text-lg text-gray-400 mb-4">Is this correct?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleCorrectGuess}
                className="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
              >
                ✓ Correct
              </button>
              <button
                onClick={handleWrongGuess}
                className="px-8 py-4 bg-red-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
              >
                ✗ Wrong
              </button>
            </div>
          </div>
        );
      case AppStatus.SUCCESS:
        return <ResultDisplay title={movieTitle} movieInfo={movieInfo} onReset={handleReset} />;
      case AppStatus.ERROR:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">An Error Occurred</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
            >
              Try Again
            </button>
          </div>
        );
      default:
        return (
          <>
            <VideoRecorder
              status={status}
              setStatus={setStatus}
              onVideoRecorded={handleVideoRecorded}
            />
            {status === AppStatus.RECORDED && (
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleIdentifyMovie()}
                  className="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
                >
                  Identify Movie
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-4 bg-gray-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
                >
                  Record Again
                </button>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto text-center">
        <header className="mb-8">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            CineLens
          </h1>
          <p className="mt-2 text-lg text-gray-300">
            Identify any movie scene instantly.
          </p>
          
          {/* AI Provider Toggle */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm text-gray-400">Gemini API</span>
            <button
              onClick={() => setUseLocalLlm(!useLocalLlm)}
              disabled={status === AppStatus.PROCESSING}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                useLocalLlm ? 'bg-blue-600' : 'bg-gray-600'
              } ${status === AppStatus.PROCESSING ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              role="switch"
              aria-checked={useLocalLlm}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useLocalLlm ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-400">
              Local AI {webGPUSupported === false && '(WebGPU unavailable)'}
            </span>
          </div>
          
          {useLocalLlm && !localLlmInitialized && status !== AppStatus.PROCESSING && (
            <p className="mt-2 text-xs text-yellow-400">
              ⚠️ Local AI will download models on first use (~200MB, 1-2 minutes)
            </p>
          )}
          {useLocalLlm && localLlmInitialized && (
            <p className="mt-2 text-xs text-green-400">
              ✓ Local AI ready (vision + text models loaded)
            </p>
          )}
        </header>
        <main className="bg-gray-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
          {renderContent()}
        </main>
        <footer className="mt-8 text-gray-500 text-sm">
          <p>Powered by {useLocalLlm ? 'Local AI (transformers.js)' : 'Gemini API'}</p>
        </footer>
      </div>
    </div>
  );
};

export default App;