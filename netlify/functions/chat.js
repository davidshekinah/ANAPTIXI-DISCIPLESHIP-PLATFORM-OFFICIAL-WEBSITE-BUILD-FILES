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

        const systemInstruction = `You are the Anaptixi AI Guide. Converse naturally and answer anything the user asks. User's prompt: ${data.prompt}`;

        // Explicitly using the v1beta endpoint with the full model path
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: systemInstruction }] }] 
            })
        });

        const geminiData = await response.json();

        if (!response.ok) {
            // This will now pass the exact error back to the frontend
            return { statusCode: 200, body: JSON.stringify({ message: `API ERROR: ${geminiData.error.message}` }) };
        }

        if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
            return { statusCode: 200, body: JSON.stringify({ message: geminiData.candidates[0].content.parts[0].text }) };
        } else {
            return { statusCode: 200, body: JSON.stringify({ message: "API ERROR: Gemini returned an empty response." }) };
        }

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: `SERVER CRASH: ${error.message}` }) };
    }
};
