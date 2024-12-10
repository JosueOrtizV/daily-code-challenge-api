'use strict';

const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// Create and connect Redis client
const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        connectTimeout: 10000
    }
});

client.on('error', err => console.log('Redis Client Error', err));

client.connect(console.log('Conected to redis')).catch(err => console.log('Redis Client Connection Error', err));

module.exports = client;
