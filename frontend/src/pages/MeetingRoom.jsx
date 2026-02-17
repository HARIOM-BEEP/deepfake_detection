import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import webrtcService from '../services/webrtc';
import VideoGrid from '../components/VideoGrid';
import MeetingControls from '../components/MeetingControls';
import DeepfakeAlert from '../components/DeepfakeAlert';
import { startFrameAnalysis, stopFrameAnalysis } from '../utils/frameCapture';
import './MeetingRoom.css';

function MeetingRoom({ user }) {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [localStream, setLocalStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [deepfakeAlerts, setDeepfakeAlerts] = useState([]);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const frameAnalysisRef = useRef(null);

  useEffect(() => {
    initializeMeeting();

    return () => {
      cleanup();
    };
  }, []);

  const initializeMeeting = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect to socket
      const socket = connectSocket();
      socketRef.current = socket;

      // Join meeting
      socket.emit('join-meeting', {
        meetingId,
        userId: user._id,
        userName: user.name
      });

      // Socket event listeners
      socket.on('existing-participants', (existingParticipants) => {
        existingParticipants.forEach(participant => {
          const peer = webrtcService.addPeer(participant.socketId, stream, socket);
          setParticipants(prev => [...prev, {
            socketId: participant.socketId,
            userId: participant.userId,
            userName: participant.userName,
            stream: null
          }]);
        });
      });

      socket.on('user-joined', ({ socketId, userId, userName }) => {
        setParticipants(prev => [...prev, {
          socketId,
          userId,
          userName,
          stream: null
        }]);
      });

      socket.on('offer', ({ from, offer }) => {
        webrtcService.handleOffer(from, offer, stream, socket);
      });

      socket.on('answer', ({ from, answer }) => {
        webrtcService.handleAnswer(from, answer);
      });

      socket.on('ice-candidate', ({ from, candidate }) => {
        webrtcService.handleIceCandidate(from, candidate);
      });

      socket.on('user-left', ({ socketId }) => {
        webrtcService.removePeer(socketId);
        setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      });

      socket.on('deepfake-detected', ({ userId, confidence, timestamp }) => {
        const participant = participants.find(p => p.userId === userId);
        setDeepfakeAlerts(prev => [...prev, {
          id: Date.now(),
          userName: participant?.userName || 'Unknown',
          confidence,
          timestamp
        }]);

        // Auto-remove alert after 10 seconds
        setTimeout(() => {
          setDeepfakeAlerts(prev => prev.filter(a => a.timestamp !== timestamp));
        }, 10000);
      });

      // Listen for peer streams
      window.addEventListener('peer-stream', handlePeerStream);
      window.addEventListener('peer-removed', handlePeerRemoved);

      // Start frame analysis for deepfake detection
      if (localVideoRef.current) {
        frameAnalysisRef.current = startFrameAnalysis(
          localVideoRef.current,
          socket,
          meetingId,
          user._id,
          10000 // Analyze every 10 seconds
        );
      }

    } catch (err) {
      console.error('Failed to initialize meeting:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const handlePeerStream = (event) => {
    const { socketId, stream } = event.detail;
    setParticipants(prev => prev.map(p => 
      p.socketId === socketId ? { ...p, stream } : p
    ));
  };

  const handlePeerRemoved = (event) => {
    const { socketId } = event.detail;
    setParticipants(prev => prev.filter(p => p.socketId !== socketId));
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      
      if (socketRef.current) {
        socketRef.current.emit('toggle-video', {
          meetingId,
          enabled: videoTrack.enabled
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);

      if (socketRef.current) {
        socketRef.current.emit('toggle-audio', {
          meetingId,
          enabled: audioTrack.enabled
        });
      }
    }
  };

  const leaveMeeting = () => {
    cleanup();
    navigate('/dashboard');
  };

  const cleanup = () => {
    // Stop frame analysis
    if (frameAnalysisRef.current) {
      stopFrameAnalysis(frameAnalysisRef.current);
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Remove event listeners
    window.removeEventListener('peer-stream', handlePeerStream);
    window.removeEventListener('peer-removed', handlePeerRemoved);

    // Clean up WebRTC
    webrtcService.removeAllPeers();

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('leave-meeting');
      disconnectSocket();
    }
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    alert('Meeting ID copied to clipboard!');
  };

  if (error) {
    return (
      <div className="meeting-error">
        <div className="error-card card">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-room">
      <div className="meeting-header">
        <div className="meeting-info">
          <h3>Meeting: {meetingId}</h3>
          <button onClick={copyMeetingId} className="btn-copy">
            📋 Copy ID
          </button>
        </div>
      </div>

      {deepfakeAlerts.length > 0 && (
        <div className="alerts-container">
          {deepfakeAlerts.map(alert => (
            <DeepfakeAlert key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      <VideoGrid
        localStream={localStream}
        localVideoRef={localVideoRef}
        participants={participants}
        userName={user.name}
        isVideoEnabled={isVideoEnabled}
      />

      <MeetingControls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onLeaveMeeting={leaveMeeting}
      />
    </div>
  );
}

export default MeetingRoom;
