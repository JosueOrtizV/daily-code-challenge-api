'use strict';
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    firebaseId: { 
        type: String, 
        required: true 
    },
    dailyScore: {
        type: Number,
        default: 0.0 
    },
    weeklyScore: {
        type: Number,
        default: 0.0
    },
    monthlyScore: {
        type: Number,
        default: 0.0
    },
    globalScore: {
        type: Number,
        default: 0.0
    },
    lastCompletedExercise: {
        type: String,
    },
    recentActivity: [{
        date: { type: Date, default: Date.now },
        challengeEN: String,
        challengeES: String,
        statusEN: String,
        statusES: String,
        points: { type: Number, default: 0.0 },
        feedback: String
    }],
    lastUsernameChange: { 
        type: Date, 
        default: Date.now 
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema, 'users');

module.exports = User;
