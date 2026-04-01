// api/create-checkout.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { variantId, userId, userEmail } = req.body;

  if (!variantId || !userId || !userEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
  const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;

  if (!LEMON_SQUEEZY_API_KEY || !STORE_ID) {
    return res.status(500).json({ error: 'API not configured' });
  }

  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                user_id: userId,
                user_email: userEmail
              }
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: STORE_ID
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId.toString()
              }
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Lemon Squeezy API error:', data);
      throw new Error(data.errors?.[0]?.detail || 'Checkout creation failed');
    }

    const checkoutUrl = data.data.attributes.url;

    return res.status(200).json({ url: checkoutUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}