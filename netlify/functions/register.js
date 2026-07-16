const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { firstName, surname, anaptixiKey, age, profilePicBase64, password } = data;

        // 1. NATIVE BACKEND VALIDATION CHECK FOR ANAPTIXI KEY
        const expectedKey = firstName.toUpperCase().split('').map(char => {
            const code = char.charCodeAt(0) - 64; // Mapping A=1, B=2, ..., Z=26
            return (code > 0 && code <= 26) ? code : '';
        }).join('');

        if (anaptixiKey !== expectedKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    message: "Incorrect Anaptixi Key, contact the Admin for an Anaptixi key if you haven’t or enter the key correctly if you have" 
                })
            };
        }

        // 2. AUTOMATIC HANDLE GENERATION (firstnamelastname@anaptixi.com)
        const generatedHandle = `${firstName}${surname}`.replace(/\s+/g, '').toLowerCase() + '@anaptixi.com';

        // 3. MONGODB CLUSTER CONNECTION
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            return { statusCode: 500, body: JSON.stringify({ message: "Netlify Environment Variable MONGODB_URI is missing." }) };
        }

        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('anaptixi_db');
        const usersCollection = db.collection('users');

        // Check if the identity handle already exists in the cluster database pool
        const existingUser = await usersCollection.findOne({ handle: generatedHandle });
        if (existingUser) {
            await client.close();
            return { statusCode: 400, body: JSON.stringify({ message: "An account with this name handle combination already exists." }) };
        }

        // 4. RETENTION OF SPECIFIC DETAILS + BASE64 STRING IMAGE
        const newUser = {
            firstName,
            surname,
            handle: generatedHandle,
            age: parseInt(age),
            profilePic: profilePicBase64, // Image stored safely as a string
            password,                     // Security key chosen by the user
            createdAt: new Date()
        };

        await usersCollection.insertOne(newUser);
        await client.close();

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: "Registration successful!", 
                handle: generatedHandle 
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error: " + error.message })
        };
    }
};