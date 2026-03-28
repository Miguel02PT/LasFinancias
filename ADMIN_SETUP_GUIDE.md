# LasFinancias - Admin Setup & Subscription Guide

## 🚀 Como Fazer Sua Conta ser PRO/FULL-TIME

### Opção 1: Através do Firebase Console (Rápido)
1. Aceda a [Firebase Console](https://console.firebase.google.com/)
2. Seleccione o seu projeto `financias-app`
3. Vá para **Firestore Database**
4. Navegue até `users/{seu-user-id}`
5. Edite o documento e adicione/modifique:
```json
{
  "subscription": "pro",  // ou "fulltime"
  "role": "admin"  // (opcional) para dar acesso ao Admin Dashboard
}
```

### Opção 2: Através da App (Com Admin Dashboard)
1. Aceda ao seu Firebase Console
2. Faça query na collection `users` e encontre o seu user-id
3. Atualize manualmente: `"subscription": "pro"` ou `"fulltime"`
4. Agora aceda a `/admin` e use o Admin Dashboard para gerir tudo
5. Para ganhar acesso de Admin pela primeira vez, use o método anterior ou:
   - Crie outro utilizador
   - Use a query para fazer o 1º user Admin
   - Depois use o Admin Dashboard para gerir outros admins

---

## 🛡️ O Que Incluir no Admin Dashboard

O Admin Dashboard desenvolvido **já inclui tudo isto**:

### 📊 1. **Dashboard com Estatísticas**
- ✅ Total de utilizadores
- ✅ Utilizadores por plano (Free, Pro, Full-Time)
- ✅ Revenue mensal calculado automaticamente
- ✅ Contador de subscriptions ativas
- ✅ Contagem de Invoice Scans usado

### 👥 2. **User Management**
- ✅ Lista de todos os utilizadores
- ✅ Filtros por plano de subscricão
- ✅ Coluna de role (user/admin)
- ✅ Coluna de invoice scans usage

### ⚙️ 3. **Ações Disponíveis por Utilizador**
- ✅ **Upgrade/Downgrade de Plano**: Free → Pro → Full-Time
- ✅ **Tornar Admin**: Dar acesso de Admin Dashboard a outro utilizador
- ✅ **Ver Status Completo**: Subscription status, role, scans usado

### 💳 4. **Planos & Preços** (Em Dashboard)
- ✅ **Free**: €0/mês, sem Invoice Scanner
- ✅ **Pro**: €4.99/mês, 100 Invoice Scans/mês
- ✅ **Full-Time**: €9.99/mês, Invoice Scans UNLIMITED

### 📈 5. **Funcionalidades de Reporting**
- ✅ Revenue total calculado em tempo real
- ✅ Distribuição de utilizadores por plano
- ✅ Filtros para análise rápida

---

## 📋 O Que Falta Para Produção (Stripe Integration)

Para sistema **completo de pagamentos**, faltam:

### 1. **Stripe Integration**
```javascript
// Exemplo: Cloud Function para criar Stripe checkout
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCheckout = functions.https.onCall(async (data, context) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: data.plan },
        unit_amount: data.price * 100  // em centavos
      },
      quantity: 1
    }],
    mode: 'subscription',
    success_url: `${domain}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${domain}/pricing`
  });
  return { sessionId: session.id };
});
```

### 2. **Webhook para Actualizações**
```javascript
// Stripe Webhook para actualizar subscriptions em Firestore
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;
  
  switch (event.type) {
    case 'customer.subscription.updated':
      // Actualizar subscricão em Firestore
      break;
    case 'customer.subscription.deleted':
      // Downgrade para Free
      break;
  }
});
```

### 3. **Security Rules** (Firestore)
```
match /subscriptions/{subscriptionId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if isAdmin();  // Apenas Cloud Functions/Admin
}
```

---

## 🔐 Security Best Practices

### 1. **Roles & Permissions**
```javascript
// Verificar se é admin
const isAdmin = userDoc.data()?.role === 'admin';

// Aplicar antes de atualizar subscriptions
if (!isAdmin) throw new Error('Unauthorized');
```

### 2. **Audit Logging**
```javascript
// Log de todas as alterações de admin
await addDoc(collection(db, 'adminLogs'), {
  admin: adminId,
  action: 'upgraded_user',
  targetUser: userId,
  newPlan: 'pro',
  timestamp: Timestamp.now()
});
```

### 3. **Rate Limiting**
- Limitar número de invoice scans por hora
- Verificar quotas antes de processar

---

## 🚀 Próximos Passos Recomendados

1. **Implementar Stripe Payments**
   - Criar Cloud Functions
   - Configurar webhooks
   - Testar fluxo completo

2. **Email Notifications**
   - Confirmação de upgrade
   - Lembretes de renovação
   - Alertas de quota atingida

3. **Analytics Dashboard** (Outro Admin Panel)
   - Gráficos de revenue
   - Churn rate
   - Feature usage por plano

4. **Automated Renewal**
   - Stripe já faz isto automaticamente
   - Mas testar edge cases

5. **Customer Support Portal**
   - Histórico de transações
   - Downgrade/Cancel opcions
   - Refund requests

---

## 📝 Estrutura de Dados (Firestore)

### Coleção: `users/`
```json
{
  "uid": "user123",
  "email": "user@example.com",
  "subscription": "pro",           // free | pro | fulltime
  "subscriptionId": "sub_xyz...",  // ID no Stripe
  "invoiceScans": 45,              // Contador
  "role": "user",                  // user | admin
  "createdAt": "2024-01-01T00:00Z",
  "stripeCustomerId": "cus_xyz..."
}
```

### Coleção: `subscriptions/`
```json
{
  "subscriptionId": {
    "userId": "user123",
    "plan": "pro",
    "status": "active",             // active | expired | cancelled
    "stripeSubscriptionId": "sub_xyz...",
    "startDate": "2024-01-01T00:00Z",
    "renewalDate": "2024-02-01T00:00Z",
    "price": 4.99,
    "invoiceScansLimit": 100,       // -1 para unlimited
    "features": ["invoiceScanner", "aiChat"]
  }
}
```

### Coleção: `adminLogs/`
```json
{
  "timestamp": "2024-01-01T00:00Z",
  "admin": "admin123",
  "action": "upgraded_user",        // upgraded | downgraded | madeAdmin | etc
  "targetUser": "user456",
  "oldPlan": "free",
  "newPlan": "pro",
  "reason": "User self-upgraded"
}
```

---

## ✅ Checklist de Implementação

- [x] Subscription context & service
- [x] Settings page com info de subscription
- [x] Admin Dashboard com user management
- [x] Preços página (PricingPlans component)
- [x] Feature gating por plan
- [ ] Stripe integration & checkout
- [ ] Webhook handlers
- [ ] Email notifications
- [ ] Audit logging completo
- [ ] Rate limiting
- [ ] Analytics dashboard
- [ ] Customer support portal

---

## 🆘 Troubleshooting

### "Erro: Não vejo Admin Dashboard"
→ Verifique se tem `role: "admin"` no seu user doc em Firestore

### "Revenue está a 0"
→ Verifique se osUsers têm `subscription: "pro"` ou `"fulltime"`

### "Filtros não funcionam"
→ Verifique a console.log para erros na collection query

---

## 📞 Support

Para adicionar funcionalidades, adapte com:
- Cloud Functions do Firebase
- Stripe SDK
- SendGrid para emails
- Google Analytics para tracking

Good luck! 🚀
