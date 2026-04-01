// src/services/groqClient.js
export async function groqChatCompletion({ model, messages, temperature, max_tokens }) {
  try {
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.content || 'Sorry, I could not respond.'
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      content: "🤖 I'm having trouble connecting. Please try again in a moment."
    };
  }
}// src/services/groqClient.js
export async function groqChatCompletion({ model, messages, temperature, max_tokens }) {
  try {
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 500
      })
    });
vvv
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.content || 'Sorry, I could not respond.'
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      content: "🤖 I'm having trouble connecting. Please try again in a moment."
    };
  }
}