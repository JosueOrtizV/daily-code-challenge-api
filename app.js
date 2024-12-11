'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const firebaseAdmin = require('firebase-admin');

const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN'],
    credentials: true,
}));

app.set('trust proxy', 1); // Asegúrate de confiar en el primer proxy

// CSRF protection middleware
const csrfProtection = csurf({ 
    cookie: {
        key: 'XSRF-TOKEN',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None'
    }
});

// Registrar el contenido del token recibido para diagnóstico
app.use((req, res, next) => {
    console.log('CSRF Header:', req.headers['x-xsrf-token']);
    console.log('CSRF Cookie:', req.cookies['XSRF-TOKEN']);
    next();
});

// Route to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    const csrfToken = req.csrfToken();
    res.cookie('XSRF-TOKEN', csrfToken, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false,
        sameSite: 'None'
    });
    console.log('CSRF token generated and sent:', csrfToken);
    res.status(200).json({ csrfToken });
});

// Rate limiting middleware to protect against brute force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100
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
    console.error('Error:', err);
    if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).json({ error: 'Invalid CSRF token' });
    } else {
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

module.exports = app;
