export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, temperature = 0.7 } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in the environment.');
    return res.status(500).json({ error: 'Server configuration error.' });
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
      console.error('Gemini API Error:', data.error);
      return res.status(500).json({ error: data.error.message || 'Failed to generate content.' });
    }
    
    const generatedText = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ text: generatedText });

  } catch (error) {
    console.error('Error communicating with Gemini:', error);
    return res.status(500).json({ error: 'An error occurred while communicating with the AI service.' });
  }
}
