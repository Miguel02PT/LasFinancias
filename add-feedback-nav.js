import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, 'src', 'pages');
const filesToUpdate = [
  'Dashboard.jsx',
  'Transactions.jsx',
  'Reports.jsx',
  'Goals.jsx',
  'Budgets.jsx',
  'Recurring.jsx',
  'SavingsRules.jsx',
  'Settings.jsx'
];

// O item que queremos adicionar
const feedbackItem = `  { path: '/feedback', icon: MessageSquare, label: 'Feedback' },\n`;

filesToUpdate.forEach(file => {
  const filePath = path.join(pagesDir, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se já existe feedback
    if (content.includes('/feedback')) {
      console.log(`✅ ${file} already has feedback, skipping`);
      return;
    }
    
    // Verificar se já tem import do MessageSquare
    if (!content.includes('MessageSquare')) {
      // Adicionar import do MessageSquare
      const importRegex = /import \{([^}]+)\} from 'lucide-react';/;
      const match = content.match(importRegex);
      if (match) {
        const imports = match[1];
        const newImports = `import {${imports}, MessageSquare} from 'lucide-react';`;
        content = content.replace(importRegex, newImports);
      }
    }
    
    // Procurar onde adicionar o feedback (antes do settings)
    const settingsRegex = /(\s*\{ path: '\/settings', icon: Settings, label: 'Settings' \},?)/;
    if (settingsRegex.test(content)) {
      content = content.replace(settingsRegex, `${feedbackItem}  $1`);
    } else {
      // Alternativa: procurar o último item do navItems
      const navItemsRegex = /(const navItems = \[[\s\S]*?)\n\s*\];/;
      const matchNav = content.match(navItemsRegex);
      if (matchNav) {
        const navContent = matchNav[1];
        const newNavContent = navContent + feedbackItem;
        content = content.replace(navItemsRegex, `${newNavContent}\n];`);
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${file}`);
  } else {
    console.log(`❌ ${file} not found`);
  }
});

console.log('🎉 All files updated!');