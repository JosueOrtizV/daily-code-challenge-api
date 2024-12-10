'use strict';
const User = require('../models/username');
const admin = require('firebase-admin');
const client = require('./redisClient');

const userController = {
    checkUsernameAvailability: async (req, res) => {
        const { username } = req.body;

        if (!username) {
            return res.status(400).send({ status: 'error', message: 'Username is required' });
        }

        try {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(200).send({ available: false });
            } else {
                return res.status(200).send({ available: true });
            }
        } catch (error) {
            console.error('Error checking username availability:', error);
            return res.status(500).send({ status: 'error', message: 'Internal server error', error: error.message });
        }
    },

    saveOrUpdateUser: async (req, res) => {
        const { username, token } = req.body;

        if (!username || !token) {
            return res.status(400).send({ status: 'error', message: 'Username and token are required' });
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            if (!decodedToken) {
                return res.status(401).send({ status: 'error', message: 'Invalid token' });
            }

            let user = await User.findOne({ firebaseId: decodedToken.uid });
            if (user) {
                return res.status(200).send({ status: 'success', message: 'User already exists', user });
            } else {
                let existingUser = await User.findOne({ username });
                if (existingUser) {
                    username += Math.floor(Math.random() * 1000);
                }

                user = new User({ username, firebaseId: decodedToken.uid });
                await user.save();
                return res.status(201).send({ status: 'success', message: 'User saved successfully', user });
            }
        } catch (error) {
            console.error('Error saving user:', error);
            return res.status(500).send({ status: 'error', message: 'Internal server error', error: error.message });
        }
    },

    updateUsername: async (req, res) => {
        const { oldUsername, newUsername, token } = req.body;

        if (!token) {
            return res.status(400).send({ status: 'error', code: 'TOKEN_REQUIRED' });
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            if (!decodedToken) {
                return res.status(401).send({ status: 'error', code: 'INVALID_TOKEN' });
            }
            
            const user = await User.findOne({ username: oldUsername, firebaseId: decodedToken.uid });
            if (!user) {
                return res.status(404).send({ status: 'error', code: 'USER_NOT_FOUND' });
            }

            const lastChangeDate = user.lastUsernameChange;
            const currentDate = new Date();
            const diffTime = Math.abs(currentDate.getTime() - new Date(lastChangeDate).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 10) {
                return res.status(400).send({ status: 'error', code: 'DAYS_REMAINING', days: 10 - diffDays });
            }

            user.username = newUsername;
            user.lastUsernameChange = currentDate;
            await user.save();

            await client.del(decodedToken.uid);

            const updatedUserData = {
                username: user.username,
                lastCompletedExercise: user.lastCompletedExercise,
                scores: {
                    dailyScore: user.dailyScore,
                    weeklyScore: user.weeklyScore,
                    monthlyScore: user.monthlyScore,
                    globalScore: user.globalScore
                },
                recentActivity: user.recentActivity
            };
            await client.set(decodedToken.uid, JSON.stringify(updatedUserData), {
                EX: 21600,
            });

            res.status(200).send({ status: 'success', code: 'USERNAME_UPDATED', oldUsername, newUsername });
        } catch (error) {
            console.error('Error updating username:', error);
            return res.status(500).send({ status: 'error', code: 'UNKNOWN_ERROR', error: error.message });
        }
    },

    getUserData: async (req, res) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(400).send({ status: 'error', message: 'Token is required' });
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            const userId = decodedToken.uid;
            
            const cachedData = await client.get(userId);
            if (cachedData) {
                return res.status(200).send(JSON.parse(cachedData));
            } else {
                const user = await User.findOne({ firebaseId: userId });
                if (user) {
                    const userData = {
                        username: user.username,
                        lastCompletedExercise: user.lastCompletedExercise,
                        scores: {
                            dailyScore: user.dailyScore,
                            weeklyScore: user.weeklyScore,
                            monthlyScore: user.monthlyScore,
                            globalScore: user.globalScore
                        },
                        recentActivity: user.recentActivity
                    };

                    await client.set(userId, JSON.stringify(userData), {
                        EX: 21600,
                    });
                    
                    return res.status(200).send(userData);
                } else {
                    return res.status(404).send({ status: 'error', message: 'User not found' });
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            return res.status(500).send({ status: 'error', message: 'Internal server error', error: error.message });
        }
    },

    createCustomToken: async (req, res) => {
        const { uid, username } = req.body;

        if (!uid || !username) {
            return res.status(400).send({ status: 'error', message: 'UID and username are required' });
        }

        try {
            const user = await User.findOne({ firebaseId: uid });
            if (!user || user.username !== username) {
                return res.status(401).send({ status: 'error', message: 'Invalid UID or username' });
            }

            const customToken = await admin.auth().createCustomToken(uid);
            return res.status(200).send({ customToken });
        } catch (error) {
            console.error('Error creating custom token:', error);
            return res.status(500).send({ status: 'error', message: 'Internal server error', error: error.message });
        }
    },

    checkUsernameAndUid: async (req, res) => {
        const { username, uid } = req.body;

        if (!username || !uid) {
            return res.status(400).send({ status: 'error', message: 'Username and UID are required' });
        }

        try {
            const user = await User.findOne({ firebaseId: uid });
            if (!user || user.username !== username) {
                return res.status(401).send({ status: 'error', message: 'Invalid username or UID' });
            }

            return res.status(200).send({ valid: true });
        } catch (error) {
            console.error('Error checking username and UID:', error);
            return res.status(500).send({ status: 'error', message: 'Internal server error', error: error.message });
        }
    },
};

module.exports = userController;
