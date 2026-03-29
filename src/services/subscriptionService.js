import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, Timestamp, collection, addDoc } from 'firebase/firestore';

/** Invoice scans + AI chat quotas */
export const FREE_TOTAL_AI_MESSAGES = 5;
export const PRO_DAILY_INVOICE_LIMIT = 5;
export const PRO_DAILY_AI_MESSAGES = 5;

export function todayLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isPremiumPlanKey(planKey) {
  const k = String(planKey || '').toLowerCase();
  return k === 'fulltime' || k === 'full-time';
}

export function isProPlanKey(planKey) {
  return String(planKey || '').toLowerCase() === 'pro';
}

/**
 * users/{userId} may include:
 * invoiceScanDay, invoiceScanDayCount — Pro/Premium invoice daily tracking (Pro capped)
 * aiChatDay, aiChatDayCount — Pro AI chat daily cap
 * aiChatTotal — Free users AI chat lifetime counter
 * invoiceScans — lifetime counter (optional, Premium)
 */
function buildUsageFields(userData) {
  const planKey = String(userData.subscription || 'free').toLowerCase();
  const today = todayLocalDateString();

  const invDay = userData.invoiceScanDay || '';
  const invCount = Number(userData.invoiceScanDayCount || 0);
  const invoiceUsedToday = invDay === today ? invCount : 0;

  const chatDay = userData.aiChatDay || '';
  const chatCount = Number(userData.aiChatDayCount || 0);
  const aiChatUsedToday = chatDay === today ? chatCount : 0;

  let invoiceScansLimit = 0;
  let invoiceScansUsed = 0;
  let invoiceScansPeriod = 'none';

  let aiChatDailyLimit = 0;
  let aiChatTotal = 0;

  if (planKey === 'free') {
    invoiceScansPeriod = 'none';
    aiChatDailyLimit = FREE_TOTAL_AI_MESSAGES;
    aiChatTotal = Number(userData.aiChatTotal || 0);
  } else if (isProPlanKey(planKey)) {
    invoiceScansLimit = PRO_DAILY_INVOICE_LIMIT;
    invoiceScansUsed = invoiceUsedToday;
    invoiceScansPeriod = 'day';
    aiChatDailyLimit = PRO_DAILY_AI_MESSAGES;
  } else if (isPremiumPlanKey(planKey)) {
    invoiceScansLimit = -1;
    invoiceScansUsed = Number(userData.invoiceScans || 0);
    invoiceScansPeriod = 'unlimited';
    aiChatDailyLimit = -1;
  }

  return {
    planKey,
    invoiceScansLimit,
    invoiceScansUsed,
    invoiceScansPeriod,
    aiChatDailyLimit,
    aiChatUsedToday,
    aiChatUsedTodayRaw: aiChatUsedToday,
    aiChatTotal
  };
}

function mergeSubscriptionDetails(userData, base) {
  const u = buildUsageFields(userData);
  return {
    ...base,
    plan: userData.subscription || base.plan || 'free',
    invoiceScansUsed: u.invoiceScansUsed,
    invoiceScansLimit: u.invoiceScansLimit,
    invoiceScansPeriod: u.invoiceScansPeriod,
    aiChatDailyLimit: u.aiChatDailyLimit,
    aiChatUsedToday: u.aiChatUsedToday
  };
}

export async function checkInvoiceScannerAccess(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return {
        hasAccess: false,
        subscription: 'unknown',
        message: 'User not found.'
      };
    }

    const userData = userDoc.data();
    const planKey = String(userData.subscription || 'free').toLowerCase();

    if (planKey === 'free') {
      return {
        hasAccess: false,
        subscription: 'free',
        message: 'Invoice capture is available on Pro and Premium. Upgrade to scan receipts.'
      };
    }

    if (isPremiumPlanKey(planKey)) {
      return {
        hasAccess: true,
        subscription: planKey,
        message: 'Invoice scanner available.'
      };
    }

    if (isProPlanKey(planKey)) {
      const u = buildUsageFields(userData);
      if (u.invoiceScansUsed >= PRO_DAILY_INVOICE_LIMIT) {
        return {
          hasAccess: false,
          subscription: 'pro',
          message: `Daily invoice limit reached (${PRO_DAILY_INVOICE_LIMIT}/day). Try again tomorrow or upgrade to Premium.`
        };
      }
      return {
        hasAccess: true,
        subscription: 'pro',
        message: 'Invoice scanner available.'
      };
    }

    return {
      hasAccess: false,
      subscription: planKey,
      message: 'Invoice capture is available on Pro and Premium.'
    };
  } catch (error) {
    console.error('checkInvoiceScannerAccess:', error);
    return {
      hasAccess: false,
      subscription: 'error',
      message: 'Could not verify access. Try again.'
    };
  }
}

