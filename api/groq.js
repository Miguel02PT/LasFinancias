// api/groq.js - versão corrigida
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Buscar userId do header (enviado pelo frontend)
  const userId = req.headers['x-user-id'];
  
  // Rate limiting simples (opcional - podes remover esta secção)
  // Para já, recomendo remover e adicionar depois se necessário

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