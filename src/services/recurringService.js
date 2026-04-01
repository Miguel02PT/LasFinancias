import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore'; // ← Adicionar getDoc
import { showSuccess } from '../components/ToastWithUndo';

// Função para executar transações recorrentes
export async function processRecurringTransactions(userId) {
  console.log("Processing recurring transactions for user:", userId);
  
  try {
    const recurringRef = collection(db, 'users', userId, 'recurring');
    const recurringSnapshot = await getDocs(recurringRef);
    
    if (recurringSnapshot.empty) {
      console.log("No recurring transactions found");
      return 0;
    }
    
    let newTransactions = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const docSnap of recurringSnapshot.docs) {
      const recurring = { id: docSnap.id, ...docSnap.data() };
      
      if (!recurring.isActive) continue;
      
      const nextExecution = recurring.nextExecution?.toDate();
      if (!nextExecution) continue;
      
      const nextDate = new Date(nextExecution);
      nextDate.setHours(0, 0, 0, 0);
      
      if (nextDate <= today) {
        console.log(`Executing recurring: ${recurring.description}`);
        
        // 1. Criar transação
        const newTransaction = {
          amount: recurring.amount,
          description: recurring.description,
          category: recurring.category,
          type: recurring.type,
          date: new Date(),
          userId: userId,
          isRecurring: true,
          recurringId: recurring.id,
          balanceId: recurring.balanceId
        };
        
        await addDoc(collection(db, 'users', userId, 'transactions'), newTransaction);
        
        // 2. Atualizar o balance (se tiver balanceId) - CÓDIGO CORRIGIDO
        if (recurring.balanceId) {
          const balanceRef = doc(db, 'users', userId, 'balances', recurring.balanceId);
          const balanceDoc = await getDoc(balanceRef); // ← CORRETO: lê apenas o documento específico
          
          if (balanceDoc.exists()) {
            const currentBalance = balanceDoc.data().amount;
            const newBalance = recurring.type === 'income' 
              ? currentBalance + recurring.amount 
              : currentBalance - recurring.amount;
            
            console.log(`Updating balance: ${currentBalance} -> ${newBalance} (${recurring.type}: ${recurring.amount})`);
            await updateDoc(balanceRef, { amount: newBalance });
          } else {
            console.error(`Balance not found: ${recurring.balanceId}`);
          }
        }
        
        // 3. Calcular próxima execução
        let nextExec;
        if (recurring.frequency === 'monthly') {
          nextExec = new Date(nextExecution);
          nextExec.setMonth(nextExec.getMonth() + 1);
        } else if (recurring.frequency === 'weekly') {
          nextExec = new Date(nextExecution);
          nextExec.setDate(nextExec.getDate() + 7);
        } else if (recurring.frequency === 'yearly') {
          nextExec = new Date(nextExecution);
          nextExec.setFullYear(nextExec.getFullYear() + 1);
        } else {
          // Default para monthly
          nextExec = new Date(nextExecution);
          nextExec.setMonth(nextExec.getMonth() + 1);
        }
        
        // 4. Atualizar a recorrente
        const recurringDocRef = doc(db, 'users', userId, 'recurring', recurring.id);
        await updateDoc(recurringDocRef, { 
          lastExecuted: new Date(),
          nextExecution: nextExec
        });
        
        newTransactions++;
        console.log(`Executed: ${recurring.description}, new balance updated, next: ${nextExec.toLocaleDateString()}`);
      }
    }
    
    if (newTransactions > 0) {
      console.log(`Executed ${newTransactions} recurring transaction(s)`);
      showSuccess(`${newTransactions} recurring transaction(s) executed!`);
    }
    
    return newTransactions;
  } catch (error) {
    console.error("Error processing recurring transactions:", error);
    return 0;
  }
}

// Função para gerar todas as próximas execuções de uma recorrente
export function generateFutureExecutions(recurring, limit = 12) {
  const executions = [];
  
  // Garantir que temos uma data de início válida
  let currentDate;
  if (recurring.nextExecution) {
    currentDate = recurring.nextExecution.toDate ? recurring.nextExecution.toDate() : new Date(recurring.nextExecution);
  } else if (recurring.startDate) {
    currentDate = recurring.startDate.toDate ? recurring.startDate.toDate() : new Date(recurring.startDate);
  } else {
    return executions;
  }
  
  const now = new Date();
  
  for (let i = 0; i < limit; i++) {
    // Só adicionar se a data for futura
    if (currentDate > now) {
      executions.push({
        date: new Date(currentDate),
        amount: recurring.amount,
        description: recurring.description,
        category: recurring.category,
        type: recurring.type,
        balanceId: recurring.balanceId,
        balanceName: recurring.balanceName,
        isScheduled: true,
        recurringId: recurring.id,
        frequency: recurring.frequency
      });
    }
    
    // Avançar para a próxima data
    if (recurring.frequency === 'monthly') {
      currentDate = new Date(currentDate);
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (recurring.frequency === 'weekly') {
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (recurring.frequency === 'yearly') {
      currentDate = new Date(currentDate);
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    } else {
      break;
    }
  }
  
  return executions;
}