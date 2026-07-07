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

        // Construct the prompt to ensure the AI acts strictly as a biblical guide
        const systemInstruction = `You are an AI prayer assistant for the Anaptixi Discipleship Platform. 
        A user currently in a "Free-Will Prayer" session has asked for inspiration, scripture, or a place to intercede for. 
        Keep your response concise, deeply scriptural, encouraging, and under 3 short paragraphs. 
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

        // Extract the generated text from Gemini's response payload
        if (geminiData.candidates && geminiData.candidates.length > 0) {
            const aiMessage = geminiData.candidates[0].content.parts[0].text;
            
            return {
                statusCode: 200,
                body: JSON.stringify({ message: aiMessage })
            };
        } else {
            throw new Error("Invalid response structure from Gemini API");
        }

    } catch (error) {
        console.error("Gemini AI API Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to connect to the Anaptixi Guide. Please try again." })
        };
    }
};