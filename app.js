'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const lusca = require('lusca');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const redisClient = require('./controllers/redisClient');
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

// Configure session middleware (requerido para `lusca`)
const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'myapp:'
});

app.use(session({
    store: redisStore,
    secret: 'abc',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None'
    }
}));

// Configure CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'https://dailycodechallenge.io',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN'],
    credentials: true,
}));

app.set('trust proxy', 1); // Asegúrate de confiar en el primer proxy

// Configurar lusca para la protección CSRF con secreto y cookie
const csrfProtection = lusca.csrf({
    secret: 'qwerty', // Secreto para CSRF
    cookie: { name: '_csrf', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'None' }
});

// Route to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    const csrfToken = res.locals._csrf;
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

// Apply user routes
app.use('/api/user', userRoutes);

// Load other routes without CSRF protection
app.use('/api', exerciseRoutes);
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
