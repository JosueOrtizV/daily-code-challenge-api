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
client.on('connect', () => console.log('Connected to redis'));
client.on('ready', () => console.log('Redis client ready'));
client.on('reconnecting', () => console.log('Redis client reconnecting'));
client.on('end', () => console.log('Redis client disconnected'));

client.connect().catch(err => console.log('Redis Client Connection Error', err));

module.exports = client;
