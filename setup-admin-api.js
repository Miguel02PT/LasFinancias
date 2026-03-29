#!/usr/bin/env node
// Script para atualizar admin conta via REST API
// Sem precisar de service account key

const projectId = 'financasapp-149dc';
const userId = 'OQHFyyWn5eOBDna9xkq8nC7ilsa2';
const idToken = process.env.FIREBASE_ID_TOKEN; // Obtém do localStorage depois de login

if (!idToken) {
  console.error('❌ Para usar este script via API, precisa de ID Token');
  console.log('');
  console.log('Alternativa: Usar o Firebase Console diretamente!');
  console.log('');
  console.log('PASSOS:');
  console.log('1. Vai para: https://console.firebase.google.com/');
  console.log('2. Seleciona projeto: financasapp-149dc');
  console.log('3. Vai para Firestore Database');
  console.log('4. Abre collection: users');
  console.log('5. Seleciona documento: OQHFyyWn5eOBDna9xkq8nC7ilsa2');
  console.log('6. Clica em Edit (✏️)');
  console.log('7. Muda os campos:');
  console.log('   - role: "admin"');
  console.log('   - subscription: "fulltime"');
  console.log('8. Clica em Save');
  console.log('');
  process.exit(1);
}

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;

const updateData = {
  fields: {
    role: { stringValue: 'admin' },
    subscription: { stringValue: 'fulltime' }
  }
};

fetch(url, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updateData)
})
.then(res => res.json())
.then(data => {
  console.log('✅ User atualizado!');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('❌ Erro:', err);
});
