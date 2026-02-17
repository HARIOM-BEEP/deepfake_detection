import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingAPI } from '../services/api';
import './Dashboard.css';

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
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-content container">
          <h2 className="navbar-brand">SecureCall</h2>
          <div className="navbar-actions">
            <span className="user-name">{user.name}</span>
            <button onClick={onLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content container">
        <div className="welcome-section">
          <h1 className="fade-in">Welcome, {user.name}!</h1>
          <p className="text-secondary">Start a secure video call with AI-powered deepfake detection</p>
        </div>

        {error && (
          <div className="alert alert-danger fade-in">
            {error}
          </div>
        )}

        <div className="meeting-grid">
          <div className="card card-glass fade-in">
            <div className="card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                <polyline points="17 2 12 7 7 2"/>
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
            <div className="card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
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

        <div className="features-section">
          <h3 className="text-center mb-lg">Platform Features</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h4>Secure Encryption</h4>
              <p className="text-secondary">End-to-end encrypted video calls</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h4>AI Detection</h4>
              <p className="text-secondary">Real-time deepfake detection</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📹</div>
              <h4>HD Video</h4>
              <p className="text-secondary">Crystal clear video quality</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h4>Low Latency</h4>
              <p className="text-secondary">Real-time communication</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
