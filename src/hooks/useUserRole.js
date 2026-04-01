// hooks/useUserRole.js
import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache para evitar múltiplos listeners
const roleCache = new Map();

export function useUserRole(userId) {
  const [isAdmin, setIsAdmin] = useState(() => {
    // Inicializar com valor em cache se existir
    return roleCache.get(userId) === 'admin' || false;
  });
  const [loading, setLoading] = useState(!roleCache.has(userId));

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Se já tem cache, usar imediatamente
    if (roleCache.has(userId)) {
      setIsAdmin(roleCache.get(userId) === 'admin');
      setLoading(false);
      return; // Ainda assim subscribe para mudanças em tempo real
    }

    setLoading(true);

    // Criar listener com onSnapshot
    const userRef = doc(db, 'users', userId);
    
    const unsubscribe = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const role = docSnapshot.data().role || 'user';
          roleCache.set(userId, role);
          setIsAdmin(role === 'admin');
        } else {
          roleCache.set(userId, 'user');
          setIsAdmin(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error loading user role:', error);
        roleCache.set(userId, 'user');
        setIsAdmin(false);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { isAdmin, loading };
}