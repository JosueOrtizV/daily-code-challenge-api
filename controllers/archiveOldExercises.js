'use strict';

const cron = require('node-cron');
const Exercise = require('../models/exercise');

const archiveOldExercises = async () => {
    const archiveDays = 60;
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - archiveDays);

    try {
        const oldExercises = await Exercise.find({ date: { $lt: archiveDate } });
        
        for (const exercise of oldExercises) {
            await Exercise.deleteOne({ _id: exercise._id });
        }
        
        console.log(`Exercises older than ${archiveDate.toISOString().slice(0, 10)} deleted.`);
    } catch (error) {
        console.error('Error deleting old exercises:', error);
    }
};

cron.schedule('0 0 */5 * *', async () => {
    await archiveOldExercises();
    console.log('Old exercises deleted as scheduled.');
});