export async function getSubscriptionStatus(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.data()?.subscription || 'free';
  } catch (error) {
    console.error('getSubscriptionStatus:', error);
    return null;
  }
}

export async function getSubscriptionDetails(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();

    if (userData.stripeSubscriptionId) {
      return mergeSubscriptionDetails(userData, {
        status: userData.subscriptionStatus || 'active',
        features: []
      });
    }

    const subscriptionId = userData.subscriptionId;

    if (!subscriptionId) {
      return mergeSubscriptionDetails(userData, {
        status: 'active',
        features: []
      });
    }

    const subDoc = await getDoc(doc(db, 'subscriptions', subscriptionId));
    if (!subDoc.exists()) {
      return mergeSubscriptionDetails(userData, { status: 'active', features: [] });
    }

    return mergeSubscriptionDetails(userData, {
      id: subscriptionId,
      ...subDoc.data(),
      features: subDoc.data().features || []
    });
  } catch (error) {
    console.error('getSubscriptionDetails:', error);
    return null;
  }
}

/**
 * AI chat quota (chat widget only). Free: 5 total. Pro: 5/day. Premium: unlimited.
 */
export async function getAiChatQuota(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { allowed: false, remaining: 0, limit: 0, plan: 'unknown', message: 'Not signed in.' };
    }
    const userData = userDoc.data();
    const u = buildUsageFields(userData);

    if (u.planKey === 'free') {
      const remaining = Math.max(0, FREE_TOTAL_AI_MESSAGES - u.aiChatTotal);
      return {
        allowed: remaining > 0,
        remaining,
        limit: FREE_TOTAL_AI_MESSAGES,
        plan: 'free',
        message:
          remaining <= 0
            ? 'Free AI message limit reached (5 total). Upgrade to Pro for 5/day or Premium for unlimited.'
            : ''
      };
    }

    if (isProPlanKey(u.planKey)) {
      const remaining = Math.max(0, PRO_DAILY_AI_MESSAGES - u.aiChatUsedToday);
      return {
        allowed: remaining > 0,
        remaining,
        limit: PRO_DAILY_AI_MESSAGES,
        plan: 'pro',
        message:
          remaining <= 0
            ? 'Daily AI message limit reached (5/day). Resets at midnight, or upgrade to Premium for unlimited chat.'
            : ''
      };
    }

    if (isPremiumPlanKey(u.planKey)) {
      return { allowed: true, remaining: -1, limit: -1, plan: 'premium', message: '' };
    }

    return { allowed: false, remaining: 0, limit: 0, plan: u.planKey, message: 'Upgrade to use AI chat.' };
  } catch (error) {
    console.error('getAiChatQuota:', error);
    return { allowed: false, remaining: 0, limit: 0, plan: 'error', message: 'Could not verify quota.' };
  }
}

export async function incrementAiChatMessageCount(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const planKey = String(userData.subscription || 'free').toLowerCase();

    if (planKey === 'free') {
      const total = Number(userData.aiChatTotal || 0);
      await updateDoc(userRef, {
        aiChatTotal: total + 1
      });
      return;
    }

    if (isProPlanKey(planKey)) {
      const today = todayLocalDateString();
      const storedDay = userData.aiChatDay || '';
      const dayCount = Number(userData.aiChatDayCount || 0);
      const next = storedDay === today ? dayCount + 1 : 1;

      await updateDoc(userRef, {
        aiChatDay: today,
        aiChatDayCount: next
      });
      return;
    }

    // Premium users (fulltime) don't need counting
  } catch (error) {
    console.error('incrementAiChatMessageCount:', error);
  }
}

