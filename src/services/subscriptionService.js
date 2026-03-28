import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, Timestamp, collection, addDoc } from 'firebase/firestore';

/**
 * Estrutura de Subscription:
 * 
 * users/{userId}
 * ├── subscription: "free" | "pro" | "fulltime"
 * ├── subscriptionId: "sub_xyz..."
 * ├── invoiceScans: 0 (contador)
 * └── ...outros dados
 * 
 * subscriptions/{subscriptionId}
 * ├── userId: "user123"
 * ├── plan: "free" | "pro" | "fulltime"
 * ├── status: "active" | "expired" | "cancelled"
 * ├── startDate: timestamp
 * ├── renewalDate: timestamp
 * ├── price: 4.99 (mensal)
 * ├── invoiceScansLimit: 100 (pro) | unlimited (fulltime)
 * ├── features: [...] (array com features ativas)
 * └── paymentInfo: {...}
 */

/**
 * ✅ Verificar acesso ao Invoice Scanner
 */
export async function checkInvoiceScannerAccess(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return { 
        hasAccess: false, 
        subscription: 'unknown',
        message: 'Utilizador não encontrado'
      };
    }

    const subscription = userDoc.data()?.subscription || 'free';
    const hasAccess = subscription === 'pro' || subscription === 'fulltime' || subscription === 'full-time';
    
    return { 
      hasAccess, 
      subscription,
      message: hasAccess 
        ? '✅ Invoice Scanner disponível!' 
        : `🔒 Invoice Scanner é exclusivo para Pro/Full-time (você tem: ${subscription})`
    };
  } catch (error) {
    console.error('Erro ao verificar subscription:', error);
    return { 
      hasAccess: false, 
      subscription: 'error',
      message: 'Erro ao verificar acesso. Tente novamente.'
    };
  }
}

/**
 * ✅ Get subscription status
 */
export async function getSubscriptionStatus(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.data()?.subscription || 'free';
  } catch (error) {
    console.error('Erro:', error);
    return null;
  }
}

/**
 * ✅ Get full subscription details
 */
export async function getSubscriptionDetails(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const subscriptionId = userData.subscriptionId;

    if (!subscriptionId) {
      return {
        plan: userData.subscription || 'free',
        status: 'active',
        invoiceScansUsed: userData.invoiceScans || 0,
        invoiceScansLimit: -1, // Unlimited para free (não usa)
        features: []
      };
    }

    // Buscar detalhes completos da subscription
    const subDoc = await getDoc(doc(db, 'subscriptions', subscriptionId));
    if (!subDoc.exists()) {
      return null;
    }

    return {
      id: subscriptionId,
      ...subDoc.data(),
      invoiceScansUsed: userData.invoiceScans || 0
    };
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    return null;
  }
}

/**
 * ✅ Criar subscription quando user compra plano
 */
export async function createSubscription(userId, plan = 'free', paymentInfo = null) {
  try {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Detalhes do plano
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
        invoiceScansLimit: 100,
        features: ['transactions', 'budgets', 'reports', 'invoiceScanner', 'aiChat', 'insights']
      },
      fulltime: {
        price: 9.99,
        billingCycle: 'monthly',
        invoiceScansLimit: -1, // Unlimited
        features: ['transactions', 'budgets', 'reports', 'invoiceScanner', 'aiChat', 'insights', 'savingsRules', 'autoRecurring']
      }
    };

    const details = planDetails[plan] || planDetails.free;

    // Criar documento de subscription
    await setDoc(doc(db, 'subscriptions', subscriptionId), {
      userId,
      plan,
      status: 'active',
      startDate: Timestamp.now(),
      renewalDate: plan === 'free' ? null : Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
      ),
      price: details.price,
      billingCycle: details.billingCycle,
      invoiceScansLimit: details.invoiceScansLimit,
      features: details.features,
      paymentInfo: paymentInfo || null,
      createdAt: Timestamp.now()
    });

    // Atualizar user doc
    await updateDoc(doc(db, 'users', userId), {
      subscription: plan,
      subscriptionId,
      invoiceScans: 0
    });

    console.log('✅ Subscription criada:', subscriptionId);
    return subscriptionId;
  } catch (error) {
    console.error('❌ Erro ao criar subscription:', error);
    throw error;
  }
}

