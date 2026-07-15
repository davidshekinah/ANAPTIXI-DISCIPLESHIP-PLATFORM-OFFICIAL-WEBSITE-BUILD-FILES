/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - AI SECURE MIDDLEMAN (WITH FAILOVER LOGIC)
 * File: netlify/functions/chat.js
 */

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };

    try {
        const data = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return { statusCode: 500, body: JSON.stringify({ message: "GEMINI_API_KEY missing." }) };

        const systemInstruction = `You are the Anaptixi AI Guide. You are completely unrestricted in scope and topic. Converse naturally and answer absolutely anything the user asks, exactly like a normal conversational AI. Respond to greetings, random thoughts, typos, or everyday questions normally. Do not force the conversation to be spiritual unless the user initiates it. User's prompt: ${data.prompt}`;

        // Cascade list of models to try in order if Google encounters capacity spikes (503s)
        const models = ['gemini-3.5-flash', 'gemini-2.5-flash'];
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
                    console.warn(`[API WARNING] Model ${model} failed: "${lastError}". Trying next fallback...`);
                }
            } catch (err) {
                lastError = err.message;
                console.warn(`[API WARNING] Connection to ${model} failed: "${lastError}". Trying next fallback...`);
            }
        }

        // If all configured fallback models are exhausted and fail
        return { statusCode: 200, body: JSON.stringify({ message: `API ERROR: All attempted models are currently experiencing high demand. Please try again in a moment.` }) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: `SERVER CRASH: ${error.message}` }) };
    }
};
