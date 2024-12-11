'use strict';

const express = require('express');
const userController = require('../controllers/user');
const contactController = require('../controllers/contact');
const verifyUser = require('../middleware/verifyUser');
const lusca = require('lusca');

const router = express.Router();

// Registrar el contenido del token recibido para diagnóstico
router.use((req, res, next) => {
    console.log('CSRF Header user:', req.headers['x-xsrf-token']);
    console.log('CSRF Cookie user:', req.cookies['XSRF-TOKEN']);
    next();
});

// Define las rutas con protección CSRF y registro de token
router.post('/checkUsernameAvailability', userController.checkUsernameAvailability);
router.post('/saveOrUpdateUser', lusca.csrf(), verifyUser, userController.saveOrUpdateUser); 
router.put('/updateUsername', lusca.csrf(), verifyUser, userController.updateUsername); 
router.get('/getUserData', lusca.csrf(), verifyUser, userController.getUserData); 
router.post('/contact', lusca.csrf(), verifyUser, contactController.contact);
router.post('/generateCustomToken', userController.createCustomToken);
router.post('/checkUsernameAndUid', userController.checkUsernameAndUid);

module.exports = router;
