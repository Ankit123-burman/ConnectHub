import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../provider/Socket.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Video, Users, Lock, ArrowRight, LogOut, Copy, Check, Sparkles, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const Homepage = () => {
  const { socket } = useSocket();
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('join'); // 'join' | 'create'
  const [name, setName] = useState(user?.name || '');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Update name if user loads after mount
  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [user, name]);

  useEffect(() => {
    if (!socket) return;

    const onJoinError = ({ message }) => {
      setLoading(false);
      setError(message || 'Could not join room');
    };

    socket.on('join-error', onJoinError);
    return () => socket.off('join-error', onJoinError);
  }, [socket]);

  const handleCreateRoom = async () => {
    setError('');
    setCreatingRoom(true);
    try {
      const res = await fetch(`${API_URL}/api/room/create-room`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      const data = await res.json();
      if (data.success && data.roomId) {
        setRoomId(data.roomId);
        setMode('create');
      } else {
        setError(data.message || 'Could not create a room. Please try again.');
      }
    } catch (e) {
      console.error('Create room error:', e);
      setError('Could not reach server. Is the backend running?');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnter = async () => {
    setError('');
    if (!name.trim()) {
      setError('Enter your name first');
      return;
    }
    if (!roomId.trim()) {
      setError('Enter or generate a room code');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/room/check-room`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: roomId.trim(), password }),
      });

      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Could not join this room.');
        return;
      }

      sessionStorage.setItem('emailId', name.trim());
      sessionStorage.setItem('roomPassword', password);
      navigate(`/room/${roomId.trim()}`);
    } catch (e) {
      console.error('Room check error:', e);
      setError('Could not reach server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (userName) => {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="homepage-wrapper">
      {/* Top Navbar */}
      <header className="home-navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-icon">
            <Video size={20} />
          </div>
          <span className="navbar-brand-name">ConnectHub</span>
        </div>

        <div className="navbar-user-section">
          <div className="navbar-user-info">
            <div className="navbar-avatar">{getInitials(user?.name)}</div>
            <div className="navbar-user-details">
              <span className="navbar-user-name">{user?.name || 'User'}</span>
              <span className="navbar-user-email">{user?.email || ''}</span>
            </div>
          </div>

          <button
            className="navbar-logout-btn"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="homepage">
        <div className="homepage__card">
          <div className="brand">
            <Video size={28} strokeWidth={2.2} />
            <span>ConnectHub</span>
          </div>
          <p className="homepage__subtitle">Group video calls, right in your browser.</p>

          <div className="auth-badge-banner">
            <ShieldCheck size={14} />
            <span>Authenticated Session &bull; {user?.email}</span>
          </div>

          <div className="mode-toggle">
            <button
              className={mode === 'join' ? 'active' : ''}
              onClick={() => {
                setMode('join');
                setError('');
              }}
            >
              Join Room
            </button>
            <button
              className={mode === 'create' ? 'active' : ''}
              onClick={handleCreateRoom}
              disabled={creatingRoom}
            >
              {creatingRoom ? (
                'Creating…'
              ) : (
                <>
                  <Sparkles size={13} style={{ marginRight: 4, display: 'inline' }} />
                  Create Room
                </>
              )}
            </button>
          </div>

          <div className="form-group">
            <label>Your display name</label>
            <input
              type="text"
              placeholder="e.g. Aditi Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>Room code</label>
              {mode === 'create' && roomId && (
                <button
                  type="button"
                  className="copy-btn-inline"
                  onClick={handleCopyCode}
                  title="Copy room code"
                >
                  {copied ? (
                    <>
                      <Check size={12} color="#3ecf8e" />
                      <span style={{ color: '#3ecf8e' }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. 8f3a2c1d"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={mode === 'create' && !!roomId}
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={13} /> Room password (optional)
            </label>
            <input
              type="password"
              placeholder="Leave blank for no password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button className="btn-primary" onClick={handleEnter} disabled={loading || creatingRoom}>
            {loading ? 'Connecting…' : mode === 'create' ? 'Enter Created Room' : 'Enter Room'}{' '}
            <ArrowRight size={16} />
          </button>

          <div className="homepage__meta">
            <Users size={13} /> Up to 6 participants per encrypted room
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
