import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

export async function createCheckoutSession(plan) {
  const fn = httpsCallable(functions, 'createCheckoutSession');
  const result = await fn({ plan });
  return result.data;
}

export async function createBillingPortalSession() {
  const fn = httpsCallable(functions, 'createBillingPortalSession');
  const result = await fn({});
  return result.data;
}
