/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - PROGRESS RETRIEVAL MODULE
 * File: netlify/functions/getProgress.js
 */

const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    let client;
    try {
        const data = JSON.parse(event.body);
        const { handle } = data;
        if (!handle) return { statusCode: 400, body: JSON.stringify({ message: 'User handle is required.' }) };

        const uri = process.env.MONGODB_URI;
        if (!uri) return { statusCode: 500, body: JSON.stringify({ message: "MONGODB_URI missing." }) };

        client = new MongoClient(uri);
        await client.connect();
        const db = client.db('anaptixi_db');
        const user = await db.collection('users').findOne({ handle: handle });
        
        if (!user) {
            await client.close();
            return { statusCode: 404, body: JSON.stringify({ message: "User not found." }) };
        }

        const logs = user.prayerLogs || [];
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        let dailyScheduledCount = 0;
        let monthlyScheduledCount = 0;
        let yearlyScheduledCount = 0;
        const freeFlowLogs = [];

        logs.forEach(log => {
            const logDate = new Date(log.completedAt);
            if (log.type === 'scheduled') {
                if (logDate >= startOfYear) yearlyScheduledCount++;
                if (logDate >= startOfMonth) monthlyScheduledCount++;
                if (logDate >= startOfDay) dailyScheduledCount++;
            } else if (log.type === 'freewill') {
                freeFlowLogs.push(log);
            }
        });

        const daysPassedThisMonth = Math.max(1, now.getDate());
        const daysPassedThisYear = Math.max(1, Math.ceil(Math.abs(now - startOfYear) / (1000 * 60 * 60 * 24))); 

        // CALCULATING EXACT DECIMALS INSTEAD OF ROUNDING
        let dailyPercent = ((dailyScheduledCount / 24) * 100).toFixed(3);
        let monthlyPercent = ((monthlyScheduledCount / (daysPassedThisMonth * 24)) * 100).toFixed(3);
        let yearlyPercent = ((yearlyScheduledCount / (daysPassedThisYear * 24)) * 100).toFixed(3);

        dailyPercent = parseFloat(dailyPercent) > 100 ? 100 : dailyPercent;
        monthlyPercent = parseFloat(monthlyPercent) > 100 ? 100 : monthlyPercent;
        yearlyPercent = parseFloat(yearlyPercent) > 100 ? 100 : yearlyPercent;

        await client.close();

        return {
            statusCode: 200,
            body: JSON.stringify({ dailyPercent, monthlyPercent, yearlyPercent, freeFlowLogs })
        };
    } catch (error) {
        if (client) await client.close();
        return { statusCode: 500, body: JSON.stringify({ message: "Failed to retrieve progress." }) };
    }
};