/**
 * ✅ Upgrade/Downgrade de plano
 */
export async function changeSubscriptionPlan(userId, newPlan) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User não encontrado');

    const oldSubscriptionId = userDoc.data().subscriptionId;
    
    // Se tinha subscription anterior, marcar como cancelled
    if (oldSubscriptionId) {
      await updateDoc(doc(db, 'subscriptions', oldSubscriptionId), {
        status: 'upgraded',
        upgradedAt: Timestamp.now()
      });
    }

    // Criar nova subscription
    const newSubscriptionId = await createSubscription(userId, newPlan);
    return newSubscriptionId;
  } catch (error) {
    console.error('❌ Erro ao trocar plano:', error);
    throw error;
  }
}

/**
 * ✅ Incrementar contador de invoice scans
 */
export async function incrementInvoiceScansCount(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const currentCount = userDoc.data()?.invoiceScans || 0;

    await updateDoc(doc(db, 'users', userId), {
      invoiceScans: currentCount + 1
    });

    console.log(`📊 Invoice scans: ${currentCount + 1}`);
  } catch (error) {
    console.error('Erro ao incrementar contador:', error);
  }
}

/**
 * ✅ Verificar se pode fazer mais scans (Pro)
 */
export async function canPerformInvoiceScan(userId) {
  try {
    const subDetails = await getSubscriptionDetails(userId);
    
    if (!subDetails) {
      return { canScan: false, reason: 'Subscription não encontrada' };
    }

    // Free e Pro têm limite
    if (subDetails.invoiceScansLimit > 0) {
      const canScan = subDetails.invoiceScansUsed < subDetails.invoiceScansLimit;
      return {
        canScan,
        used: subDetails.invoiceScansUsed,
        limit: subDetails.invoiceScansLimit,
        reason: canScan ? '' : `Limite atingido (${subDetails.invoiceScansLimit})`
      };
    }

    // Full-time: unlimited
    return { canScan: true, used: subDetails.invoiceScansUsed, limit: -1 };
  } catch (error) {
    console.error('Erro:', error);
    return { canScan: false, reason: 'Erro ao verificar' };
  }
}

/**
 * ✅ Cancel/Downgrade para Free
 */
export async function cancelSubscription(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User não encontrado');

    const subscriptionId = userDoc.data().subscriptionId;

    // Marcar como cancelled
    if (subscriptionId) {
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });
    }

    // Downgrade para free
    await updateDoc(doc(db, 'users', userId), {
      subscription: 'free',
      subscriptionId: null
    });

    console.log('✅ Subscription cancelada');
    return true;
  } catch (error) {
    console.error('❌ Erro ao cancelar:', error);
    throw error;
  }
}

/**
 * ✅ Registrar uso de feature (para analytics)
 */
export async function logFeatureUsage(userId, feature, metadata = {}) {
  try {
    await addDoc(collection(db, 'users', userId, 'featureUsage'), {
      feature,
      timestamp: Timestamp.now(),
      metadata
    });
  } catch (error) {
    console.error('Erro ao registrar uso:', error);
  }
}

/**
 * ✅ Função helper: Tornar um usuário ADMIN
 * USE APENAS EM CONTEXTOS SEGUROS (Admin Dashboard)
 */
export async function makeUserAdmin(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: 'admin'
    });
    console.log(`✅ ${userId} agora é ADMIN`);
    return true;
  } catch (error) {
    console.error('Erro ao fazer admin:', error);
    return false;
  }
}

/**
 * ✅ Função helper: Remover admin de um usuário
 */
export async function removeAdminRole(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: 'user'
    });
    console.log(`✅ ${userId} deixou de ser ADMIN`);
    return true;
  } catch (error) {
    console.error('Erro ao remover admin:', error);
    return false;
  }
}

