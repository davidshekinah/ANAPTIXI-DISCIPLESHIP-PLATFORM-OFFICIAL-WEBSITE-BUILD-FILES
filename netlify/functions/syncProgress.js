/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - PROGRESS SYNC MODULE
 * File: netlify/functions/syncProgress.js
 */

const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
    // Only allow POST requests for security
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    let client;

    try {
        const data = JSON.parse(event.body);
        const { handle, type, duration, timestamp } = data;

        if (!handle || !type || duration === undefined) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Missing required session data.' }) };
        }

        // Fetch the secure database connection string from Netlify Environment Variables
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            return { statusCode: 500, body: JSON.stringify({ message: "Netlify Environment Variable MONGODB_URI is missing." }) };
        }

        client = new MongoClient(uri);
        await client.connect();
        const db = client.db('anaptixi_db');
        const usersCollection = db.collection('users');

        // Check if the user exists
        const existingUser = await usersCollection.findOne({ handle: handle });
        if (!existingUser) {
            await client.close();
            return { statusCode: 404, body: JSON.stringify({ message: "User identity not found in database." }) };
        }

        // ==========================================
        // BACKEND DUPLICATE VALIDATION 
        // ==========================================
        if (type === 'scheduled') {
            const incomingDate = new Date(timestamp);
            const incomingYear = incomingDate.getFullYear();
            const incomingMonth = incomingDate.getMonth();
            const incomingDay = incomingDate.getDate();
            const incomingHour = incomingDate.getHours();

            const logs = existingUser.prayerLogs || [];
            const isDuplicate = logs.some(log => {
                if (log.type === 'scheduled') {
                    const logDate = new Date(log.completedAt);
                    return logDate.getFullYear() === incomingYear &&
                           logDate.getMonth() === incomingMonth &&
                           logDate.getDate() === incomingDay &&
                           logDate.getHours() === incomingHour;
                }
                return false;
            });

            if (isDuplicate) {
                await client.close();
                return { 
                    statusCode: 409, 
                    body: JSON.stringify({ message: "A scheduled session for this hour block has already been recorded." }) 
                };
            }
        }

        // Prepare the session object to push into the database
        const newSessionLog = {
            type: type, // 'scheduled' or 'freewill'
            durationInSeconds: duration,
            completedAt: new Date(timestamp)
        };

        // Update the user's document in MongoDB by pushing the new session to an array
        await usersCollection.updateOne(
            { handle: handle },
            { $push: { prayerLogs: newSessionLog } }
        );

        await client.close();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Session successfully recorded to cloud." })
        };

    } catch (error) {
        if (client) await client.close();
        console.error("Database Sync Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error: Failed to sync session." })
        };
    }
};