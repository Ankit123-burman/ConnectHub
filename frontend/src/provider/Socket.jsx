import React, { createContext, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

// Defaults to the SAME origin the page was loaded from (e.g. your ngrok
// URL), and relies on the Vite dev server proxy (see vite.config.js) to
// forward /socket.io traffic to the backend on localhost:4000. This means
// you only need ONE public URL/tunnel — handy since ngrok's free plan only
// allows one tunnel at a time. Set VITE_SOCKET_URL in a .env file only if
// you specifically want to point at a backend on a different host.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const SocketProvider = ({ children }) => {
  const socket = useMemo(
    () =>
      io(SOCKET_URL, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
      }),
    []
  );

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};
