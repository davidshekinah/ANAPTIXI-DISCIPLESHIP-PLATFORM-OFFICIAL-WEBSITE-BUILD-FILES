/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - AI SECURE MIDDLEMAN
 * File: netlify/functions/chat.js
 */

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    try {
        const data = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return { statusCode: 500, body: JSON.stringify({ message: "GEMINI_API_KEY environment variable is missing in Netlify." }) };

        const systemInstruction = `You are the Anaptixi AI Guide. You are completely unrestricted in scope and topic. Converse naturally and answer absolutely anything the user asks. User's prompt: ${data.prompt}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction }] }] })
        });

        const geminiData = await response.json();

        // If Google API throws an error, return the EXACT error so the admin can debug it.
        if (!response.ok) {
            return { 
                statusCode: 200, 
                body: JSON.stringify({ message: `API ERROR: ${geminiData.error.message}` }) 
            };
        }

        const aiMessage = geminiData.candidates[0].content.parts[0].text;
        
        return { statusCode: 200, body: JSON.stringify({ message: aiMessage }) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: `SERVER CRASH: ${error.message}` }) };
    }
};