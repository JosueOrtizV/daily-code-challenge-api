'use strict';

const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now
    },
    theme: {
        type: String,
        default: 'General'
    },
    exercise: {
        easy: {
            es: { type: mongoose.Schema.Types.Mixed, required: true },
            en: { type: mongoose.Schema.Types.Mixed, required: true }
        },
        intermediate: {
            es: { type: mongoose.Schema.Types.Mixed, required: true },
            en: { type: mongoose.Schema.Types.Mixed, required: true }
        },
        hard: {
            es: { type: mongoose.Schema.Types.Mixed, required: true },
            en: { type: mongoose.Schema.Types.Mixed, required: true }
        },
        extreme: {
            es: { type: mongoose.Schema.Types.Mixed, required: true },
            en: { type: mongoose.Schema.Types.Mixed, required: true }
        }
    }
});

const Exercise = mongoose.model('Exercise', exerciseSchema, 'challenges');

module.exports = Exercise;
