const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

exports.generateWithGemini = onCall(async (request) => {
  // Ensure the user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to use AI features.");
  }

  const { prompt, temperature = 0.7 } = request.data;
  
  if (!prompt) {
    throw new HttpsError("invalid-argument", "Prompt is required.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error("GEMINI_API_KEY is not set in the environment.");
    throw new HttpsError("internal", "Server configuration error.");
  }

  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  try {
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      logger.error("Gemini API Error", data.error);
      throw new HttpsError("internal", data.error.message || "Failed to generate content.");
    }
    
    const generatedText = data.candidates[0].content.parts[0].text;
    return { text: generatedText };

  } catch (error) {
    logger.error("Error communicating with Gemini", error);
    throw new HttpsError("internal", "An error occurred while communicating with the AI service.");
  }
});
