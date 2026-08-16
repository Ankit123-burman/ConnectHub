const authSchema = require('../model/authModel.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ========================
// REGISTER
// ========================
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        // Check existing user
        const existingUser = await authSchema.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = await authSchema.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        // Create JWT token for immediate sign-in
        const token = jwt.sign(
            {
                userId: newUser._id,
                email: newUser.email
            },
            process.env.JWT_SECRET || '12345678900',
            {
                expiresIn: '7d'
            }
        );

        // Response
        return res.status(201).json({
            status: 201,
            message: 'Registered successfully',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            message: 'Server error during registration'
        });
    }
};

// ========================
// LOGIN
// ========================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        // Find user
        const find = await authSchema.findOne({ email: email.toLowerCase().trim() });

        if (!find) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Compare password
        const match = await bcrypt.compare(
            password,
            find.password
        );

        if (!match) {
            return res.status(401).json({
                message: 'Wrong email or password'
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: find._id,
                email: find.email
            },
            process.env.JWT_SECRET || '12345678900',
            {
                expiresIn: '7d'
            }
        );

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: find._id,
                name: find.name,
                email: find.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            message: 'Server error during login'
        });
    }
};

// ========================
// GET CURRENT USER (/me)
// ========================
const getMe = async (req, res) => {
    try {
        const user = await authSchema.findById(req.user.userId).select('-password');

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({
            message: 'Server error retrieving user profile'
        });
    }
};

module.exports = {
    register,
    login,
    getMe
};