import React, { useState } from 'react';

interface ResultDisplayProps {
  title: string;
  movieInfo: {
    movieInfoUrl: string | null;
    posterUrl: string | null;
    streamingPlatforms: { name: string; type: string; url: string; }[];
  } | null;
  onReset: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ title, movieInfo, onReset }) => {
  const [posterError, setPosterError] = useState(false);

  const handlePosterError = () => {
    setPosterError(true);
  };

  return (
    <div className="text-center p-4 sm:p-8 bg-gray-800 rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-xl text-gray-300 mb-2">The movie is:</h2>
      <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-blue-400 mb-8 break-words">
        {title}
      </p>

      {movieInfo && (
        <div className="my-8 max-w-4xl mx-auto">
          <div className="md:grid md:grid-cols-3 md:gap-8 items-start">
            {movieInfo.posterUrl && !posterError && (
              <div className="md:col-span-1 mb-6 md:mb-0">
                <img 
                  src={movieInfo.posterUrl} 
                  alt={`Poster for ${title}`}
                  className="rounded-lg shadow-xl w-full max-w-xs mx-auto md:max-w-none"
                  onError={handlePosterError}
                />
              </div>
            )}
            <div className={`text-left ${movieInfo.posterUrl && !posterError ? 'md:col-span-2' : 'md:col-span-3'}`}>
              <div className="mb-6 text-center md:text-left">
                {movieInfo.movieInfoUrl ? (
                  <a
                    href={movieInfo.movieInfoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
                  >
                    View Trailer &amp; Details
                  </a>
                ) : (
                  <div className="text-gray-400">
                      <p>Detailed movie information could not be found.</p>
                  </div>
                )}
              </div>
              
              {movieInfo.streamingPlatforms && movieInfo.streamingPlatforms.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-200 mb-3 text-center md:text-left">Where to Watch:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {movieInfo.streamingPlatforms.map((platform, index) => (
                      <a
                        key={index}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <span className="font-medium text-gray-200">{platform.name}</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          platform.type === 'Free' ? 'bg-green-500 text-white' : 
                          platform.type === 'Subscription' ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-black'
                        }`}>
                          {platform.type}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onReset}
        className="mt-8 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
      >
        Identify Another Movie
      </button>
    </div>
  );
};

export default ResultDisplay;