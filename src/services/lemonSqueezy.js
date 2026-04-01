// src/services/lemonSqueezy.js
export async function createCheckout({ variantId, userId, userEmail }) {
  try {
    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variantId,
        userId,
        userEmail
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Checkout failed');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Create checkout error:', error);
    throw error;
  }
}