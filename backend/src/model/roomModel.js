const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            unique: true,
        },

        password: {
            type: String,
            default: '',
        },

        users: [
            {
                socketId: String,
                emailId: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Room', roomSchema);