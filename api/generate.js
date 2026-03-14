// ============================================================
// api/generate.js — Vercel Serverless Function
// This runs on Vercel's servers. The API_KEY
// environment variable is never exposed to the browser.
// ============================================================

export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers — allows your frontend to call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Pull the API key from Vercel environment variables (never from the request)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  // Get the prompt payload from the request body
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt in request body.' });
  }

  // Guard against extremely large payloads
  if (prompt.length > 30000) {
    return res.status(400).json({ error: 'Prompt too large. Please shorten your resume or job description.' });
  }

  try {
    // Call the AI API from the server
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    // Handle errors from Anthropic
    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      const msg = errData?.error?.message || `Anthropic API error: ${anthropicRes.status}`;
      return res.status(anthropicRes.status).json({ error: msg });
    }

    // Parse and return the AI response
    const data = await anthropicRes.json();
    const text = (data.content || [])
      .map(block => block.type === 'text' ? block.text : '')
      .join('');

    return res.status(200).json({ result: text });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
