import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { showSuccess, showError } from '../components/ToastWithUndo';

const SavingsRulesContext = createContext();

export function SavingsRulesProvider({ children }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      loadRules();
    } else {
      setRules([]);
      setLoading(false);
    }
  }, [user]);

  const loadRules = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'savingsRules'));
      const querySnapshot = await getDocs(q);
      const rulesData = [];
      querySnapshot.forEach((doc) => {
        rulesData.push({ id: doc.id, ...doc.data() });
      });
      setRules(rulesData);
    } catch (error) {
      console.error("Error loading savings rules:", error);
    }
    setLoading(false);
  };

  const addRule = async (name, amountType, amountValue, targetType, targetId, targetName, startDate, goalAllocations = []) => {
    if (!user) return;
    try {
      const newRule = {
        name,
        amountType,
        amountValue: parseFloat(amountValue),
        targetType,
        targetId,
        targetName,
        startDate: startDate || new Date(),
        isActive: true,
        createdAt: new Date(),
        lastApplied: null,
        goalAllocations: goalAllocations // Array de { goalId, goalName, percentage }
      };
      const docRef = await addDoc(collection(db, 'users', user.uid, 'savingsRules'), newRule);
      setRules([...rules, { id: docRef.id, ...newRule }]);
      showSuccess(`Savings rule "${name}" created!`);
      return { id: docRef.id, ...newRule };
    } catch (error) {
      console.error("Error adding rule:", error);
      showError("Failed to create rule");
    }
  };

  const updateRule = async (id, data) => {
    if (!user) return;
    try {
      const ruleRef = doc(db, 'users', user.uid, 'savingsRules', id);
      await updateDoc(ruleRef, data);
      setRules(rules.map(r => r.id === id ? { ...r, ...data } : r));
      showSuccess('Rule updated!');
    } catch (error) {
      console.error("Error updating rule:", error);
    }
  };

  const deleteRule = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savingsRules', id));
      setRules(rules.filter(r => r.id !== id));
      showSuccess('Rule deleted');
    } catch (error) {
      console.error("Error deleting rule:", error);
    }
  };

  const processSalaryTransaction = async (salaryAmount, transactionId, transactionDate) => {
    if (!user || rules.length === 0) return;
    
    const transactionDateObj = transactionDate || new Date();
    
    for (const rule of rules) {
      if (!rule.isActive) continue;
      
      const startDate = rule.startDate?.toDate ? rule.startDate.toDate() : new Date(rule.startDate);
      if (transactionDateObj < startDate) continue;
      
      let amountToSave;
      if (rule.amountType === 'percentage') {
        amountToSave = salaryAmount * (rule.amountValue / 100);
      } else {
        amountToSave = rule.amountValue;
      }
      
      if (amountToSave <= 0) continue;
      
      // Primeiro, processar alocações para metas
      let remainingAmount = amountToSave;
      
      if (rule.goalAllocations && rule.goalAllocations.length > 0) {
        for (const alloc of rule.goalAllocations) {
          const goalAmount = amountToSave * (alloc.percentage / 100);
          if (goalAmount > 0) {
            remainingAmount -= goalAmount;
            
            // Atualizar progresso da meta
            const goalRef = doc(db, 'users', user.uid, 'goals', alloc.goalId);
            const goalsSnapshot = await getDocs(collection(db, 'users', user.uid, 'goals'));
            let currentSaved = 0;
            goalsSnapshot.forEach(doc => {
              if (doc.id === alloc.goalId) {
                currentSaved = doc.data().savedAmount || 0;
              }
            });
            await updateDoc(goalRef, { savedAmount: currentSaved + goalAmount });
            
            // Criar transação de alocação
            await addDoc(collection(db, 'users', user.uid, 'transactions'), {
              amount: goalAmount,
              description: `Auto-save: ${alloc.goalName} (${alloc.percentage}% of ${rule.name})`,
              category: 'Savings',
              type: 'transfer',
              date: new Date(),
              userId: user.uid,
              isAutoSave: true,
              ruleId: rule.id,
              goalId: alloc.goalId,
              linkedTransactionId: transactionId
            });
          }
        }
      }
      
      // O restante vai para o balance original
      if (remainingAmount > 0) {
        if (rule.targetType === 'goal') {
          const goalRef = doc(db, 'users', user.uid, 'goals', rule.targetId);
          const goalsSnapshot = await getDocs(collection(db, 'users', user.uid, 'goals'));
          let currentSaved = 0;
          goalsSnapshot.forEach(doc => {
            if (doc.id === rule.targetId) {
              currentSaved = doc.data().savedAmount || 0;
            }
          });
          await updateDoc(goalRef, { savedAmount: currentSaved + remainingAmount });
          
          await addDoc(collection(db, 'users', user.uid, 'transactions'), {
            amount: remainingAmount,
            description: `Auto-save: ${rule.name} (${rule.amountType === 'percentage' ? rule.amountValue + '%' : '€' + rule.amountValue})`,
            category: 'Savings',
            type: 'transfer',
            date: new Date(),
            userId: user.uid,
            isAutoSave: true,
            ruleId: rule.id,
            linkedTransactionId: transactionId
          });
        } else if (rule.targetType === 'balance') {
          const balanceRef = doc(db, 'users', user.uid, 'balances', rule.targetId);
          const balancesSnapshot = await getDocs(collection(db, 'users', user.uid, 'balances'));
          let currentBalance = 0;
          balancesSnapshot.forEach(doc => {
            if (doc.id === rule.targetId) {
              currentBalance = doc.data().amount || 0;
            }
          });
          await updateDoc(balanceRef, { amount: currentBalance + remainingAmount });
          
          await addDoc(collection(db, 'users', user.uid, 'transactions'), {
            amount: remainingAmount,
            description: `Auto-save: ${rule.name} (${rule.amountType === 'percentage' ? rule.amountValue + '%' : '€' + rule.amountValue})`,
            category: 'Savings',
            type: 'income',
            date: new Date(),
            userId: user.uid,
            isAutoSave: true,
            ruleId: rule.id,
            linkedTransactionId: transactionId
          });
        }
      }
    }
  };

  return (
    <SavingsRulesContext.Provider value={{
      rules,
      addRule,
      updateRule,
      deleteRule,
      processSalaryTransaction,
      loading
    }}>
      {children}
    </SavingsRulesContext.Provider>
  );
}

export function useSavingsRules() {
  const context = useContext(SavingsRulesContext);
  if (!context) {
    throw new Error('useSavingsRules must be used within a SavingsRulesProvider');
  }
  return context;
}