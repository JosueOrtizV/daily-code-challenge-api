'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const getMoreChallengesModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const userRequests = {};

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

    getMoreChallenges: async (req, res) => {
        try {
            const today = new Date();
            const theme = controller.determineTheme(today);
            const { username, difficulty, language } = req.body;

            if (!userRequests[username]) {
                userRequests[username] = { [today.toDateString()]: 0 };
            }
            if (!userRequests[username][today.toDateString()]) {
                userRequests[username][today.toDateString()] = 0;
            }
            if (userRequests[username][today.toDateString()] >= 5) {
                return res.status(429).send({ status: 'error', message: 'You have reached the daily limit of 5 challenges', remainingRequests: 0 });
            }

            const lastRequestTime = userRequests[username].lastRequestTime || 0;
            const currentTime = Date.now();
            if (currentTime - lastRequestTime < 60000) {
                const remainingRequests = 5 - userRequests[username][today.toDateString()];
                return res.status(429).send({ status: 'error', message: 'Please wait a minute before making another request', remainingRequests });
            }

            userRequests[username].lastRequestTime = currentTime;

            const prompt = language === 'es' 
                ? `Genera un ejercicio de programación relacionado con el tema ${theme} con la siguiente dificultad ${difficulty}.
                    Agrega un contexto o escenario para el ejercicio, haciéndolo más realista y atractivo.
                    El ejercicio generado debe seguir este formato:
                    Título del ejercicio
                    Descripción del ejercicio con un contexto o escenario para cada ejercicio
                    Ejemplos de uso de la función
                    Usa máximo 1500 caracteres`
                : `Generate one programming exercise related to the theme of ${theme} with the following difficulty ${difficulty}
                    Add a context or scenario for the exercise, making it more realistic and attractive.
                    Generated exercise should follow this format:
                    Title of the exercise
                    Description of the exercise with a context or scenario for each exercise
                    Examples of function usage
                    Use max 1500 characters`;

            const result = await getMoreChallengesModel.generateContent(prompt);
            const challenge = await result.response.text();

            userRequests[username][today.toDateString()] += 1;
            const remainingRequests = 5 - userRequests[username][today.toDateString()];

            return res.status(200).send({
                status: 'success',
                challenge: challenge,
                remainingRequests: remainingRequests
            });
        } catch (error) {
            console.error('Error getting more challenges:', error);
            return res.status(500).send({ status: 'error', message: 'Internal server error', error: error.message });
        }
    }
};

module.exports = controller;
