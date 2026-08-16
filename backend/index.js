require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./src/config/db');
const roomSocket = require('./socket/roomScoket');

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

roomSocket(io);

const PORT = process.env.PORT || 4000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});