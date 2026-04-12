const {onCall, HttpsError} = require("firebase-functions/v2/https");

exports.generateMagicDraft = onCall(
    {
      cors: true,
      timeoutSeconds: 120, // Gives the function 2 full minutes to work
      memory: "512MiB", // Gives the function more RAM to handle heavy payloads
    },
    async (request) => {
      const prompt = request.data.prompt;

      if (!prompt) {
        console.error("Error: Missing prompt. Received payload:", request.data);
        throw new HttpsError("invalid-argument", "The prompt is missing.");
      }

      // Fetch your API Key from the environment
      const API_KEY = process.env.GEMINI_API_KEY;

      try {
        // Point to gemini-2.5-pro, the current stable model for complex, multi-rule reasoning
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${API_KEY}`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            contents: [{parts: [{text: String(prompt)}]}],
            generationConfig: {
              temperature: 0.2, // Lowered to force strict rule compliance
              maxOutputTokens: 2048,
            },
            safetySettings: [
              {category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE"},
              {category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE"},
              {category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE"},
              {category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE"},
            ],
          }),
        });

        const json = await response.json();

        // If the API returns a direct HTTP error, throw it immediately!
        if (json.error) {
          console.error("Direct API Error:", json.error);
          throw new HttpsError("internal", `Gemini rejected the request: ${json.error.message}`);
        }

        // --- THE FIX: SMARTER ERROR HANDLING ---

        // 1. Check if the initial prompt was blocked immediately
        if (json.promptFeedback && json.promptFeedback.blockReason) {
          console.error("Prompt Blocked:", json.promptFeedback);
          throw new HttpsError("failed-precondition", `Prompt blocked: ${json.promptFeedback.blockReason}`);
        }

        // 2. Safely parse the candidates
        if (json.candidates && json.candidates[0]) {
          const candidate = json.candidates[0];

          // Check if the response was cut off mid-generation due to a safety flag
          if (candidate.finishReason === "SAFETY") {
            console.error("Response Blocked by Safety:", candidate);
            throw new HttpsError("failed-precondition", "Response blocked by safety filters.");
          }

          // Extract and return the text safely
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            return {text: candidate.content.parts[0].text};
          }
        }

        // If we reach here, the API returned an empty or malformed payload
        console.error("Gemini API Error Payload:", json);
        throw new HttpsError("internal", "No text returned from Gemini. Check Firebase logs for raw payload.");
      } catch (err) {
        console.error("Execution Error:", err);
        // Re-throw our custom HttpsErrors so the frontend can read them
        if (err instanceof HttpsError) {
          throw err;
        }
        throw new HttpsError("internal", "Failed to connect to Gemini API");
      }
    });
