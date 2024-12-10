'use strict';

const checkCodeModel = require('../models/checkCode');
const User = require('../models/username');
const Exercise = require('../models/exercise');
const path = require('path');
const fs = require('fs');
const { fromZonedTime } = require('date-fns-tz');
const client = require('./redisClient');

const messages = {
    en: {
        completed: "You have already completed today's exercise.",
        noChallenge: "No daily challenge found for today.",
        noExercise: "No exercise found for the selected difficulty.",
        invalidCode: "Invalid code. No points awarded.",
        invalidResponse: "Invalid response from the API",
        parseError: "Error parsing response from API",
        serverError: "Error checking the code"
    },
    es: {
        completed: "Ya has completado el ejercicio de hoy.",
        noChallenge: "No se encontró el desafío diario para hoy.",
        noExercise: "No se encontró el ejercicio para la dificultad seleccionada",
        invalidCode: "Código inválido. No se otorgan puntos.",
        invalidResponse: "Respuesta inválida de la API",
        parseError: "Error al analizar la respuesta de la API",
        serverError: "Error al checar el código"
    }
};

const updateCache = async (userId, user) => {
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
    await client.set(userId, JSON.stringify(updatedUserData), {
        EX: 21600,
    });
    console.log('Cache updated for user:', updatedUserData);
};

const checkCodeController = {
    checkCode: async (req, res) => {
        try {
            const { username, difficulty, userCode, language } = req.body;
            const todayUTC = new Date();
            const offset = todayUTC.getTimezoneOffset();
            const todayLocal = new Date(todayUTC.getTime() - (offset * 60 * 1000)).toISOString().slice(0, 10);

            const user = await User.findOne({ username });
            if (user && user.lastCompletedExercise === todayLocal) {
                return res.status(400).send({ status: 'error', message: messages[language].completed });
            }

            let challenge;
            const localPath = path.join(__dirname, '../local/exercise_of_the_day.json');
            if (fs.existsSync(localPath)) {
                const data = fs.readFileSync(localPath, 'utf8');
                challenge = JSON.parse(data);
            } else {
                challenge = await Exercise.findOne({ date: todayLocal });
            }

            if (!challenge) {
                return res.status(404).send({ status: 'error', message: messages[language].noChallenge });
            }

            const exerciseTitleEN = challenge.exercise[difficulty].en.Title;
            const exerciseTitleES = challenge.exercise[difficulty].es.Title;
            const exercise = language === 'es' ? challenge.exercise[difficulty].es.Exercise : challenge.exercise[difficulty].en.Exercise;
            const lang = language === 'es' ? 'spanish' : 'english';
            if (!exercise) {
                return res.status(404).send({ status: 'error', message: messages[language].noExercise });
            }

            const prompt = `
                Here is a programming exercise with ${difficulty} difficulty:
                ${exerciseTitleEN}
                ${exercise}

                This is the user code for the exercise:
                ${userCode}

                Please review the user's code and provide feedback on what to improve. It also assigns a score from 0 to 10 based on code quality.
                If the user code is not related to the exercise or the code is not a valid implementation please return score 0
                Please write the response using ${lang} language
            `;

            const result = await checkCodeModel.generateContent(prompt);
            const textResponse = await result.response.text();

            if (!textResponse) {
                return res.status(500).send({ status: 'error', message: messages[language].invalidResponse });
            }

            let evaluation;
            try {
                evaluation = JSON.parse(textResponse);
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                return res.status(500).send({ status: 'error', message: messages[language].parseError });
            }

            const feedback = evaluation[0].Response;
            let baseScore = evaluation[0].Score;

            if (baseScore <= 0) {
                return res.status(400).send({ 
                    status: 'error', 
                    message: messages[language].invalidCode,                 
                    feedback: feedback,
                    score: baseScore
                });
            }

            const finalScore = await checkCodeController.calculateScore(baseScore, difficulty);

            user.dailyScore += finalScore;
            user.weeklyScore += finalScore;
            user.monthlyScore += finalScore;
            user.globalScore += finalScore;
            user.dailyScore = parseFloat(user.dailyScore.toFixed(2));
            user.weeklyScore = parseFloat(user.weeklyScore.toFixed(2));
            user.monthlyScore = parseFloat(user.monthlyScore.toFixed(2));
            user.globalScore = parseFloat(user.globalScore.toFixed(2));
            user.lastCompletedExercise = todayLocal;

            const nowLocal = new Date();
            const nowUTC = fromZonedTime(nowLocal, 'America/Mexico_City');
            const activityStatusEN = 'Completed';
            const activityStatusES = 'Completado';
            if (user.recentActivity.length >= 2) {
                user.recentActivity.shift();
            }
            user.recentActivity.push({
                date: nowUTC,
                challengeEN: exerciseTitleEN,
                challengeES: exerciseTitleES,
                statusEN: activityStatusEN,
                statusES: activityStatusES,
                points: finalScore,
                feedback
            });

            await user.save();
            console.log('User data and recent activity updated:', user);

            await updateCache(user.firebaseId, user);

            return res.status(200).send({
                status: 'success',
                feedback: feedback,
                score: user.dailyScore,
                globalScore: user.globalScore
            });
        } catch (error) {
            console.error('Error in checkCode:', error);
            return res.status(500).send({ status: 'error', message: messages[req.body.language].serverError });
        }
    },

    calculateScore: async (baseScore, difficulty) => {
        const difficultyMultipliers = {
            easy: 1.0,
            intermediate: 1.5,
            hard: 2.0,
            extreme: 2.5
        };
        const difficultyMultiplier = difficultyMultipliers[difficulty];
        const normalizedScore = (baseScore * difficultyMultiplier) / 2.5;
        return Math.min(normalizedScore, 10);
    }
};

module.exports = checkCodeController;
