'use strict';

const express = require('express');
const userController = require('../controllers/user');
const contactController = require('../controllers/contact');
const verifyUser = require('../middleware/verifyUser');
const csurf = require('csurf');

// CSRF protection middleware
const csrfProtection = csurf({ cookie: true });

const router = express.Router();

router.post('/checkUsernameAvailability', userController.checkUsernameAvailability);
router.post('/saveOrUpdateUser', csrfProtection, verifyUser, userController.saveOrUpdateUser);
router.put('/updateUsername', verifyUser, csrfProtection, userController.updateUsername);
router.get('/getUserData', verifyUser, csrfProtection, userController.getUserData);
router.post('/contact', verifyUser, csrfProtection, contactController.contact);
router.post('/generateCustomToken', userController.createCustomToken);
router.post('/checkUsernameAndUid', userController.checkUsernameAndUid);

module.exports = router;