export async function createSubscription(userId, plan = 'free', paymentInfo = null) {
  try {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const planDetails = {
      free: {
        price: 0,
        billingCycle: 'lifetime',
        invoiceScansLimit: 0,
        features: ['transactions', 'budgets', 'reports']
      },
      pro: {
        price: 4.99,
        billingCycle: 'monthly',
        invoiceScansLimit: PRO_DAILY_INVOICE_LIMIT,
        features: ['transactions', 'budgets', 'reports', 'invoiceScanner', 'aiChat', 'insights']
      },
      fulltime: {
        price: 9.99,
        billingCycle: 'monthly',
        invoiceScansLimit: -1,
        features: [
          'transactions',
          'budgets',
          'reports',
          'invoiceScanner',
          'aiChat',
          'insights',
          'savingsRules',
          'autoRecurring'
        ]
      }
    };

    const details = planDetails[plan] || planDetails.free;

    await setDoc(doc(db, 'subscriptions', subscriptionId), {
      userId,
      plan,
      status: 'active',
      startDate: Timestamp.now(),
      renewalDate:
        plan === 'free'
          ? null
          : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      price: details.price,
      billingCycle: details.billingCycle,
      invoiceScansLimit: details.invoiceScansLimit,
      features: details.features,
      paymentInfo: paymentInfo || null,
      createdAt: Timestamp.now()
    });

    await updateDoc(doc(db, 'users', userId), {
      subscription: plan,
      subscriptionId,
      invoiceScans: 0
    });

    return subscriptionId;
  } catch (error) {
    console.error('createSubscription:', error);
    throw error;
  }
}

export async function changeSubscriptionPlan(userId, newPlan) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User not found');

    const oldSubscriptionId = userDoc.data().subscriptionId;

    if (oldSubscriptionId) {
      await updateDoc(doc(db, 'subscriptions', oldSubscriptionId), {
        status: 'upgraded',
        upgradedAt: Timestamp.now()
      });
    }

    return await createSubscription(userId, newPlan);
  } catch (error) {
    console.error('changeSubscriptionPlan:', error);
    throw error;
  }
}

export async function incrementInvoiceScansCount(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const planKey = String(userData.subscription || 'free').toLowerCase();

    if (planKey === 'free') return;

    const today = todayLocalDateString();
    const total = Number(userData.invoiceScans || 0);

    if (isPremiumPlanKey(planKey)) {
      await updateDoc(userRef, {
        invoiceScans: total + 1
      });
      return;
    }

    if (isProPlanKey(planKey)) {
      const storedDay = userData.invoiceScanDay || '';
      const dayCount = Number(userData.invoiceScanDayCount || 0);
      const next = storedDay === today ? dayCount + 1 : 1;
      await updateDoc(userRef, {
        invoiceScanDay: today,
        invoiceScanDayCount: next,
        invoiceScans: total + 1
      });
    }
  } catch (error) {
    console.error('incrementInvoiceScansCount:', error);
  }
}

export async function canPerformInvoiceScan(userId) {
  try {
    const subDetails = await getSubscriptionDetails(userId);

    if (!subDetails) {
      return { canScan: false, reason: 'Subscription not found' };
    }

    const period = subDetails.invoiceScansPeriod;

    if (period === 'none') {
      return { canScan: false, reason: 'Invoice scanner requires Pro or Premium' };
    }

    if (period === 'day') {
      const canScan = subDetails.invoiceScansUsed < subDetails.invoiceScansLimit;
      return {
        canScan,
        used: subDetails.invoiceScansUsed,
        limit: subDetails.invoiceScansLimit,
        reason: canScan ? '' : `Daily limit (${subDetails.invoiceScansLimit} scans)`
      };
    }

    return { canScan: true, used: subDetails.invoiceScansUsed, limit: -1 };
  } catch (error) {
    console.error('canPerformInvoiceScan:', error);
    return { canScan: false, reason: 'Could not verify' };
  }
}

export async function cancelSubscription(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User not found');

    const subscriptionId = userDoc.data().subscriptionId;

    if (subscriptionId) {
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });
    }

    await updateDoc(doc(db, 'users', userId), {
      subscription: 'free',
      subscriptionId: null
    });

    return true;
  } catch (error) {
    console.error('cancelSubscription:', error);
    throw error;
  }
}

export async function logFeatureUsage(userId, feature, metadata = {}) {
  try {
    await addDoc(collection(db, 'users', userId, 'featureUsage'), {
      feature,
      timestamp: Timestamp.now(),
      metadata
    });
  } catch (error) {
    console.error('logFeatureUsage:', error);
  }
}

export async function makeUserAdmin(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: 'admin'
    });
    return true;
  } catch (error) {
    console.error('makeUserAdmin:', error);
    return false;
  }
}

export async function removeAdminRole(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: 'user'
    });
    return true;
  } catch (error) {
    console.error('removeAdminRole:', error);
    return false;
  }
}
