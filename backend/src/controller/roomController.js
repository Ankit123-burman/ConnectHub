const roomService = require('../../services/roomServices');

const createRoom = (req, res) => {
    try {

        const roomId = roomService.createRoom({
            password: req.body?.password || '',
        });

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

const checkRoom = (req, res) => {
    try {
        const result = roomService.checkRoom(req.body);

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    createRoom,
    checkRoom,
};