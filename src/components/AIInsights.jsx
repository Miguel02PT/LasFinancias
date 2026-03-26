import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';
import { analyzeTransactions } from '../services/aiService';
import './AIInsights.css';

function AIInsights({ transactions }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    if (transactions.length < 3) return;
    
    setLoading(true);
    const result = await analyzeTransactions(transactions);
    setInsights(result);
    setLoading(false);
  };

  return (
    <div className="ai-insights">
      <div className="ai-header">
        <Sparkles size={20} />
        <h3>AI Financial Assistant</h3>
        <button onClick={fetchInsights} disabled={loading}>
          {loading ? 'Analyzing...' : 'Get Insights'}
        </button>
      </div>
      
      {insights && (
        <div className="insights-content">
          {insights.alerts && (
            <div className="alert-card">
              <AlertCircle size={18} />
              <span>{insights.alerts[0]}</span>
            </div>
          )}
          
          <div className="tips-list">
            <Lightbulb size={18} />
            <ul>
              {insights.tips?.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIInsights;