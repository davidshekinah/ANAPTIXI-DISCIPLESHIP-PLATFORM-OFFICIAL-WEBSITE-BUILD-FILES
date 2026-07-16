/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - MEDIA RETRIEVAL MODULE
 * File: netlify/functions/getMedia.js
 */

const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
    // Allow GET requests for fetching media
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    let client;

    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            return { statusCode: 500, body: JSON.stringify({ message: "MONGODB_URI missing." }) };
        }

        client = new MongoClient(uri);
        await client.connect();
        const db = client.db('anaptixi_db');
        const mediaCollection = db.collection('media');

        // Fetch all background sounds
        const mediaFiles = await mediaCollection.find({ type: "background_sound" }).toArray();

        await client.close();

        return {
            statusCode: 200,
            body: JSON.stringify({ media: mediaFiles })
        };

    } catch (error) {
        if (client) await client.close();
        console.error("Media Fetch Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to retrieve media links." })
        };
    }
};