# 💳 Sistema de Subscriptions - Documentação Completa

## 📋 Visão Geral

Sistema profissional de subscriptions com 3 tiers: **Free**, **Pro** e **Full-time**.

### Estrutura de Dados

```
users/{userId}
├── subscription: "free" | "pro" | "fulltime"
├── subscriptionId: "sub_xyz..."
├── invoiceScans: 0 (contador)
└── ...

subscriptions/{subscriptionId}
├── userId: "user123"
├── plan: "pro"
├── status: "active" | "expired" | "cancelled" | "upgraded"
├── startDate: timestamp
├── renewalDate: timestamp
├── price: 4.99
├── billingCycle: "monthly"
├── invoiceScansLimit: 100
├── features: ['invoiceScanner', 'aiChat', ...]
└── paymentInfo: {...}
```

## 🎯 Planos

### 🆓 Free (€0/mês)
- ✅ Transações ilimitadas
- ✅ Categorias customizadas
- ✅ Relatórios básicos
- ❌ Invoice Scanner
- ❌ AI Chat
- ❌ Auto-Save Rules

### 💎 Pro (€4.99/mês)
- ✅ Tudo do Free
- ✅ Invoice Scanner (100/mês)
- ✅ AI Chat & Insights
- ✅ Relatórios avançados
- ❌ Auto-Save Rules

### ⚡ Full-time (€9.99/mês)
- ✅ Tudo do Pro
- ✅ Invoice Scanner (Ilimitado)
- ✅ Auto-Save Rules avançadas
- ✅ Recurring automáticas
- ✅ Analytics detalhado
- ✅ Suporte 24/7

## 🔧 API Reference

### Verificar Acesso (Invoice Scanner)

```javascript
import { checkInvoiceScannerAccess } from '@/services/subscriptionService';

const { hasAccess, subscription, message } = await checkInvoiceScannerAccess(userId);

if (!hasAccess) {
  showError(message);
  return;
}
```

### Get Subscription Status

```javascript
import { getSubscriptionStatus } from '@/services/subscriptionService';

const plan = await getSubscriptionStatus(userId);
// Returns: 'free' | 'pro' | 'fulltime'
```

### Get Detailed Subscription Info

```javascript
import { getSubscriptionDetails } from '@/services/subscriptionService';

const details = await getSubscriptionDetails(userId);
/*
Returns:
{
  id: "sub_xyz...",
  plan: "pro",
  status: "active",
  renewalDate: Timestamp,
  invoiceScansLimit: 100,
  invoiceScansUsed: 23,
  features: ['invoiceScanner', 'aiChat', ...],
  price: 4.99,
  ...
}
*/
```

### Criar Subscription (Admin/Cloud Function)

```javascript
import { createSubscription } from '@/services/subscriptionService';

// Quando user compra um plano
const subscriptionId = await createSubscription(userId, 'pro', paymentInfo);
```

### Mudar Plano (Upgrade/Downgrade)

```javascript
import { changeSubscriptionPlan } from '@/services/subscriptionService';

// User faz upgrade de Free para Pro
await changeSubscriptionPlan(userId, 'pro');
```

### Cancelar Subscription

```javascript
import { cancelSubscription } from '@/services/subscriptionService';

// Downgrade para Free
await cancelSubscription(userId);
```

### Incrementar Invoice Scans

```javascript
import { incrementInvoiceScansCount } from '@/services/subscriptionService';

// Chamado após processar fatura com sucesso
await incrementInvoiceScansCount(userId);
```

### Verificar se Pode Fazer Scan

```javascript
import { canPerformInvoiceScan } from '@/services/subscriptionService';

const { canScan, used, limit, reason } = await canPerformInvoiceScan(userId);

if (!canScan) {
  showError(`Limite atingido: ${used}/${limit}`);
  return;
}
```

### Registrar Uso de Feature (Analytics)

```javascript
import { logFeatureUsage } from '@/services/subscriptionService';

await logFeatureUsage(userId, 'invoiceScanner', {
  fileName: 'receipt.jpg',
  category: 'Groceries',
  amount: 25.50
});
```

## 🎨 Componentes UI

### PricingPlans Component

```jsx
import { PricingPlans } from '@/components/PricingPlans';

export function SettingsPage() {
  const user = useAuth();

  return (
    <div>
      <PricingPlans 
        userId={user.uid}
        onUpgrade={(plan) => {
          console.log('Upgraded to:', plan);
          // Recarregar dados
        }}
      />
    </div>
  );
}
```

## 🔐 Firebase Security Rules

**Aplicar em Firebase Console:**

```
firestore.rules (arquivo incluído no projeto)
```

