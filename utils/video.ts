/**
 * Extracts a specified number of frames from a video blob and returns them as base64 encoded strings.
 * @param videoBlob The video blob to process.
 * @param frameCount The number of frames to extract.
 * @returns A promise that resolves to an array of base64 encoded JPEG strings (without the data URL prefix).
 */
export const extractFramesFromVideo = (
  videoBlob: Blob,
  frameCount: number
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];

    if (!context) {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Could not create canvas context.'));
      return;
    }
    
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Timed out waiting for video metadata. The recorded clip might be invalid.'));
    }, 5000); // 5-second timeout

    video.onloadeddata = () => {
      clearTimeout(timeoutId);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const duration = video.duration;
      if (duration === 0 || !isFinite(duration) || video.videoWidth === 0) {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Video has no duration or metadata is invalid. Please try recording again.'));
        return;
      }
      
      const interval = duration / (frameCount + 1);

      const captureFrame = (time: number) => {
        return new Promise<void>((resolveFrame, rejectFrame) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            try {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              // Get base64 string and remove the data URL prefix
              const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
              frames.push(base64);
              resolveFrame();
            } catch(e) {
              rejectFrame(e);
            }
          };

          const onError = () => {
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            rejectFrame(new Error('An error occurred while seeking the video frame.'));
          };

          video.addEventListener('seeked', onSeeked);
          video.addEventListener('error', onError);
          video.currentTime = time;
        });
      };

      const captureAllFrames = async () => {
        try {
          for (let i = 1; i <= frameCount; i++) {
            const time = i * interval;
            await captureFrame(time);
          }
          resolve(frames);
        } catch (err) {
          reject(err as Error);
        } finally {
            URL.revokeObjectURL(videoUrl);
        }
      };

      captureAllFrames();
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(videoUrl);
      reject(new Error(`Video error: ${video.error?.message || 'A loading error occurred.'}`));
    };
    
    video.preload = 'auto';
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true; // Important for iOS
    video.play().catch(() => {}); // Kickstart loading, ignore errors
  });
};
