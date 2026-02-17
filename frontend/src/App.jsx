import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { authAPI, meetingAPI } from './services/api';
import './App.css';
import './pages/Auth.css';

// Socket URL
const SOCKET_URL = 'http://localhost:5000';

// Login Component
function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card-glass fade-in">
        <div className="auth-header">
          <h1>SecureCall</h1>
          <p className="text-secondary">Sign in to your account</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="text-secondary">
            Don't have an account? <Link to="/register" className="link-primary">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Register Component
function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card-glass fade-in">
        <div className="auth-header">
          <h1>SecureCall</h1>
          <p className="text-secondary">Create your account</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="text-secondary">
            Already have an account? <Link to="/login" className="link-primary">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [meetingTitle, setMeetingTitle] = useState('');
  const [joinMeetingId, setJoinMeetingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await meetingAPI.create({ title: meetingTitle || 'Quick Meeting' });
      navigate(`/meeting/${response.data.meetingId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (joinMeetingId.trim()) {
      navigate(`/meeting/${joinMeetingId.trim()}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <nav style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: 'var(--spacing-md) 0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            background: 'linear-gradient(135deg, var(--primary-light), var(--secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0
          }}>SecureCall</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{user.name}</span>
            <button onClick={onLogout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: 'var(--spacing-xl) var(--spacing-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h1 className="fade-in">Welcome, {user.name}!</h1>
          <p className="text-secondary">Start a secure video call with AI-powered deepfake detection</p>
        </div>

        {error && (
          <div className="alert alert-danger fade-in" style={{ maxWidth: '800px', margin: '0 auto var(--spacing-lg)' }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)',
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <div className="card card-glass fade-in">
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--spacing-md)',
              color: 'white'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                <polyline points="17 2 12 7 7 2" />
              </svg>
            </div>
            <h3 className="mb-sm">Create Meeting</h3>
            <p className="text-secondary mb-md">Start a new video conference</p>
            <form onSubmit={handleCreateMeeting}>
              <input
                type="text"
                className="form-input mb-md"
                placeholder="Meeting title (optional)"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Meeting'}
              </button>
            </form>
          </div>

          <div className="card card-glass fade-in" style={{ animationDelay: '0.1s' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--spacing-md)',
              color: 'white'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <h3 className="mb-sm">Join Meeting</h3>
            <p className="text-secondary mb-md">Enter meeting ID to join</p>
            <form onSubmit={handleJoinMeeting}>
              <input
                type="text"
                className="form-input mb-md"
                placeholder="Enter meeting ID"
                value={joinMeetingId}
                onChange={(e) => setJoinMeetingId(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary btn-full">
                Join Meeting
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Video Component for Remote Peers
const RemoteVideo = ({ peer, userName }) => {
  const ref = useRef();

  useEffect(() => {
    peer.on('stream', stream => {
      ref.current.srcObject = stream;
    });
  }, [peer]);

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
      <video
        playsInline
        autoPlay
        ref={ref}
        style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '300px' }}
      />
      <div style={{
        position: 'absolute',
        bottom: 'var(--spacing-sm)',
        left: 'var(--spacing-sm)',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-md)',
        color: 'white',
        fontSize: '0.9rem'
      }}>
        {userName || 'Participant'}
      </div>
    </div>
  );
};

// MeetingRoom Component (Multi-user with WebRTC)
function MeetingRoom({ user }) {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const socketRef = useRef();
  const localVideoRef = useRef();
  const peersRef = useRef([]);

  useEffect(() => {
    // Connect to Socket.IO
    socketRef.current = io(SOCKET_URL);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socketRef.current.emit('join-meeting', {
        meetingId,
        userId: user._id,
        userName: user.name
      });

      // Receive list of existing participants and start calling them
      socketRef.current.on('existing-participants', participants => {
        const peers = [];
        participants.forEach(participant => {
          const peer = createPeer(participant.socketId, socketRef.current.id, stream);
          peersRef.current.push({
            peerID: participant.socketId,
            peer,
            userName: participant.userName
          });
          peers.push({
            peerID: participant.socketId,
            peer,
            userName: participant.userName
          });
        });
        setPeers(peers);
      });

      // Receive call from new participant
      socketRef.current.on('user-joined', payload => {
        const peer = addPeer(payload.signal, payload.socketId, stream);
        peersRef.current.push({
          peerID: payload.socketId,
          peer,
          userName: payload.userName
        });
        setPeers(users => [...users, {
          peerID: payload.socketId,
          peer,
          userName: payload.userName
        }]);
      });

      // Answer received
      socketRef.current.on('answer', payload => {
        const item = peersRef.current.find(p => p.peerID === payload.from);
        if (item) {
          item.peer.signal(payload.answer);
        }
      });

      // Offer received (should be handled by addPeer logic, but handled separately here for clarity if needed)
      socketRef.current.on('offer', payload => {
        const item = peersRef.current.find(p => p.peerID === payload.from);
        if (item) {
          item.peer.signal(payload.offer);
        } else {
          // Only happens if user-joined didn't trigger correctly or race condition
          const peer = addPeer(payload.offer, payload.from, stream);
          peersRef.current.push({
            peerID: payload.from,
            peer,
            userName: 'Participant' // Should get username from signaling
          });
          setPeers(users => [...users, {
            peerID: payload.from,
            peer,
            userName: 'Participant'
          }]);
        }
      });

      // ICE candidate received
      socketRef.current.on('ice-candidate', payload => {
        const item = peersRef.current.find(p => p.peerID === payload.from);
        if (item) {
          item.peer.signal(payload.candidate);
        }
      });

      // User left
      socketRef.current.on('user-left', payload => {
        const item = peersRef.current.find(p => p.peerID === payload.socketId);
        if (item) {
          item.peer.destroy();
        }
        const peers = peersRef.current.filter(p => p.peerID !== payload.socketId);
        peersRef.current = peers;
        setPeers(peers);
      });
    });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      socketRef.current.disconnect();
    };
  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      socketRef.current.emit('offer', { to: userToSignal, offer: signal });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      socketRef.current.emit('answer', { to: callerID, answer: signal });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  // Screen Sharing Logic
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenTrackRef = useRef(null);
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      screenTrackRef.current = screenTrack;

      // Replace track in local stream and video
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];

        // Replace track for all peers
        peersRef.current.forEach(({ peer }) => {
          peer.replaceTrack(videoTrack, screenTrack, localStream);
        });

        // Update local video preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        // Handle "Stop sharing" from browser UI
        screenTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  };

  const stopScreenShare = () => {
    if (screenTrackRef.current && localStream) {
      const screenTrack = screenTrackRef.current;
      const videoTrack = localStream.getVideoTracks()[0];

      // Replace track for all peers back to camera
      peersRef.current.forEach(({ peer }) => {
        peer.replaceTrack(screenTrack, videoTrack, localStream);
      });

      // Update local video preview back to camera
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      screenTrack.stop();
      screenTrackRef.current = null;
      setIsScreenSharing(false);
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  // Chat Logic
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState('chat'); // 'chat' or 'participants'
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on('chat-message', (message) => {
        setMessages((prev) => [...prev, message]);
        if (!isChatOpen) {
          // Optional: Add unread badge logic here
        }
      });
    }
  }, [socketRef.current]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socketRef.current) {
      const messageData = {
        meetingId,
        message: newMessage,
        userName: user.name,
        timestamp: new Date().toISOString()
      };

      // Emit to server (server will broadcast back to everyone including sender)
      socketRef.current.emit('chat-message', messageData);
      setNewMessage('');
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) setSidebarMode('chat');
  };

  const toggleParticipants = () => {
    if (isChatOpen && sidebarMode === 'participants') {
      setIsChatOpen(false);
    } else {
      setIsChatOpen(true);
      setSidebarMode('participants');
    }
  };

  const leaveMeeting = () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
    }
    navigate('/dashboard');
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    alert('Meeting ID copied to clipboard!');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: 'var(--spacing-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <h3 style={{ margin: 0 }}>Meeting: {meetingId}</h3>
          <button
            onClick={copyMeetingId}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            📋 Copy ID
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{user.name}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{peers.length + 1} Participants</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          flex: 1,
          padding: 'var(--spacing-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: peers.length === 0 && !isChatOpen ? 'minmax(600px, 1fr)' : 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 'var(--spacing-lg)',
            width: '100%',
            maxWidth: '1200px',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto'
          }}>
            {/* Local Video */}
            <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-secondary)', aspectRatio: '16/9' }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                bottom: 'var(--spacing-sm)',
                left: 'var(--spacing-sm)',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                fontSize: '0.9rem'
              }}>
                {user.name} (You) {isScreenSharing && '(Screen)'}
              </div>
              {!isVideoEnabled && !isScreenSharing && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '4rem'
                }}>
                  👤
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {peers.map((peer, index) => (
              <RemoteVideo key={index} peer={peer.peer} userName={peer.userName} />
            ))}

            {/* Waiting Info */}
            {peers.length === 0 && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'var(--spacing-xl)', aspectRatio: '16/9' }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>🎥</div>
                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Waiting for others</h3>
                <p className="text-secondary" style={{ marginBottom: 'var(--spacing-lg)' }}>Share meeting ID to start</p>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'monospace',
                  fontSize: '1.2rem',
                  marginBottom: 'var(--spacing-md)'
                }}>
                  {meetingId}
                </div>
                <button onClick={copyMeetingId} className="btn btn-primary">
                  Copy ID
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Chat & Participants) */}
        <div style={{
          width: isChatOpen ? '350px' : '0',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Sidebar Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => setSidebarMode('chat')}
              style={{
                flex: 1,
                padding: '1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: sidebarMode === 'chat' ? '2px solid var(--primary)' : 'none',
                color: sidebarMode === 'chat' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Chat
            </button>
            <button
              onClick={() => setSidebarMode('participants')}
              style={{
                flex: 1,
                padding: '1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: sidebarMode === 'participants' ? '2px solid var(--primary)' : 'none',
                color: sidebarMode === 'participants' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Participants ({peers.length + 1})
            </button>
            <button onClick={() => setIsChatOpen(false)} className="btn-icon" style={{ width: '40px' }}>✕</button>
          </div>

          {/* Chat Content */}
          {sidebarMode === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {messages.map((msg, index) => (
                  <div key={index} style={{
                    alignSelf: msg.senderId === socketRef.current?.id ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2px', textAlign: msg.senderId === socketRef.current?.id ? 'right' : 'left' }}>
                      {msg.senderId === socketRef.current?.id ? 'You' : msg.userName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{
                      background: msg.senderId === socketRef.current?.id ? 'var(--primary)' : 'var(--bg-tertiary)',
                      color: 'white',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      borderTopRightRadius: msg.senderId === socketRef.current?.id ? '2px' : '12px',
                      borderTopLeftRadius: msg.senderId === socketRef.current?.id ? '12px' : '2px'
                    }}>
                      {msg.message}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={sendMessage} style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Send a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                    ➤
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Participants Content */}
          {sidebarMode === 'participants' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-md)' }}>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.name} (You)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Host</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
                    <span>{isAudioEnabled ? '🎤' : '🔇'}</span>
                    <span>{isVideoEnabled ? '📹' : '📷'}</span>
                  </div>
                </div>
              </div>

              {peers.map((peer, index) => (
                <div key={index} style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {peer.userName ? peer.userName.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{peer.userName || 'Participant'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Participant</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        padding: 'var(--spacing-md)',
        display: 'flex',
        justifyContent: 'center',
        gap: 'var(--spacing-md)'
      }}>
        <button
          onClick={toggleAudio}
          className="btn-icon"
          style={{
            width: '60px',
            height: '60px',
            background: isAudioEnabled ? 'var(--bg-tertiary)' : 'var(--danger)',
            border: `1px solid ${isAudioEnabled ? 'var(--border)' : 'var(--danger)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>

        <button
          onClick={toggleVideo}
          className="btn-icon"
          style={{
            width: '60px',
            height: '60px',
            background: isVideoEnabled ? 'var(--bg-tertiary)' : 'var(--danger)',
            border: `1px solid ${isVideoEnabled ? 'var(--border)' : 'var(--danger)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? '📹' : '📷'}
        </button>

        <button
          onClick={toggleScreenShare}
          className="btn-icon"
          style={{
            width: '60px',
            height: '60px',
            background: isScreenSharing ? 'var(--primary)' : 'var(--bg-tertiary)',
            border: `1px solid ${isScreenSharing ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          💻
        </button>

        <button
          onClick={toggleChat}
          className="btn-icon"
          style={{
            width: '60px',
            height: '60px',
            background: isChatOpen && sidebarMode === 'chat' ? 'var(--primary)' : 'var(--bg-tertiary)',
            border: `1px solid ${isChatOpen && sidebarMode === 'chat' ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
          title="Chat"
        >
          💬
        </button>

        <button
          onClick={toggleParticipants}
          className="btn-icon"
          style={{
            width: '60px',
            height: '60px',
            background: isChatOpen && sidebarMode === 'participants' ? 'var(--primary)' : 'var(--bg-tertiary)',
            border: `1px solid ${isChatOpen && sidebarMode === 'participants' ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
          title="Participants"
        >
          👥
        </button>

        <button
          onClick={leaveMeeting}
          className="btn-icon"
          style={{
            width: '60px',
            height: '60px',
            background: 'var(--danger)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
          title="Leave meeting"
        >
          📞
        </button>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('token', userData.token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/meeting/:meetingId"
          element={user ? <MeetingRoom user={user} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
