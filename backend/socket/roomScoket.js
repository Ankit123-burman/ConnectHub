const roomService = require('../services/roomServices');

const registerRoomSocket = (io) => {

    io.on('connection', (socket) => {

        console.log('New connection:', socket.id);

        // JOIN ROOM
        socket.on('join-room', (data) => {

            const {
                roomId,
                emailId,
                password,
            } = data;

            try {

                const result = roomService.joinRoom({
                    roomId,
                    emailId,
                    password,
                    socketId: socket.id,
                });

                socket.data.roomId = roomId;
                socket.data.emailId = emailId;

                socket.join(roomId);

                socket.emit('joined-room', {
                    roomId,
                    users: result.existingUsers,
                });

                socket.to(roomId).emit('user-joined', {
                    socketId: socket.id,
                    emailId,
                });

                console.log(
                    `${emailId} joined ${roomId}`
                );

            } catch (error) {

                socket.emit('join-error', {
                    message: error.message,
                });
            }
        });


        // WEBRTC SIGNAL
        socket.on('signal', ({ to, type, data, emailId }) => {

            if (!to) return;

            io.to(to).emit('signal', {
                from: socket.id,
                type,
                data,
                emailId,
            });
        });


        // CHAT
        socket.on('chat-message', ({ message }) => {

            const roomId = socket.data.roomId;
            const emailId = socket.data.emailId;

            if (!roomId || !message) return;

            const payload = {
                emailId,
                message,
                time: Date.now(),
                socketId: socket.id,
            };

            socket.to(roomId).emit(
                'chat-message',
                payload
            );
        });


        // LEAVE
        socket.on('leave-room', () => {
            handleLeave(socket, io);
        });


        // DISCONNECT
        socket.on('disconnect', () => {
            handleLeave(socket, io);
        });

    });
};


const handleLeave = (socket, io) => {

    const roomId = socket.data.roomId;

    if (!roomId) return;

    const user = roomService.leaveRoom(
        roomId,
        socket.id
    );

    if (!user) return;

    socket.to(roomId).emit('user-left', {
        socketId: socket.id,
        emailId: user.emailId,
    });

    socket.leave(roomId);

    socket.data.roomId = null;
    socket.data.emailId = null;

    console.log(
        `${user.emailId} left room ${roomId}`
    );
};


module.exports = registerRoomSocket;