import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { showSuccess } from '../components/ToastWithUndo';

// Função para executar transações recorrentes
export async function processRecurringTransactions(userId) {
  console.log("Processing recurring transactions for user:", userId);
  
  try {
    // Buscar todas as transações recorrentes
    const recurringRef = collection(db, 'users', userId, 'recurring');
    const recurringSnapshot = await getDocs(recurringRef);
    
    if (recurringSnapshot.empty) {
      console.log("No recurring transactions found");
      return 0;
    }
    
    let newTransactions = 0;
    
    for (const docSnap of recurringSnapshot.docs) {
      const recurring = { id: docSnap.id, ...docSnap.data() };
      const lastExecuted = recurring.lastExecuted?.toDate();
      const now = new Date();
      
      let shouldExecute = false;
      
      // Verificar se deve executar baseado na frequência
      if (!lastExecuted) {
        // Se nunca foi executada, verificar se a data de criação é anterior ao mês atual
        const createdAt = recurring.createdAt?.toDate();
        if (createdAt) {
          const monthsDiff = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth());
          shouldExecute = monthsDiff >= 1;
        } else {
          shouldExecute = true;
        }
      } else {
        const monthsDiff = (now.getFullYear() - lastExecuted.getFullYear()) * 12 + (now.getMonth() - lastExecuted.getMonth());
        
        switch (recurring.frequency) {
          case 'monthly':
            shouldExecute = monthsDiff >= 1;
            break;
          case 'weekly':
            const daysDiff = Math.floor((now - lastExecuted) / (1000 * 60 * 60 * 24));
            shouldExecute = daysDiff >= 7;
            break;
          case 'yearly':
            shouldExecute = monthsDiff >= 12;
            break;
          default:
            shouldExecute = monthsDiff >= 1;
        }
      }
      
      if (shouldExecute) {
        // Criar nova transação
        const newTransaction = {
          amount: recurring.amount,
          description: recurring.description,
          category: recurring.category,
          type: recurring.type,
          date: new Date(),
          userId: userId,
          isRecurring: true,
          recurringId: recurring.id
        };
        
        await addDoc(collection(db, 'users', userId, 'transactions'), newTransaction);
        
        // Atualizar a data da última execução
        const recurringDocRef = doc(db, 'users', userId, 'recurring', recurring.id);
        await updateDoc(recurringDocRef, { lastExecuted: new Date() });
        
        newTransactions++;
        console.log(`Added recurring transaction: ${recurring.description}`);
      }
    }
    
    if (newTransactions > 0) {
      console.log(`Added ${newTransactions} recurring transaction(s)`);
      showSuccess(`${newTransactions} recurring transaction(s) added!`);
    }
    
    return newTransactions;
  } catch (error) {
    console.error("Error processing recurring transactions:", error);
    return 0;
  }
}