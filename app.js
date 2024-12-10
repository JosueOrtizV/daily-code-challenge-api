'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const firebaseAdmin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();

// Ruta al archivo de credenciales
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialsPath) {
    throw new Error('La variable de entorno GOOGLE_APPLICATION_CREDENTIALS no está definida.');
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(credentialsPath), 'utf8'));

// Inicializar Firebase Admin SDK
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount)
});

// Set security headers using Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "https://apis.google.com"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "https://lh3.googleusercontent.com"],
        },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Configure CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'https://dailycodechallenge.io',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN', 'username'],
    credentials: true,
}));

// CSRF protection middleware
const csrfProtection = csurf({ cookie: true });

// Route to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.cookie('XSRF-TOKEN', req.csrfToken(), {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false,
        sameSite: 'Strict'
    });
    res.status(200).json({ csrfToken: req.csrfToken() });
});

// Rate limiting middleware to protect against brute force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Load routes
const exerciseRoutes = require('./routes/exercise');
const userRoutes = require('./routes/user');
const leaderboardRoutes = require('./routes/leaderboard');
app.use('/api', exerciseRoutes);
app.use('/api/user', userRoutes);
app.use('/api', leaderboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).json({ error: 'Invalid CSRF token' });
    } else {
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

module.exports = app;
