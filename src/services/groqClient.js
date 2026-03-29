// src/services/groqClient.js
// Versão LOCAL - chave fica no .env.local (apenas para testes)

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function groqChatCompletion({ model, messages, temperature, max_tokens }) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 500
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Groq API error:', data);
      return {
        content: "🤖 I'm having trouble connecting. Please try again in a moment."
      };
    }
    
    return {
      content: data.choices?.[0]?.message?.content || 'Desculpa, não consegui responder.'
    };
    
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      content: "🤖 Erro ao conectar. Tenta novamente."
    };
  }
}