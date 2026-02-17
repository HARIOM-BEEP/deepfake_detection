export const captureFrame = (videoElement) => {
  if (!videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Convert to base64
  return canvas.toDataURL('image/jpeg', 0.8);
};

export const startFrameAnalysis = (videoElement, socket, meetingId, userId, interval = 5000) => {
  const intervalId = setInterval(() => {
    const frameData = captureFrame(videoElement);
    if (frameData) {
      socket.emit('analyze-frame', {
        meetingId,
        userId,
        frameData
      });
    }
  }, interval);

  return intervalId;
};

export const stopFrameAnalysis = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
  }
};
