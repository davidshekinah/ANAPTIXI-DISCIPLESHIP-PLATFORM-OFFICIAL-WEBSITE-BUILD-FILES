const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { identity, securityKey } = data; // Expects firstnamelastname@anaptixi.com and security key password

        // MONGODB CLUSTER CONNECTION
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            return { statusCode: 500, body: JSON.stringify({ message: "Netlify Environment Variable MONGODB_URI is missing." }) };
        }

        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('anaptixi_db');
        const usersCollection = db.collection('users');

        // Find match in database pool using generated handle and password key
        const user = await usersCollection.findOne({ 
            handle: identity.trim().toLowerCase(), 
            password: securityKey 
        });

        if (!user) {
            await client.close();
            return { 
                statusCode: 401, 
                body: JSON.stringify({ message: "Invalid Anaptixi Identity or Security Key." }) 
            };
        }

        // Exclude password from the returned profile details session object for baseline transmission safety
        const { password, ...userProfileDetails } = user;

        await client.close();

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: "Login granted!", 
                user: userProfileDetails 
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error: " + error.message })
        };
    }
};