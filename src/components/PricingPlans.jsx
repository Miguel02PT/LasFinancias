import React, { useState, useEffect } from 'react';
import { Check, X, Zap } from 'lucide-react';
import { getSubscriptionStatus, changeSubscriptionPlan } from '../services/subscriptionService';
import { showSuccess, showError } from './Toast';
import './PricingPlans.css';

export function PricingPlans({ userId, onUpgrade }) {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentPlan();
  }, [userId]);

  const loadCurrentPlan = async () => {
    const plan = await getSubscriptionStatus(userId);
    setCurrentPlan(plan);
  };

  const handleUpgrade = async (plan) => {
    if (plan === currentPlan) {
      showError('Você já tem este plano');
      return;
    }

    setLoading(true);
    try {
      await changeSubscriptionPlan(userId, plan);
      setCurrentPlan(plan);
      showSuccess(`✅ Plano atualizado para ${plan}!`);
      onUpgrade?.(plan);
    } catch (error) {
      showError('Erro ao atualizar plano');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '€0',
      period: '/mês',
      description: 'Perfeito para começar',
      features: [
        { name: 'Transações ilimitadas', included: true },
        { name: 'Categorias customizadas', included: true },
        { name: 'Relatórios básicos', included: true },
        { name: 'Invoice Scanner', included: false },
        { name: 'AI Chat', included: false },
        { name: 'Auto-Save Rules', included: false },
      ],
      cta: 'Atual',
      disabled: currentPlan === 'free'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '€4,99',
      period: '/mês',
      description: 'Para profissionais',
      recommended: true,
      features: [
        { name: 'Tudo do Free', included: true },
        { name: 'Invoice Scanner (100/mês)', included: true },
        { name: 'AI Chat & Insights', included: true },
        { name: 'Relatórios avançados', included: true },
        { name: 'Auto-Save Rules', included: false },
        { name: 'Suporte prioritário', included: false },
      ],
      cta: 'Upgrade para Pro',
      disabled: currentPlan === 'pro'
    },
    {
      id: 'fulltime',
      name: 'Full-time',
      price: '€9,99',
      period: '/mês',
      description: 'Tudo ilimitado',
      features: [
        { name: 'Tudo do Pro', included: true },
        { name: 'Invoice Scanner (Ilimitado)', included: true },
        { name: 'Auto-Save Rules avançadas', included: true },
        { name: 'Recurring transactions automáticas', included: true },
        { name: 'Analytics detalhado', included: true },
        { name: 'Suporte 24/7', included: true },
      ],
      cta: 'Upgrade para Full-time',
      disabled: currentPlan === 'fulltime'
    }
  ];

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h2>Escolha seu plano</h2>
        <p>Upgrade agora para desbloquear mais features</p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`pricing-card ${plan.recommended ? 'recommended' : ''} ${currentPlan === plan.id ? 'active' : ''}`}>
            {plan.recommended && (
              <div className="recommended-badge">
                <Zap size={16} /> Mais Popular
              </div>
            )}

            <div className="plan-header">
              <h3>{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <div className="price-section">
                <span className="price">{plan.price}</span>
                <span className="period">{plan.period}</span>
              </div>
            </div>

            <div className="features-list">
              {plan.features.map((feature, idx) => (
                <div key={idx} className={`feature ${feature.included ? 'included' : 'excluded'}`}>
                  {feature.included ? (
                    <Check size={18} className="icon-check" />
                  ) : (
                    <X size={18} className="icon-x" />
                  )}
                  <span>{feature.name}</span>
                </div>
              ))}
            </div>

            <button
              className={`cta-btn ${currentPlan === plan.id ? 'active' : ''}`}
              onClick={() => handleUpgrade(plan.id)}
              disabled={plan.disabled || loading}
            >
              {currentPlan === plan.id ? '✓ Seu Plano Atual' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-faq">
        <h3>Perguntas Frequentes</h3>
        <div className="faq-items">
          <div className="faq-item">
            <h4>Posso upgrade/downgrade a qualquer momento?</h4>
            <p>Sim! Você pode mudar de plano a qualquer momento. As mudanças têm efeito imediato.</p>
          </div>
          <div className="faq-item">
            <h4>Os dados da minha conta são sincronizados?</h4>
            <p>Sim! Independentemente do plano, todos os seus dados (transações, budgets, etc) estão sempre sincronizados.</p>
          </div>
          <div className="faq-item">
            <h4>Há período de trial?</h4>
            <p>Você começa automaticamente com o plano Free. Experimente grátis e faça upgrade quando quiser!</p>
          </div>
          <div className="faq-item">
            <h4>Como cancelo minha subscription?</h4>
            <p>Você pode downgrade para Free a qualquer momento. Nenhum compromisso!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
