'use strict';

const User = require('../models/username');
const leaderboardController = require('./leaderboard');
const schedule = require('node-schedule');

const resetScores = async (field, message) => {
    try {
        await User.updateMany({}, { [field]: 0 });
        console.log(message);
        await leaderboardController.updateLeaderboardCache();
    } catch (error) {
        console.error(`Error resetting ${field} scores:`, error);
    }
};

const resetDailyScores = async () => {
    await resetScores('dailyScore', 'Daily scores have been reset.');
};

const resetWeeklyScores = async () => {
    await resetScores('weeklyScore', 'Weekly scores have been reset.');
};

const resetMonthlyScores = async () => {
    await resetScores('monthlyScore', 'Monthly scores have been reset.');
};

// Schedule daily score reset at midnight
schedule.scheduleJob('0 0 * * *', resetDailyScores);

// Schedule weekly score reset every Sunday at 23:59
schedule.scheduleJob({ dayOfWeek: 0, hour: 23, minute: 59 }, resetWeeklyScores);

// Schedule monthly score reset on the last day of each month at 23:59
schedule.scheduleJob('59 23 28-31 * *', async () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (today.getDate() === lastDay) {
        await resetMonthlyScores();
    }
});

module.exports = { resetDailyScores, resetWeeklyScores, resetMonthlyScores };
