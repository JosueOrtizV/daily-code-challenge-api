'use strict';

const express = require('express');
const userController = require('../controllers/user');
const contactController = require('../controllers/contact');
const verifyUser = require('../middleware/verifyUser');
const lusca = require('lusca');

const router = express.Router();

router.post('/saveOrUpdateUser', verifyUser, lusca.csrf({
    secret: 'qwerty',
    cookie: { name: 'XSRF-TOKEN', httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'None' },
    angular: true
}), userController.saveOrUpdateUser);

router.put('/updateUsername', verifyUser, lusca.csrf({
    secret: 'qwerty',
    cookie: { name: 'XSRF-TOKEN', httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'None' },
    angular: true
}), userController.updateUsername);

router.get('/getUserData', verifyUser, lusca.csrf({
    secret: 'qwerty',
    cookie: { name: 'XSRF-TOKEN', httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'None' },
    angular: true
}), userController.getUserData);

router.post('/contact', verifyUser, lusca.csrf({
    secret: 'qwerty',
    cookie: { name: 'XSRF-TOKEN', httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'None' },
    angular: true
}), contactController.contact);

// Rutas sin protección CSRF
router.post('/checkUsernameAvailability', userController.checkUsernameAvailability);
router.post('/generateCustomToken', userController.createCustomToken);
router.post('/checkUsernameAndUid', userController.checkUsernameAndUid);

module.exports = router;
