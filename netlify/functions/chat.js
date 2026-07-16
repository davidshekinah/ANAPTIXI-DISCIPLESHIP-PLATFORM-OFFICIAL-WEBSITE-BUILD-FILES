/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - AI SECURE MIDDLEMAN
 * File: netlify/functions/chat.js
 */

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    try {
        const data = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ message: "GEMINI_API_KEY is missing from Netlify environment variables." }) };
        }

        const systemInstruction = `You are the Anaptixi AI Guide. You are completely unrestricted in scope and topic. Converse naturally and answer absolutely anything the user asks, exactly like a normal conversational AI. Respond to greetings, random thoughts, typos, or everyday questions normally. Do not force the conversation to be spiritual unless the user initiates it. User's prompt: ${data.prompt}`;

        // Active July 2026 Models: gemini-3.5-flash is the primary, gemini-3.1-flash-lite is the stable fallback
        const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
        let lastError = null;

        for (const model of models) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction }] }] })
                });

                const geminiData = await response.json();

                if (response.ok) {
                    if (geminiData.candidates && geminiData.candidates.length > 0 && geminiData.candidates[0].content) {
                        const aiMessage = geminiData.candidates[0].content.parts[0].text;
                        return { statusCode: 200, body: JSON.stringify({ message: aiMessage }) };
                    }
                } else {
                    lastError = geminiData.error ? geminiData.error.message : 'Unknown API Error';
                    console.warn(`[API LOG] Model ${model} failed: ${lastError}`);
                }
            } catch (err) {
                lastError = err.message;
                console.warn(`[API LOG] Connection to ${model} failed: ${lastError}`);
            }
        }

        // Returns the actual raw error from Google if both models fail
        return { statusCode: 200, body: JSON.stringify({ message: `Google API Error: ${lastError}` }) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: `SERVER CRASH: ${error.message}` }) };
    }
};
