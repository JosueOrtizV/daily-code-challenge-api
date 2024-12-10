'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

mongoose.Promise = global.Promise;

let isConnected;

const connectToDatabase = async () => {
    if (isConnected) {
        console.log('Using existing database connection.');
        return;
    }

    console.log('Creating new database connection...');
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = mongoose.connection.readyState;
};

connectToDatabase().then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running at https://api.dailycodechallenge.io:${port}/`);
    });
}).catch(err => {
    console.error('Database connection error:', err);
});
