'use strict';

const express = require('express');
const router = express.Router();
const verifyUser = require('../middleware/verifyUser');
const leaderboardController = require('../controllers/leaderboard');

// Route to get the leaderboard and user rank
router.get('/leaderboardAndUserRank', leaderboardController.getLeaderboardAndUserRank);

module.exports = router;
