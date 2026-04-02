// api/groq.js - Rate limiting em memória (sem dependências externas)
const rateLimitMap = new Map();

// Limpar o mapa a cada hora (opcional, para não acumular memória)
setInterval(() => {
  rateLimitMap.clear();
}, 60 * 60 * 1000); // 1 hora

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting por IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'localhost';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxRequests = 10;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip).filter(t => now - t < windowMs);
  
  if (timestamps.length >= maxRequests) {
    return res.status(429).json({ 
      error: 'Too many requests. Please wait a moment.',
      retryAfter: Math.ceil((windowMs - (now - timestamps[0])) / 1000)
    });
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  const { model, messages, temperature, max_tokens } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 500
      })
    });

    const data = await response.json();
    
    return res.status(200).json({
      content: data.choices?.[0]?.message?.content || ''
    });
    
  } catch (error) {
    console.error('Groq API error:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
}