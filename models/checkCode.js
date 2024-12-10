'use strict';

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const schema = {
    description: "Review the user's code and provide feedback on what to improve (Use max 1000 characters). It also assigns a score from 0 to 10 based on code quality.",
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: {
            Response: {
                type: SchemaType.STRING,
                description: "Response with feedback on what to improve for user's code (Use max 1000 characters)",
                nullable: false
            },
            Score: {
                type: SchemaType.NUMBER,
                description: "Score from 0 to 10 based on code quality",
                nullable: false
            }
        },
        required: ["Response", "Score"]
    }
};

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
    }
});

module.exports = model;
