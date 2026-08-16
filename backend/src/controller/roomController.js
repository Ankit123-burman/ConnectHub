const roomService = require('../../services/roomServices');

const createRoom = (req, res) => {
    try {

        const roomId = roomService.createRoom();

        res.status(201).json({
            success: true,
            roomId,
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    createRoom,
};