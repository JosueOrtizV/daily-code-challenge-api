'use strict';

const express = require('express');
const ExerciseController = require('../controllers/exercise');
const checkCodeController = require('../controllers/checkCode');
const moreExercisesController = require('../controllers/moreExercises');
const verifyUser = require('../middleware/verifyUser');

const router = express.Router();

router.get('/getDailyChallenge', ExerciseController.getDailyChallenge);
router.post('/checkCode', verifyUser, checkCodeController.checkCode);
router.post('/getMoreChallenges', verifyUser, moreExercisesController.getMoreChallenges);

module.exports = router;
