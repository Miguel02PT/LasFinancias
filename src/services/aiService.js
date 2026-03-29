import { groqChatCompletion } from './groqClient';

// Cache para evitar requests desnecessários
const CACHE_KEY = 'ai_insights_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export async function analyzeTransactions(transactions) {
  console.log("Analisando", transactions.length, "transações com Groq AI");
  
  if (transactions.length === 0) {
    return {
      alerts: null,
      tips: ["Adicione algumas transações para receber dicas personalizadas!"]
    };
  }

  // Verificar cache
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp, transactionCount } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION && transactionCount === transactions.length) {
        console.log("Usando cache da IA");
        return data;
      }
    } catch (e) {
      console.log("Cache inválido, buscando nova análise");
    }
  }

  try {
    // Calcular estatísticas
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const categories = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});
    
    const prompt = `You are a financial advisor. Analyze this user's financial data and provide insights.
    
User Data:
- Total Income: €${totalIncome}
- Total Expenses: €${totalExpense}
- Savings: €${totalIncome - totalExpense}
- Savings Rate: ${totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0}%
- Expenses by category: ${JSON.stringify(categories)}
- Number of transactions: ${transactions.length}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "alerts": ["alert text here"] or null,
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Rules:
- Alerts: Only show if expenses > 80% of income, or if savings rate is below 10%
- Tips: Give 3 personalized, actionable financial tips based on their actual spending data
- Be specific and helpful, mention their actual spending patterns`;

    const { content: textRaw } = await groqChatCompletion({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });
    const text = textRaw || "{}";

    console.log("Resposta da IA:", text);
    
    // Limpar a resposta (remover markdown se houver)
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    const result = {
      alerts: parsed.alerts || null,
      tips: parsed.tips || [
        "💰 Continue acompanhando seus gastos regularmente",
        "🎯 Defina metas de poupança realistas",
        "📊 Use os relatórios para entender seus padrões"
      ]
    };
    
    // Guardar em cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: result,
      timestamp: Date.now(),
      transactionCount: transactions.length
    }));
    
    return result;
    
  } catch (error) {
    console.error("Erro na IA:", error);
    return {
      alerts: null,
      tips: [
         "🤖 AI temporarily unavailable. Try again in a few seconds.",
      "💰 Keep recording your transactions",
      "📊 Use reports for manual analysis"
      ]
    };
  }
}