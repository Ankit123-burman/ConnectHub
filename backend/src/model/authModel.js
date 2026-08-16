const { Timestamp } = require('mongodb');
const mongoose = require('mongoose');

const authSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

    },
    { Timestamp: true }
)

const User = mongoose.model('User',authSchema)

module.exports = User