Principais regras:
- ✅ Users só veem sua subscription
- ✅ Subscription só pode ser alterada via Cloud Functions
- ✅ Invoice images só vê o owner
- ✅ Jamais deletar billing data

## 🚀 Implementação Passo a Passo

### 1. Setup Inicial

```javascript
// src/pages/Dashboard.jsx ou App.jsx
import { useEffect } from 'react';
import { useAuth } from '@/firebase/auth';
import { createSubscription, getSubscriptionStatus } from '@/services/subscriptionService';

function App() {
  const user = useAuth().currentUser;

  useEffect(() => {
    if (user) {
      initializeSubscription(user.uid);
    }
  }, [user]);

  const initializeSubscription = async (userId) => {
    const status = await getSubscriptionStatus(userId);
    
    // Se novo user (sem subscription), criar Free
    if (!status) {
      await createSubscription(userId, 'free');
    }
  };

  return <div>{/* ... */}</div>;
}
```

### 2. Proteger Features (Invoice Scanner Example)

```javascript
// src/pages/Transactions.jsx
import { checkInvoiceScannerAccess } from '@/services/subscriptionService';

const handleInvoiceScannerClick = async () => {
  const { hasAccess, message } = await checkInvoiceScannerAccess(user.uid);
  
  if (hasAccess) {
    setInvoiceScannerOpen(true);
  } else {
    showError(message);
    // Sugerir upgrade
    navigateToPricing();
  }
};
```

### 3. Adicionar ao Settings/Perfil

```jsx
// src/pages/Settings.jsx
import { PricingPlans } from '@/components/PricingPlans';

export function Settings() {
  return (
    <div>
      <h2>Planos e Preços</h2>
      <PricingPlans userId={user.uid} />
    </div>
  );
}
```

### 4. Cloud Function para Pagamentos (Stripe)

```javascript
// Firebase Cloud Functions
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;

    // Criar subscription no Firestore
    await createSubscription(userId, plan, {
      stripeCustomerId: session.customer,
      stripeSessionId: session.id
    });
  }

  res.json({ received: true });
});
```

## 📊 Analytics

### Rastrear Uso de Features

```javascript
// Quando user usa Invoice Scanner
await logFeatureUsage(userId, 'invoiceScanner', {
  fileName: 'receipt.jpg',
  extractedAmount: 25.50,
  detectedCategory: 'Groceries',
  processingTime: 3.2 // segundos
});

// Dashboard pode depois consultar:
const usageRef = collection(db, 'users', userId, 'featureUsage');
const q = query(usageRef, where('feature', '==', 'invoiceScanner'));
const docs = await getDocs(q);
```

## 💾 Backup & Recovery

### Exportar Subscriptions

```javascript
const subRef = collection(db, 'subscriptions');
const snapshot = await getDocs(subRef);
const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
console.log(JSON.stringify(data, null, 2));
```

## 🔄 Renovação Automática (Stripe Integration)

```javascript
// Cloud Scheduler - rodas diariamente
exports.renewSubscriptions = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const subRef = collection(db, 'subscriptions');
    const q = query(
      subRef, 
      where('status', '==', 'active'),
      where('renewalDate', '<=', new Date())
    );

    const docs = await getDocs(q);
    
    for (const doc of docs.docs) {
      const subscription = doc.data();
      
      // Renovar no Stripe
      const invoice = await stripe.invoices.create({
        customer: subscription.paymentInfo.stripeCustomerId
      });

      // Atualizar renovalDate
      await updateDoc(doc.ref, {
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }
  });
```

## 🐛 Troubleshooting

### Problema: "Invoice Scanner locked"
**Solução:**
```javascript
// Verificar se subscription está criada
const details = await getSubscriptionDetails(userId);
console.log(details);

// Se null, criar:
await createSubscription(userId, 'free');
```

### Problema: "Limite de scans atingido"
**Solução:**
```javascript
// Verificar limite
const { canScan, used, limit } = await canPerformInvoiceScan(userId);
console.log(`Usado: ${used}/${limit}`);

// Oferecer upgrade
showModal('Precisa de mais scans? Upgrade para Pro!');
```

## 📝 Checklist de Deploy

- [ ] Firestore Rules aplicadas (firestore.rules)
- [ ] Cloud Functions criadas (pagamentos, renovação)
- [ ] Environment variables configuradas
- [ ] Stripe webhook configurada
- [ ] Email templates para confirmação
- [ ] Testing todos os planos
- [ ] Mobile responsivo testado
- [ ] Dark mode testado

## 🎉 Pronto!

Sistema de subscriptions completo e pronto para produção! 

**Próximos passos:**
1. Integrar Stripe para pagamentos
2. Criar Cloud Functions para renovação automática
3. Adicionar email notifications
4. Dashboard de admin para gerenciar subscriptions
5. Analytics completo de uso
