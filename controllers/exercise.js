'use strict';

const model = require('../models/excercisepool');
require('./scoreReset');
require('./archiveOldExercises');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const Exercise = require('../models/exercise');

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 60000;

cron.schedule('0 0 * * *', async () => {
    try {
        await controller.getDailyChallenge();
        console.log('Daily challenge retrieved and stored in the database.');
    } catch (error) {
        console.error('Error retrieving daily challenge:', error);
    }
});

const controller = {

    determineTheme: (date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        if (month === 2) return 'Valentines Day';
        if (month === 10 && day >= 15) return 'Halloween';
        if (month === 11 && (day === 1 || day === 2)) return 'Day of the Dead Mexico';
        if (month === 11 && day >= 22 && day <= 28) return 'Thanksgiving';
        if (month === 12) return 'Christmas';
        return 'General';
    },

    generateExercise: async (date, theme, recentExercises) => {
        const prompts = {
            en: (theme) => `
                Generate four programming exercises related to the theme of ${theme} with the following difficulties:
                1. Easy
                2. Intermediate
                3. Hard
                4. Extreme
                Add a context or scenario for each exercise, making them more realistic and attractive.
                Each exercise should follow this format:
                Title: [Title of the exercise]
                Exercise: [Description of the exercise with a context or scenario for each exercise, do NOT include a title]
                Examples: [Examples of function usage]
                Hints: [Hints to complete the exercise]
                Please provide the exercises in JSON format.`,
            es: (exercises) => `
                Translate the following exercises into Spanish:
                ${exercises.map((ex, i) => `
                Exercise ${i + 1}:
                Título: ${ex.Title}
                Ejercicio: ${ex.Exercise}
                Ejemplos: ${ex.Examples}
                Pistas: ${ex.Hints}
                `).join('\n')}
                Please return each exercise in JSON format.`
        };

        let exercisesEn, exercisesEs;
        let retries = 0;

        while (true) {
            try {
                const basePrompt = prompts.en(theme);
                const resultEn = await model.generateContent(basePrompt);
                const textEn = await resultEn.response.text();
                exercisesEn = JSON.parse(textEn);

                if (!Array.isArray(exercisesEn) || exercisesEn.length !== 4) {
                    throw new Error('Generated exercises are not valid arrays or do not contain four exercises');
                }

                const translatedPrompt = prompts.es(exercisesEn);
                const resultEs = await model.generateContent(translatedPrompt);
                const textEs = await resultEs.response.text();
                exercisesEs = JSON.parse(textEs);

                if (!Array.isArray(exercisesEs) || exercisesEs.length !== 4) {
                    throw new Error('Translated exercises are not valid arrays or do not contain four exercises');
                }

                const titles = {
                    easy: exercisesEn[0].Title,
                    intermediate: exercisesEn[1].Title,
                    hard: exercisesEn[2].Title,
                    extreme: exercisesEn[3].Title
                };

                const isDuplicate = recentExercises.some(e =>
                    e.exercise.easy.en.Title === titles.easy ||
                    e.exercise.intermediate.en.Title === titles.intermediate ||
                    e.exercise.hard.en.Title === titles.hard ||
                    e.exercise.extreme.en.Title === titles.extreme
                );

                if (!isDuplicate) {
                    break;
                }
            } catch (err) {
                console.error('Error generating exercise content:', err);
                if (++retries >= MAX_RETRIES) {
                    throw err;
                }
                await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
            }
        }

        const exerciseData = {
            date: date.toISOString().slice(0, 10),
            theme: theme,
            exercise: {
                easy: { en: exercisesEn[0], es: exercisesEs[0] },
                intermediate: { en: exercisesEn[1], es: exercisesEs[1] },
                hard: { en: exercisesEn[2], es: exercisesEs[2] },
                extreme: { en: exercisesEn[3], es: exercisesEs[3] }
            }
        };

        return exerciseData;
    },

    getDailyChallenge: async (req, res) => {
        const localPath = path.join(__dirname, '../local/exercise_of_the_day.json');

        try {
            const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().slice(0, 10);
            const theme = controller.determineTheme(today);

            let challenge = null;

            // Try reading from local storage first
            if (fs.existsSync(localPath)) {
                const data = fs.readFileSync(localPath, 'utf-8');
                challenge = JSON.parse(data);
                console.log('Challenge read from local storage:', challenge);
            }

            // If no challenge is found in local storage or it doesn't match today's date, check the database
            if (!challenge || challenge.date !== todayStr || challenge.theme !== theme) {
                challenge = await Exercise.findOne({ date: todayStr, theme }).exec();

                // If no challenge is found with the specific theme, search with the "General" theme
                if (!challenge) {
                    console.log('No challenge found with theme:', theme);
                    challenge = await Exercise.findOne({ date: todayStr, theme: 'General' }).exec();
                }

                // If still no challenge is found, generate a new exercise
                if (!challenge) {
                    const recentExercises = await Exercise.find().sort({ date: -1 }).limit(5).exec(); // Get the last 5 exercises to avoid duplicates
                    challenge = await controller.generateExercise(today, theme, recentExercises);
                    await Exercise.insertMany([challenge]);
                }

                // Save the exercise to local storage
                fs.writeFileSync(localPath, JSON.stringify(challenge, null, 2));
                console.log('Challenge saved to local storage:', challenge);
            }

            return res?.status(200).json({ status: 'success', challenge: challenge.exercise });
        } catch (error) {
            console.error('Error getting or generating daily challenge:', error);
            if (res) {
                return res.status(500).json({ status: 'error', message: 'Error getting or generating daily challenge', error: error.message });
            } else {
                console.log('Retrying in one minute...');
                setTimeout(() => {
                    controller.getDailyChallenge();
                }, RETRY_INTERVAL);
            }
        }
    }
};

module.exports = controller;
