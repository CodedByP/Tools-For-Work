const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.generateMagicDraft = onCall(async (request) => {
    // In Gen 2, the data from your website lives inside 'request.data'
    const prompt = request.data.prompt;

    // Safety check: If the prompt is missing, log it and stop
    if (!prompt) {
        console.error("Error: Missing prompt. Received payload:", request.data);
        throw new HttpsError('invalid-argument', 'The prompt is missing.');
    }
    
    // PASTE YOUR API KEY HERE
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        // Rolled back to the highly-stable, production-ready model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: String(prompt) }] }],
                generationConfig: { 
                    temperature: 0.7,         
                    maxOutputTokens: 2048     
                } 
            })
        });

        const json = await response.json();
        
        if (json.candidates && json.candidates[0]) {
            // Send the text back to the frontend
            return { text: json.candidates[0].content.parts[0].text };
        } else {
            console.error("Gemini API Error:", json);
            throw new HttpsError('internal', 'No text returned from Gemini');
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        throw new HttpsError('internal', 'Failed to connect to Gemini API');
    }
});