import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { showSuccess, showError } from '../components/Toast';

const AccountsContext = createContext();

export function AccountsProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log("Auth state changed - User:", currentUser?.uid);
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // Load accounts when user changes
  useEffect(() => {
    if (user) {
      loadAccounts();
    } else {
      setAccounts([]);
      setSelectedAccount(null);
      setLoading(false);
    }
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      console.log("Loading accounts for user:", user.uid);
      const q = query(collection(db, 'users', user.uid, 'accounts'));
      const querySnapshot = await getDocs(q);
      const accountsData = [];
      querySnapshot.forEach((doc) => {
        accountsData.push({ id: doc.id, ...doc.data() });
      });
      
      if (accountsData.length === 0) {
        console.log("No accounts found, creating default account");
        const defaultAccount = {
          name: 'Main Account',
          type: 'checking',
          balance: 0,
          color: '#667eea',
          isDefault: true,
          createdAt: new Date()
        };
        const docRef = await addDoc(collection(db, 'users', user.uid, 'accounts'), defaultAccount);
        accountsData.push({ id: docRef.id, ...defaultAccount });
        showSuccess('Default account created!');
      }
      
      setAccounts(accountsData);
      const defaultAcc = accountsData.find(a => a.isDefault) || accountsData[0];
      setSelectedAccount(defaultAcc);
    } catch (error) {
      console.error("Error loading accounts:", error);
      showError("Failed to load accounts");
    }
    setLoading(false);
  };

  const addAccount = async (name, type, color) => {
    console.log("=== addAccount START ===");
    console.log("Name:", name);
    console.log("User:", user);
    console.log("User UID:", user?.uid);
    
    if (!user) {
      console.error("No user logged in");
      showError("You must be logged in");
      return;
    }
    
    try {
      const newAccount = {
        name,
        type: type || 'custom',
        balance: 0,
        color: color || '#667eea',
        isDefault: accounts.length === 0,
        createdAt: new Date()
      };
      
      console.log("New account:", newAccount);
      
      const collectionRef = collection(db, 'users', user.uid, 'accounts');
      console.log("Collection path: users", user.uid, "accounts");
      
      const docRef = await addDoc(collectionRef, newAccount);
      console.log("SUCCESS! Account created with ID:", docRef.id);
      
      const accountWithId = { id: docRef.id, ...newAccount };
      setAccounts([...accounts, accountWithId]);
      showSuccess(`Account "${name}" created!`);
      return accountWithId;
    } catch (error) {
      console.error("=== ERROR ===");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      showError("Failed to create account: " + error.message);
    }
  };

  const updateAccountBalance = async (accountId, amount, type) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    const newBalance = type === 'income' 
      ? account.balance + amount 
      : account.balance - amount;
    
    try {
      const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);
      await updateDoc(accountRef, { balance: newBalance });
      
      setAccounts(accounts.map(a => 
        a.id === accountId ? { ...a, balance: newBalance } : a
      ));
      
      if (selectedAccount?.id === accountId) {
        setSelectedAccount({ ...selectedAccount, balance: newBalance });
      }
    } catch (error) {
      console.error("Error updating balance:", error);
      showError("Failed to update balance");
    }
  };

  const deleteAccount = async (accountId) => {
    if (accounts.length === 1) {
      showError('Cannot delete the only account');
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', accountId));
      setAccounts(accounts.filter(a => a.id !== accountId));
      if (selectedAccount?.id === accountId) {
        const newSelected = accounts.find(a => a.id !== accountId);
        setSelectedAccount(newSelected);
      }
      showSuccess('Account deleted');
    } catch (error) {
      console.error("Error deleting account:", error);
      showError("Failed to delete account");
    }
  };

  return (
    <AccountsContext.Provider value={{
      accounts,
      selectedAccount,
      setSelectedAccount,
      addAccount,
      deleteAccount,
      updateAccountBalance,
      loading
    }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return context;
}