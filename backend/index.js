const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Single HTTP server shared by Express + Socket.IO (simplifies HTTPS setup later,
// since you only need to wrap ONE server with a cert instead of two).
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const MAX_PARTICIPANTS = 6;

// roomId -> { password: string, users: Map(socketId -> { emailId }) }
const rooms = new Map();

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Helper endpoint so the frontend can generate a fresh room code
app.get('/api/create-room', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  res.json({ roomId });
});

io.on('connection', (socket) => {
  console.log('new connection', socket.id);

  socket.on('join-room', ({ roomId, emailId, password }) => {
    if (!roomId || !emailId) {
      socket.emit('join-error', { message: 'roomId and emailId are required' });
      return;
    }

    let room = rooms.get(roomId);

    if (!room) {
      // First person to join a room sets its password (can be empty string = no password)
      room = { password: password || '', users: new Map() };
      rooms.set(roomId, room);
    } else if ((room.password || '') !== (password || '')) {
      socket.emit('join-error', { message: 'Incorrect room password' });
      return;
    }

    if (room.users.size >= MAX_PARTICIPANTS) {
      socket.emit('join-error', { message: `Room is full (max ${MAX_PARTICIPANTS} participants)` });
      return;
    }

    // Snapshot of everyone already in the room, sent ONLY to the new joiner.
    // The new joiner is responsible for initiating offers to each of these —
    // this one-directional rule avoids "glare" (both sides creating offers at once).
    const existingUsers = Array.from(room.users.entries()).map(([socketId, u]) => ({
      socketId,
      emailId: u.emailId,
    }));

    room.users.set(socket.id, { emailId });
    socket.data.roomId = roomId;
    socket.data.emailId = emailId;
    socket.join(roomId);

    socket.emit('joined-room', { roomId, users: existingUsers });
    socket.to(roomId).emit('user-joined', { socketId: socket.id, emailId });

    console.log(`${emailId} joined room "${roomId}" (${room.users.size}/${MAX_PARTICIPANTS})`);
  });

  // Generic signaling relay used for offer / answer / ice-candidate.
  // Mesh calls need per-pair signaling, so every message is targeted at
  // one specific socket ("to") rather than broadcast to the whole room.
  socket.on('signal', ({ to, type, data, emailId }) => {
    if (!to) return;
    io.to(to).emit('signal', { from: socket.id, type, data, emailId });
  });

  socket.on('chat-message', ({ message }) => {
    const roomId = socket.data.roomId;
    const emailId = socket.data.emailId;
    if (!roomId || !message) return;
    const payload = { emailId, message, time: Date.now(), socketId: socket.id };
    socket.to(roomId).emit('chat-message', payload);
  });

  socket.on('leave-room', () => handleLeave(socket));
  socket.on('disconnect', () => handleLeave(socket));
});

function handleLeave(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.users.delete(socket.id);
  socket.to(roomId).emit('user-left', { socketId: socket.id, emailId: socket.data.emailId });

  if (room.users.size === 0) {
    rooms.delete(roomId);
    console.log(`Room "${roomId}" closed (empty)`);
  }

  socket.data.roomId = null;
  socket.leave(roomId);
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signaling server running on port ${PORT}`);
});
