// api/webhook.js
import { db } from '../src/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];

  // Verify webhook signature (security)
  if (WEBHOOK_SECRET && signature) {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
    
    if (signature !== digest) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const payload = req.body;
  const { event_name, data } = payload;

  console.log(`Webhook received: ${event_name}`);

  try {
    // Handle different events
    switch (event_name) {
      case 'order_created':
      case 'subscription_created':
      case 'subscription_updated': {
        const userId = data.attributes.custom_data?.user_id;
        const variantId = data.attributes.first_order_item?.variant_id;
        
        if (!userId) {
          console.error('No user_id in custom_data');
          break;
        }

        // Map variant ID to plan
        const PRO_VARIANT = '1460089';
        const PREMIUM_VARIANT = '1460101';
        
        let plan = 'free';
        if (variantId?.toString() === PRO_VARIANT) plan = 'pro';
        if (variantId?.toString() === PREMIUM_VARIANT) plan = 'fulltime';

        // Update user subscription in Firestore
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          subscription: plan,
          subscriptionId: data.attributes.subscription_id,
          stripeCustomerId: data.attributes.customer_id,
          subscriptionStatus: 'active',
          updatedAt: new Date().toISOString()
        });

        console.log(`User ${userId} updated to ${plan}`);
        break;
      }

      case 'subscription_cancelled': {
        const userId = data.attributes.custom_data?.user_id;
        
        if (userId) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            subscription: 'free',
            subscriptionStatus: 'cancelled',
            updatedAt: new Date().toISOString()
          });
          console.log(`User ${userId} cancelled subscription`);
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${event_name}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}