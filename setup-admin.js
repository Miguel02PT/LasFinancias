// Script para atualizar conta de admin e subscription
// Executar: node setup-admin.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Inicializar Firebase Admin SDK
// NOTA: Precisa do ficheiro de credenciais service account JSON
// Descarrega em: Firebase Console → Project Settings → Service Accounts → Generate new private key

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://financasapp-149dc.firebaseio.com"
});

const db = admin.firestore();

async function setupAdmin() {
  const userId = 'OQHFyyWn5eOBDna9xkq8nC7ilsa2';
  const userRef = db.collection('users').doc(userId);

  try {
    // Buscar dados atuais
    const userDoc = await userRef.get();
    
    console.log('📋 DADOS ATUAIS DO USER:');
    console.log(JSON.stringify(userDoc.data(), null, 2));
    
    // Atualizar para admin e premium
    await userRef.update({
      role: 'admin',
      subscription: 'fulltime'
    });

    console.log('\n✅ ATUALIZAÇÃO COMPLETA!');
    console.log('✔️ role: admin');
    console.log('✔️ subscription: fulltime (premium)');
    
    // Mostrar dados atualizados
    const updatedDoc = await userRef.get();
    console.log('\n📋 DADOS APÓS UPDATE:');
    console.log(JSON.stringify(updatedDoc.data(), null, 2));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

setupAdmin();
