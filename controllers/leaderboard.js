'use strict';

const User = require('../models/username');
const admin = require('firebase-admin');
const client = require('./redisClient');

const sortFields = {
    daily: 'dailyScore',
    weekly: 'weeklyScore',
    monthly: 'monthlyScore',
    global: 'globalScore'
};

const fetchLeaderboard = async (filter) => {
    try {
        return await User.find({})
            .sort({ [sortFields[filter]]: -1 })
            .limit(10)
            .exec();
    } catch (error) {
        console.error(`Error fetching leaderboard for filter ${filter}:`, error);
        throw error;
    }
};

const cacheLeaderboard = async (filter, leaderboard) => {
    const cacheKey = `leaderboard:${filter}:top10`;
    try {
        await client.set(cacheKey, JSON.stringify(leaderboard), 'EX', 3600);
    } catch (error) {
        console.error(`Error caching leaderboard for filter ${filter}:`, error);
        throw error;
    }
};

const updateLeaderboardCache = async () => {
    const filters = ['daily', 'weekly', 'monthly', 'global'];
    for (const filter of filters) {
        const leaderboard = await fetchLeaderboard(filter);
        await cacheLeaderboard(filter, leaderboard);
    }
    console.log('Leaderboard cache updated');
};

const getTimeUntilNextHour = () => {
    const now = new Date();
    const nextHour = new Date();
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour - now;
};

updateLeaderboardCache();
setTimeout(function run() {
    updateLeaderboardCache();
    setTimeout(run, 3600000);
}, getTimeUntilNextHour());

const leaderboardController = {
    getLeaderboardAndUserRank: async (req, res) => {
        const filter = req.query.filter || 'global';
        const cacheKey = `leaderboard:${filter}:top10`;

        try {
            const data = await client.get(cacheKey);
            if (!data) {
                return res.status(404).send({ status: 'error', message: 'Leaderboard not available' });
            }

            const leaderboard = JSON.parse(data);

            let userRank = null;
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                try {
                    const decodedToken = await admin.auth().verifyIdToken(token);
                    const userId = decodedToken.uid;
                    if (userId) {
                        const user = await User.findOne({ firebaseId: userId });
                        if (user) {
                            const rank = await User.countDocuments({ [sortFields[filter]]: { $gt: user[sortFields[filter]] } }) + 1;
                            userRank = { ...user.toObject(), rank };
                        }
                    }
                } catch (err) {
                    console.error('Invalid token:', err);
                }
            }

            res.status(200).send({ status: 'success', leaderboard, userRank });
        } catch (error) {
            console.error('Error in getLeaderboardAndUserRank:', error);
            return res.status(500).send({ status: 'error', message: 'Internal server error' });
        }
    }
};

module.exports = leaderboardController;
