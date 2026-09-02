const { v4: uuidv4 } = require('uuid');

const MAX_PARTICIPANTS = 6;

const rooms = new Map();

const createRoom = () => {
    const roomId = uuidv4().slice(0, 8);

    rooms.set(roomId, {
        password: '',
        users: new Map(),
    });

    return roomId;
};

const getRoom = (roomId) => {
    return rooms.get(roomId);
};

const joinRoom = ({ roomId, emailId, password, socketId }) => {

    if (!roomId || !emailId) {
        throw new Error('roomId and emailId are required');
    }

    let room = rooms.get(roomId);

    if (!room) {
        room = {
            password: password || '',
            users: new Map(),
        };

        rooms.set(roomId, room);
    }

    if ((room.password || '') !== (password || '')) {
        throw new Error('Incorrect room password');
    }

    if (room.users.size >= MAX_PARTICIPANTS) {
        throw new Error(
            `Room is full (max ${MAX_PARTICIPANTS} participants)`
        );
    }

    const existingUsers = Array.from(room.users.entries()).map(
        ([socketId, user]) => ({
            socketId,
            emailId: user.emailId,
        })
    );

    room.users.set(socketId, {
        emailId,
    });

    return {
        roomId,
        existingUsers,
        participantCount: room.users.size,
    };
};

const leaveRoom = (roomId, socketId) => {

    const room = rooms.get(roomId);

    if (!room) {
        return null;
    }

    const user = room.users.get(socketId);

    room.users.delete(socketId);

    if (room.users.size === 0) {
        rooms.delete(roomId);
    }

    return user;
};

module.exports = {
    createRoom,
    getRoom,
    joinRoom,
    leaveRoom,
};