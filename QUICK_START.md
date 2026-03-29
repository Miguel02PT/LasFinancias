# 🚀 LasFinancias - Quick Start Guide

## Ambiente de Produção

### 1. Verificar Firebase Config
```bash
# Verificar firebase.json
cat firebase.json
```

### 2. Build para Produção
```bash
npm run build
```

### 3. Deploy
```bash
# Fazer deploy
firebase deploy

# Ou apenas frontend
firebase deploy --only hosting

# Ou apenas Firestore rules
firebase deploy --only firestore:rules
```

### 4. Monitorar Errors
```
Firebase Console → Analytics → Errors
```

---

## 🧪 Testar Localmente

### Start Dev Server
```bash
npm run dev
```

### Testar Fluxo Completo

#### 1. User Novo
```
1. http://localhost:5173/login
2. Criar new account: test@example.com / password123
3. Verificar Firestore: users/{uid} foi criado com subscription: "free"
4. Ir para Settings - deve mostrar "FREE"
```

#### 2. Upgrade para Pro
```
1. Ir para Pricing (/pricing)
2. Clicar "Upgrade to Pro"
3. Verificar: subscription field em users/{uid} = "pro"
4. Ir para Transactions e testar Invoice Scanner
```

#### 3. Admin Dashboard
```
1. Ir para Firebase Console
2. users/{seu-uid} - adicionar field: role: "admin"
3. Ir para Settings
4. Clicar "Admin Dashboard"
5. Deve mostrar stats e lista de users
```

---

## 🔐 Firestore Security Rules (Crítico)

Verificar se regras estão deploiadas:

```bash
firebase deploy --only firestore:rules
```

Conteúdo esperado:
- Users só conseguem ler/escrever seu próprio doc
- Subscriptions só readable por owner
- Admin operations protegidas

---

## 📝 Dados de Teste

### User Teste (FREE)
- Email: `user.free@test.com`
- Subscription: `free`
- Features: Transactions, Budgets, Reports

### User Teste (PRO)
- Email: `user.pro@test.com`
- Subscription: `pro`
- Invoice Scans: 0/100
- Features: Tudo + Invoice Scanner

### User Admin
- Email: `admin@test.com`
- Role: `admin`
- Acesso: /admin dashboard

```sql
-- Query para criar dados teste no Firestore:
// Ir ao Firebase Console → Firestore → New Document

// Collection: users
// Document ID: (deixar auto-gerar)
{
  "email": "user.pro@test.com",
  "subscription": "pro",
  "role": "user",
  "createdAt": timestamp.now(),
  "invoiceScans": 0
}
```

---

## ✅ Pre-Launch Checklist

- [ ] Build roda sem erros: `npm run build`
- [ ] Nenhum console.error em produção
- [ ] Dark mode funciona em todas as páginas
- [ ] Mobile responsive (testar em 320px, 768px, 1024px)
- [ ] Form validation funciona
- [ ] Error messages são claras
- [ ] Loading states visíveis
- [ ] Logout funciona
- [ ] Google login funciona
- [ ] Upgrade/Downgrade funciona
- [ ] Invoice Scanner bloqueia users FREE

---

## 🐛 Troubleshooting

### "useBalances is not defined"
→ ErrorBoundary vai mostrar friendly message
→ Verificar se BalancesProvider está no App.jsx

### "Subscription não mostra em Settings"
→ Verificar se getSubscriptionDetails() retorna dados
→ Testar em console: `await getSubscriptionDetails(userId)`

### "Invoice Scanner não funciona"
→ Testar OCR locally: `npm test -- invoiceService`
→ Verificar API key Groq em .env

### "Admin Dashboard mostra 0 users"
→ Verificar collection users tem documents
→ Checar Firestore console para dados

---

## 📊 Monitoring Após Launch

### Metricas Importantes
1. **User Signup Rate** - Quantos users novos/dia
2. **Subscription Conversion** - % de FREE → PRO
3. **Feature Usage** - Quantos usam Invoice Scanner
4. **Error Rate** - Quantos erros/dia
5. **Session Duration** - Tempo médio de uso

### Tools Recomendados
- Google Analytics (free)
- Sentry (error tracking)
- Firebase Analytics (free)

---

## 🚀 Performance Tips

1. **Service Worker** (já implementado)
   - Já existe em public/sw.js
   - Caches assets automaticamente

2. **Lazy Load Routes**
   - React.lazy() para pages (já configurado)

3. **Image Optimization**
   - Invoice compress a 70% qualidade
   - Max 1200x1200px

4. **Pagination** (não implementado - FUTURE)
   - Limitar queries a 25 items
   - Load more button

---

## 🎯 Roadmap Pós-Launch (1-3 meses)

### Week 1-2
- [x] Launch & monitor
- [ ] Fix bugs relatados
- [ ] Optimize performance

### Week 3-4
- [ ] Stripe integration
- [ ] Email notifications
- [ ] Password reset

### Month 2
- [ ] Analytics dashboard
- [ ] Export data feature
- [ ] Mobile app (React Native)

### Month 3
- [ ] Cloud Functions automation
- [ ] Advanced reporting
- [ ] API para integrations

---

## 📞 Support

- **Email**: support@lasfinancias.com (FUTURE)
- **Discord**: [Community](https://discord.gg/lasfinancias) (FUTURE)
- **Issues**: GitHub Issues (FUTURE)

---

**Last Updated**: 2026-03-28
**Status**: 🟢 READY TO LAUNCH
