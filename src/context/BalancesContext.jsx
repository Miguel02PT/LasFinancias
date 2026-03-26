import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { showSuccess, showError } from '../components/Toast';

const BalancesContext = createContext();

export function BalancesProvider({ children }) {
  const [balances, setBalances] = useState([]);
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
      loadBalances();
    } else {
      setBalances([]);
      setLoading(false);
    }
  }, [user]);

  const loadBalances = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'balances'));
      const querySnapshot = await getDocs(q);
      const balancesData = [];
      querySnapshot.forEach((doc) => {
        balancesData.push({ id: doc.id, ...doc.data() });
      });
      setBalances(balancesData);
    } catch (error) {
      console.error("Error loading balances:", error);
    }
    setLoading(false);
  };

  const addBalance = async (name, amount, includeInTotal) => {
    if (!user) return;
    try {
      const newBalance = {
        name,
        amount: parseFloat(amount),
        includeInTotal,
        createdAt: new Date()
      };
      const docRef = await addDoc(collection(db, 'users', user.uid, 'balances'), newBalance);
      setBalances([...balances, { id: docRef.id, ...newBalance }]);
      showSuccess(`Balance "${name}" created!`);
      return { id: docRef.id, ...newBalance };
    } catch (error) {
      console.error("Error adding balance:", error);
      showError("Failed to create balance");
    }
  };

  const deleteBalance = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'balances', id));
      setBalances(balances.filter(b => b.id !== id));
      showSuccess('Balance deleted');
    } catch (error) {
      console.error("Error deleting balance:", error);
      showError("Failed to delete balance");
    }
  };

  const updateBalance = async (id, amount) => {
    try {
      const balanceRef = doc(db, 'users', user.uid, 'balances', id);
      await updateDoc(balanceRef, { amount });
      setBalances(balances.map(b => b.id === id ? { ...b, amount } : b));
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  };

  const getTotalWithBalances = (transactionTotal) => {
    const includedBalances = balances
      .filter(b => b.includeInTotal)
      .reduce((sum, b) => sum + b.amount, 0);
    return transactionTotal + includedBalances;
  };

  return (
    <BalancesContext.Provider value={{
      balances,
      addBalance,
      deleteBalance,
      updateBalance,
      getTotalWithBalances,
      loading
    }}>
      {children}
    </BalancesContext.Provider>
  );
}

export function useBalances() {
  const context = useContext(BalancesContext);
  if (!context) {
    throw new Error('useBalances must be used within a BalancesProvider');
  }
  return context;
}