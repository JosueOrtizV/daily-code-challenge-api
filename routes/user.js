'use strict';

const express = require('express');
const userController = require('../controllers/user');
const contactController = require('../controllers/contact');
const verifyUser = require('../middleware/verifyUser');
const csurf = require('csurf');

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

const router = express.Router();

// Registrar el contenido del token recibido para diagnóstico
router.use((req, res, next) => {
    console.log('CSRF Header user:', req.headers['x-xsrf-token']);
    console.log('CSRF Cookie user:', req.cookies['XSRF-TOKEN']);
    next();
});

// Define las rutas con protección CSRF y registro de token
router.post('/checkUsernameAvailability', userController.checkUsernameAvailability);
router.post('/saveOrUpdateUser', verifyUser, csrfProtection, userController.saveOrUpdateUser);
router.put('/updateUsername', verifyUser, csrfProtection, userController.updateUsername);
router.get('/getUserData', verifyUser, csrfProtection, userController.getUserData);
router.post('/contact', verifyUser, csrfProtection, contactController.contact);
router.post('/generateCustomToken', userController.createCustomToken);
router.post('/checkUsernameAndUid', userController.checkUsernameAndUid);

module.exports = router;
