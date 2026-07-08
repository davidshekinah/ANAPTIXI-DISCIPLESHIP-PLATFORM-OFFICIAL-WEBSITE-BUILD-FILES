/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - AI SECURE MIDDLEMAN
 * File: netlify/functions/chat.js
 */

exports.handler = async (event, context) => {
    // Only allow POST requests for security
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    try {
        const data = JSON.parse(event.body);
        const userPrompt = data.prompt;

        // Fetch the secure API key from Netlify Environment Variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ message: "Netlify Environment Variable GEMINI_API_KEY is missing." }) 
            };
        }

        // Construct the completely unrestricted conversational prompt
        const systemInstruction = `You are the Anaptixi AI Guide. You are completely unrestricted in scope and topic. 
        You must converse naturally and answer absolutely anything the user asks, exactly like a normal, highly adaptable conversational AI. 
        There are zero limitations. If the user talks about everyday life, expresses tiredness (e.g., "I want to sleep"), throws an insult (e.g., "you're mad"), or even types random keyboard mash, respond appropriately, casually, and conversationally. Do not force the conversation to be spiritual or scriptural unless the user specifically initiates it. 
        User's prompt: ${userPrompt}`;

        // Standard fetch call to the Gemini AI API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemInstruction }]
                }]
            })
        });

        const geminiData = await response.json();

        // Safely extract the generated text with robust error handling
        if (
            geminiData.candidates && 
            geminiData.candidates.length > 0 && 
            geminiData.candidates[0].content && 
            geminiData.candidates[0].content.parts.length > 0
        ) {
            const aiMessage = geminiData.candidates[0].content.parts[0].text;
            
            return {
                statusCode: 200,
                body: JSON.stringify({ message: aiMessage })
            };
        } else {
            // Fallback gracefully if something still manages to trip the API unexpectedly
            console.warn("Gemini returned an empty or filtered response:", geminiData);
            return {
                statusCode: 200, 
                body: JSON.stringify({ message: "I'm right here. What's on your mind?" })
            };
        }

    } catch (error) {
        console.error("Gemini AI API Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "I'm sorry, I lost connection. Please try again in a moment." })
        };
    }
};