import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';
import AuthCallback from './pages/AuthCallback';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    // Save token
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    }

    // Remove token before storing user
    const { token, ...userWithoutToken } = userData;

    // Save user properly
    localStorage.setItem('user', JSON.stringify(userWithoutToken));

    // Update state
    setUser(userWithoutToken);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading SecureCall...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Auth Routes */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />} 
          />
          <Route path="/auth/callback" element={<AuthCallback onLogin={handleLogin} />} />

          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/meeting/:meetingId" 
            element={user ? <MeetingRoom user={user} /> : <Navigate to="/login" />} 
          />

          {/* Default Route */}
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
