import { useRef, useEffect } from 'react';

function VideoPlayer({ participant }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="video-container">
      {participant.stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="video-element"
          />
          <div className="video-overlay">
            <span className="participant-name">{participant.userName}</span>
          </div>
        </>
      ) : (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Connecting to {participant.userName}...</p>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
