import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AppStatus } from '../types';

interface VideoRecorderProps {
  status: AppStatus;
  setStatus: React.Dispatch<React.SetStateAction<AppStatus>>;
  onVideoRecorded: (blob: Blob) => void;
}

const MAX_RECORDING_SECONDS = 15;

const VideoRecorder: React.FC<VideoRecorderProps> = ({ status, setStatus, onVideoRecorded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [countdown, setCountdown] = useState<number>(MAX_RECORDING_SECONDS);

  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recordedChunks = useRef<Blob[]>([]);

  const [zoom, setZoom] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number, max: number, step: number } | null>(null);
  const initialPinchDistance = useRef<number | null>(null);

  const cleanupStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setZoomCapabilities(null);
  }, [stream]);

  const clearRecordingTimers = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);
  
  const handleZoomChange = useCallback(async (newZoom: number) => {
    if (!stream || !zoomCapabilities) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const clampedZoom = Math.max(zoomCapabilities.min, Math.min(newZoom, zoomCapabilities.max));

    try {
      await videoTrack.applyConstraints({
        advanced: [{ zoom: clampedZoom }],
      });
      setZoom(clampedZoom);
    } catch (error) {
      console.error('Error applying zoom:', error);
    }
  }, [stream, zoomCapabilities]);

  useEffect(() => {
    const getMedia = async () => {
      if (status === AppStatus.IDLE) {
        cleanupStream(); 
        setStatus(AppStatus.REQUESTING_PERMISSION);
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: facingMode,
            },
            audio: false,
          });

          const track = mediaStream.getVideoTracks()[0];
          // FIX: The 'zoom' property is not on the standard MediaTrackCapabilities type.
          // By casting `capabilities` to include an optional 'zoom' property,
          // we can safely check for and use the zoom feature if the browser supports it.
          const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number, max: number, step: number } };
          
          if (capabilities.zoom) {
            setZoomCapabilities({
              min: capabilities.zoom.min,
              max: capabilities.zoom.max,
              step: capabilities.zoom.step,
            });
            setZoom(1);
          } else {
            setZoomCapabilities(null);
          }

          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.controls = false;
            videoRef.current.loop = false;
            videoRef.current.removeAttribute('src');
          }
          setStatus(AppStatus.READY_TO_RECORD);
        } catch (err) {
          console.error(`Error accessing '${facingMode}' camera:`, err);
          if (err instanceof Error && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError') && facingMode === 'environment') {
            console.warn('Back camera not found or failed, trying front camera.');
            setFacingMode('user');
            setStatus(AppStatus.IDLE); 
          } else {
            setStatus(AppStatus.ERROR);
          }
        }
      }
    };

    getMedia();
  }, [status, facingMode, setStatus, cleanupStream]);

  useEffect(() => {
    return () => {
      cleanupStream();
      clearRecordingTimers();
    };
  }, [cleanupStream, clearRecordingTimers]);


  const handleStartRecording = () => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Error playing video for recording:", e));

      recordedChunks.current = [];
      const options = { mimeType: 'video/webm; codecs=vp9' };
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch (e) {
        console.error('Error creating MediaRecorder with vp9, falling back:', e);
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const videoBlob = new Blob(recordedChunks.current, { type: 'video/webm' });
        onVideoRecorded(videoBlob);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(videoBlob);
          videoRef.current.controls = true;
          videoRef.current.loop = true;
        }
        cleanupStream();
      };
      
      mediaRecorderRef.current.start();
      setStatus(AppStatus.RECORDING);

      setCountdown(MAX_RECORDING_SECONDS);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      autoStopTimerRef.current = setTimeout(() => {
        handleStopRecording();
      }, MAX_RECORDING_SECONDS * 1000);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      clearRecordingTimers();
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setStatus(AppStatus.IDLE);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLVideoElement>) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance.current = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLVideoElement>) => {
      if (e.touches.length === 2 && initialPinchDistance.current && zoomCapabilities) {
          e.preventDefault();
          const currentPinchDistance = Math.hypot(
              e.touches[0].pageX - e.touches[1].pageX,
              e.touches[0].pageY - e.touches[1].pageY
          );
          const zoomFactor = currentPinchDistance / initialPinchDistance.current;
          
          handleZoomChange(zoom * zoomFactor);

          initialPinchDistance.current = currentPinchDistance;
      }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLVideoElement>) => {
      if (e.touches.length < 2) {
          initialPinchDistance.current = null;
      }
  };
  
  const getButton = () => {
    switch (status) {
      case AppStatus.RECORDING:
        return (
          <button onClick={handleStopRecording} className="px-6 py-3 bg-red-600 text-white font-semibold rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-all duration-200 ease-in-out transform hover:scale-110 flex items-center justify-center">
            <span className="w-4 h-4 bg-white rounded-sm mr-2"></span>
            Stop Recording
          </button>
        );
      case AppStatus.READY_TO_RECORD:
        return (
          <button onClick={handleStartRecording} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-all duration-200 ease-in-out transform hover:scale-110 flex items-center justify-center">
             <span className="w-4 h-4 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            Start Recording
          </button>
        );
      default:
        return null;
    }
  }
  const button = getButton();

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden shadow-xl border-2 border-gray-700 relative">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        ></video>
         {status === AppStatus.RECORDING && (
          <>
            <div className="absolute top-4 left-4 flex items-center bg-black/50 p-2 rounded-lg">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-white font-mono text-sm">REC</span>
            </div>
            <div className="absolute top-4 right-4 flex items-center bg-black/50 px-3 py-2 rounded-lg">
              <span className="text-white font-mono text-lg font-bold tabular-nums">{countdown}</span>
            </div>
          </>
        )}
        {status === AppStatus.READY_TO_RECORD && (
          <button 
            onClick={handleSwitchCamera} 
            className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Switch camera"
            title="Switch camera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
            </svg>
          </button>
        )}
      </div>
       <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl px-2">
        {button && <div className="flex-shrink-0">{button}</div>}
        {zoomCapabilities && (status === AppStatus.READY_TO_RECORD || status === AppStatus.RECORDING) && (
            <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 max-w-xs bg-gray-700/50 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="range"
                    min={zoomCapabilities.min}
                    max={zoomCapabilities.max}
                    step={zoomCapabilities.step}
                    value={zoom}
                    onChange={(e) => handleZoomChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    aria-label="Zoom slider"
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default VideoRecorder;