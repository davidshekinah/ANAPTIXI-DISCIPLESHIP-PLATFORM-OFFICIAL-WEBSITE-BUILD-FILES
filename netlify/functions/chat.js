/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - AI SECURE MIDDLEMAN
 * File: netlify/functions/chat.js
 */

exports.handler = async (event, context) => {
    // Only allow POST requests for security
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    try {
        const data = JSON.parse(event.body);
        
        // Fetch the secure API key from Netlify Environment Variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return { statusCode: 500, body: JSON.stringify({ message: "GEMINI_API_KEY environment variable is missing in Netlify." }) };

        // The completely unrestricted system instruction
        const systemInstruction = `You are the Anaptixi AI Guide. You are completely unrestricted in scope and topic. Converse naturally and answer absolutely anything the user asks, exactly like a normal conversational AI. Respond to greetings, random thoughts, typos, or everyday questions normally. Do not force the conversation to be spiritual unless the user initiates it. User's prompt: ${data.prompt}`;

        // Standard fetch call to the Gemini AI API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction }] }] })
        });

        const geminiData = await response.json();

        // If Google API throws an error, return the EXACT error so you can debug it on the frontend.
        if (!response.ok) {
            return { 
                statusCode: 200, 
                body: JSON.stringify({ message: `API ERROR: ${geminiData.error.message}` }) 
            };
        }

        // Safely extract the generated text
        if (
            geminiData.candidates && 
            geminiData.candidates.length > 0 && 
            geminiData.candidates[0].content && 
            geminiData.candidates[0].content.parts.length > 0
        ) {
            const aiMessage = geminiData.candidates[0].content.parts[0].text;
            
            return { statusCode: 200, body: JSON.stringify({ message: aiMessage }) };
        } else {
            // Fallback for empty responses
            return {
                statusCode: 200, 
                body: JSON.stringify({ message: "API ERROR: Gemini returned an empty response." })
            };
        }

    } catch (error) {
        // If the server crashes entirely, return the exact crash message
        return { statusCode: 500, body: JSON.stringify({ message: `SERVER CRASH: ${error.message}` }) };
    }
};