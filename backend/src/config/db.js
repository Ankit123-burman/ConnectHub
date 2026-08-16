const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

dotenv.config({
    path: path.join(__dirname, '../../.env')
});

dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    try {
        const mongoUri = process.env.DB_URI;

        console.log('DB_URI exists:', !!mongoUri);

        if (!mongoUri) {
            throw new Error('DB_URI is undefined');
        }

        await mongoose.connect(mongoUri);

        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;