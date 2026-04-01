// hooks/useTransactions.js
import { useEffect, useState, useCallback } from "react";
import { getTransactions } from "../services/firebase/transactions";

export const useTransactions = (userId) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    try {
      const data = await getTransactions(userId);
      setTransactions(data);
    } catch (err) {
      console.error("Erro ao buscar transações:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // NOVA FUNÇÃO PARA REFRESH
  const refreshTransactions = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { transactions, loading, refreshTransactions };
};