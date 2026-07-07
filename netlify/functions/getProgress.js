/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - PROGRESS RETRIEVAL MODULE
 * File: netlify/functions/getProgress.js
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
        const { handle } = data;

        if (!handle) {
            return { statusCode: 400, body: JSON.stringify({ message: 'User handle is required.' }) };
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

        // Fetch the user's data
        const user = await usersCollection.findOne({ handle: handle });
        
        if (!user) {
            await client.close();
            return { statusCode: 404, body: JSON.stringify({ message: "User identity not found in database." }) };
        }

        const logs = user.prayerLogs || [];
        
        // Setup Date Boundaries for calculations
        const now = new Date();
        
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Helper Variables for Calculation
        let dailyScheduledCount = 0;
        let monthlyScheduledCount = 0;
        let yearlyScheduledCount = 0;
        const freeFlowLogs = [];

        // Parse through the user's prayer logs
        logs.forEach(log => {
            const logDate = new Date(log.completedAt);
            
            if (log.type === 'scheduled') {
                if (logDate >= startOfYear) yearlyScheduledCount++;
                if (logDate >= startOfMonth) monthlyScheduledCount++;
                if (logDate >= startOfDay) dailyScheduledCount++;
            } else if (log.type === 'freewill') {
                // Collect Free-Flow logs (Sorting handled by natural chronological insertion)
                freeFlowLogs.push(log);
            }
        });

        // ----------------------------------------------------
        // OBEDIENCE PERCENTAGE CALCULATIONS
        // ----------------------------------------------------
        
        // 1. Daily Obedience (Max 24 sessions per day)
        // If they miss a day, this caps out natively based on the hours passed.
        let dailyPercent = Math.round((dailyScheduledCount / 24) * 100);
        
        // 2. Monthly Obedience
        // Calculates days passed in the current month to set the max possible sessions up to this point
        const daysPassedThisMonth = Math.max(1, now.getDate());
        const maxMonthlySessions = daysPassedThisMonth * 24;
        let monthlyPercent = Math.round((monthlyScheduledCount / maxMonthlySessions) * 100);
        
        // 3. Yearly Obedience
        // Calculates days passed in the current year
        const diffTime = Math.abs(now - startOfYear);
        const daysPassedThisYear = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); 
        const maxYearlySessions = daysPassedThisYear * 24;
        let yearlyPercent = Math.round((yearlyScheduledCount / maxYearlySessions) * 100);

        // Ensure calculations do not organically exceed 100% due to timezone overlapping bounds
        dailyPercent = dailyPercent > 100 ? 100 : dailyPercent;
        monthlyPercent = monthlyPercent > 100 ? 100 : monthlyPercent;
        yearlyPercent = yearlyPercent > 100 ? 100 : yearlyPercent;

        await client.close();

        // Return the clean data packet back to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                dailyPercent: dailyPercent,
                monthlyPercent: monthlyPercent,
                yearlyPercent: yearlyPercent,
                freeFlowLogs: freeFlowLogs
            })
        };

    } catch (error) {
        if (client) await client.close();
        console.error("Progress Fetch Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error: Failed to retrieve progress." })
        };
    }
};