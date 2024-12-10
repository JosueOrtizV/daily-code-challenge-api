'use strict';

const admin = require('firebase-admin');

const verifyUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).send({ status: 'error', message: 'Unauthorized: No token provided' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(401).send({ status: 'error', message: 'Unauthorized: Invalid token' });
    }
};

module.exports = verifyUser;
