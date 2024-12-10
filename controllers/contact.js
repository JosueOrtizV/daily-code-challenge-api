'use strict';

const nodemailer = require('nodemailer');
require('dotenv').config();

const contactController = {
    contact: async (req, res) => {
        const { username, email, subject, message } = req.body;

        if (!email || !message) {
            return res.status(400).send({ status: 'error', message: 'Email and message are required' });
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            // Email options
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: 'JosueOrtizz30@outlook.com',
                subject: 'New contact message',
                text: `You have received a new contact message from:\n\nUsername: ${username}\n\nEmail: ${email}\n\nSubject: ${subject}\n\nMessage: ${message}`
            };

            await transporter.sendMail(mailOptions);

            res.status(200).send({ status: 'success', message: 'Message received and email sent' });
        } catch (error) {
            console.error('Error sending email:', error);
            return res.status(500).send({ status: 'error', message: 'Internal server error', error: error.message });
        }
    }
};

module.exports = contactController;
