const express = require('express');
const cors = require('cors');

const healthRoute = require('./src/route/healthRoute');
const roomRoute = require('./src/route/roomRoute');
const authRoute = require('./src/route/authRoute');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/room', roomRoute);
app.use('/api', roomRoute); // Also mount at /api for convenience (/api/create-room)
app.use('/health', healthRoute);

module.exports = app;