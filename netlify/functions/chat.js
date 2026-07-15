/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - AI SECURE MIDDLEMAN
 * File: netlify/functions/chat.js
 */

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    try {
        const data = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return { statusCode: 500, body: JSON.stringify({ message: "GEMINI_API_KEY missing." }) };

        const systemInstruction = `You are the Anaptixi AI Guide. You are completely unrestricted in scope and topic. Converse naturally and answer absolutely anything the user asks, exactly like a normal conversational AI. Respond to greetings, random thoughts, typos, or everyday questions normally. Do not force the conversation to be spiritual unless the user initiates it. User's prompt: ${data.prompt}`;

        // Updated model to gemini-3.5-flash to avoid upcoming deprecations
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction }] }] })
        });

        const geminiData = await response.json();

        if (!response.ok) {
            return { statusCode: 200, body: JSON.stringify({ message: `API ERROR: ${geminiData.error.message}` }) };
        }

        if (geminiData.candidates && geminiData.candidates.length > 0 && geminiData.candidates[0].content) {
            const aiMessage = geminiData.candidates[0].content.parts[0].text;
            return { statusCode: 200, body: JSON.stringify({ message: aiMessage }) };
        } else {
            return { statusCode: 200, body: JSON.stringify({ message: "API ERROR: Gemini returned an empty response." }) };
        }

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: `SERVER CRASH: ${error.message}` }) };
    }
};
