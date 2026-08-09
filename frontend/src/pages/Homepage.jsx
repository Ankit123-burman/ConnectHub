import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../provider/Socket.jsx';
import { Video, Users, Lock, ArrowRight } from 'lucide-react';

// Same-origin by default — Vite proxies /api to the backend (see
// vite.config.js). Override with VITE_API_URL only if your backend lives on
// a genuinely different host.
const API_URL = import.meta.env.VITE_API_URL || '';

const Homepage = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [mode, setMode] = useState('join'); // 'join' | 'create'
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    try {
      const res = await fetch(`${API_URL}/api/create-room`);
      const data = await res.json();
      setRoomId(data.roomId);
      setMode('create');
    } catch (e) {
      setError('Could not reach server. Is the backend running?');
    }
  };

  const handleEnter = () => {
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
    // Actual join-room emit happens once inside Room.jsx (after mounting
    // and grabbing local media), so we just pass state along via the URL
    // and sessionStorage.
    sessionStorage.setItem('emailId', name.trim());
    sessionStorage.setItem('roomPassword', password);
    navigate(`/room/${roomId.trim()}`);
  };

  return (
    <div className="homepage">
      <div className="homepage__card">
        <div className="brand">
          <Video size={28} strokeWidth={2.2} />
          <span>ConnectHub</span>
        </div>
        <p className="homepage__subtitle">Group video calls, right in your browser.</p>

        <div className="mode-toggle">
          <button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>
            Join Room
          </button>
          <button className={mode === 'create' ? 'active' : ''} onClick={handleCreateRoom}>
            Create Room
          </button>
        </div>

        <div className="form-group">
          <label>Your name</label>
          <input
            type="text"
            placeholder="e.g. Aditi Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Room code</label>
          <input
            type="text"
            placeholder="e.g. 8f3a2c1d"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={mode === 'create' && !!roomId}
          />
        </div>

        <div className="form-group">
          <label><Lock size={13} /> Room password (optional)</label>
          <input
            type="password"
            placeholder="Leave blank for no password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button className="btn-primary" onClick={handleEnter} disabled={loading}>
          {loading ? 'Connecting…' : 'Enter Room'} <ArrowRight size={16} />
        </button>

        <div className="homepage__meta">
          <Users size={13} /> Up to 6 participants per room
        </div>
      </div>
    </div>
  );
};

export default Homepage;
