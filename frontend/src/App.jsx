import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import Homepage from './pages/Homepage.jsx';
import Room from './pages/Room.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { SocketProvider } from './provider/Socket.jsx';
import { PeerProvider } from './provider/Peer.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SocketProvider>
              <PeerProvider>
                <Homepage />
              </PeerProvider>
            </SocketProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <ProtectedRoute>
            <SocketProvider>
              <PeerProvider>
                <Room />
              </PeerProvider>
            </SocketProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
