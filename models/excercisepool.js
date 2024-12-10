'use strict';

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const schema = {
    description: "List of programming exercises based on a theme and difficulty level, with a context or scenario for each exercise",
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: {
            Title: {
                type: SchemaType.STRING,
                description: "Title of the exercise",
                nullable: false
            },
            Exercise: {
                type: SchemaType.STRING,
                description: "Description of the exercise with a context or scenario for each exercise",
                nullable: false
            },
            Examples: {
                type: SchemaType.STRING,
                description: "Examples of function usage",
                nullable: false
            },
            Hints: {
                type: SchemaType.STRING,
                description: "Hints to complete the exercise",
                nullable: false
            }
        },
        required: ["Title", "Exercise", "Examples", "Hints"]
    }
};

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
    }
});

module.exports = model;
