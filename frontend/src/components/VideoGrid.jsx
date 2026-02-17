import VideoPlayer from './VideoPlayer';
import './VideoGrid.css';

function VideoGrid({ localStream, localVideoRef, participants, userName, isVideoEnabled }) {
  const totalParticipants = participants.length + 1; // +1 for local user

  const getGridClass = () => {
    if (totalParticipants === 1) return 'grid-1';
    if (totalParticipants === 2) return 'grid-2';
    if (totalParticipants <= 4) return 'grid-4';
    if (totalParticipants <= 6) return 'grid-6';
    return 'grid-9';
  };

  return (
    <div className={`video-grid ${getGridClass()}`}>
      {/* Local video */}
      <div className="video-container">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="video-element"
        />
        <div className="video-overlay">
          <span className="participant-name">{userName} (You)</span>
          {!isVideoEnabled && (
            <div className="video-disabled-indicator">
              <span>📷</span>
              <p>Camera Off</p>
            </div>
          )}
        </div>
      </div>

      {/* Remote videos */}
      {participants.map(participant => (
        <VideoPlayer
          key={participant.socketId}
          participant={participant}
        />
      ))}
    </div>
  );
}

export default VideoGrid;
