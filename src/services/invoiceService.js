import { db, storage } from '../firebase/config';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import Tesseract from 'tesseract.js';
import { groqChatCompletion } from './groqClient';
import { incrementInvoiceScansCount } from './subscriptionService';

// Categorias de despesas comuns
const CATEGORY_KEYWORDS = {
  'Groceries': ['supermercado', 'mercado', 'loja', 'pingo doce', 'continente', 'carrefour', 'food', 'grocery', 'alimentos'],
  'Restaurants': ['restaurante', 'café', 'pizza', 'hamburguer', 'bar', 'snack', 'comida', 'lunch', 'dinner', 'food delivery'],
  'Transport': ['uber', 'taxi', 'autocarro', 'bomba', 'combustível', 'gasolina', 'estacionamento', 'parking', 'bus', 'train'],
  'Entertainment': ['cinema', 'teatro', 'show', 'concerto', 'bilhete', 'jogo', 'game', 'ticket', 'spotify', 'netflix'],
  'Shopping': ['roupa', 'sapatos', 'calçado', 'loja', 'shop', 'fashion', 'compras', 'zara', 'h&m'],
  'Utilities': ['água', 'eletricidade', 'internet', 'telemóvel', 'phone', 'electricity', 'water', 'gás', 'gas'],
  'Healthcare': ['farmácia', 'médico', 'hospital', 'pharmacy', 'doctor', 'medicamentos', 'saúde'],
  'Subscription': ['magazine', 'jornal', 'gym', 'académia', 'subscription', 'plano', 'plan'],
  'Other': []
};

/**
 * Compress and optimize image before upload
 */
export async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if needed
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', quality);
      };
    };
  });
}

/**
 * Extract text from image using OCR (Tesseract.js)
 */
export async function extractTextFromImage(imageFile) {
  try {
    const result = await Tesseract.recognize(imageFile, 'eng+por', {
      logger: (progress) => {
        // OCR progress tracking
      }
    });
    
    const text = result.data.text;
    return text;
  } catch (error) {
    throw new Error('Erro ao extrair texto da imagem. Tente novamente.');
  }
}

/**
 * Parse invoice with Groq AI to extract: amount, category, date, description
 */
export async function parseInvoiceWithAI(ocrText) {
  try {
    const prompt = `You are a financial invoice analyzer. Extract invoice details from this OCR text.

INVOICE TEXT:
${ocrText}

Your task:
1. Extract the TOTAL AMOUNT (price, value, total). Look for keywords like "Total", "Amount", "Price", "Total due", "TOTAL", "€", "EUR" or numbers with decimals.
2. Detect the CATEGORY based on keywords (Groceries, Restaurants, Transport, Entertainment, Shopping, Utilities, Healthcare, Subscription, Other)
3. Extract or estimate the DATE (format: YYYY-MM-DD). If not found, use today's date.
4. Create a SHORT DESCRIPTION of what was purchased

IMPORTANT:
- Amount must be a valid number (e.g., 25.50, 100, 15.99)
- If amount has currency symbol, remove it
- Return ONLY valid JSON, no markdown, no explanations
- If you can't find amount, use 0

Return ONLY this JSON format (no other text):
{
  "amount": 25.50,
  "category": "Groceries",
  "date": "2026-03-28",
  "description": "Grocery store purchase"
}`;

    const { content: rawContent } = await groqChatCompletion({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300
    });
    let text = rawContent || "{}";
    
    // Clean response (remove markdown if present)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);
    
    // Validate and clean data
    return {
      amount: Math.abs(parseFloat(parsed.amount) || 0),
      category: parsed.category in CATEGORY_KEYWORDS ? parsed.category : 'Other',
      date: parsed.date || new Date().toISOString().split('T')[0],
      description: (parsed.description || 'Invoice purchase').substring(0, 100)
    };
  } catch (error) {
    throw new Error('Erro ao analisar a fatura. Tente novamente.');
  }
}

/**
 * Upload image to Firebase Storage
 */
export async function uploadInvoiceImage(imageBlob, userId, invoiceDate) {
  try {
    const timestamp = Date.now();
    const fileName = `invoices/${userId}/${invoiceDate}_${timestamp}.jpg`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, imageBlob, {
      contentType: 'image/jpeg'
    });
    
    return fileName;
  } catch (error) {
    throw new Error('Erro ao fazer upload da imagem. Tente novamente.');
  }
}

/**
 * Create transaction from invoice data
 */
export async function createTransactionFromInvoice(userId, invoiceData, imageStoragePath, balanceId) {
  try {
    const newTransaction = {
      type: 'expense',
      amount: invoiceData.amount,
      category: invoiceData.category,
      description: invoiceData.description,
      date: Timestamp.fromDate(new Date(invoiceData.date)),
      balanceId: balanceId || '',
      invoiceImage: imageStoragePath || null,
      invoiceSource: true,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(
      collection(db, 'users', userId, 'transactions'),
      newTransaction
    );
    
    return {
      id: docRef.id,
      ...newTransaction,
      date: invoiceData.date
    };
  } catch (error) {
    throw new Error('Erro ao salvar a transação. Tente novamente.');
  }
}

/**
 * Full invoice processing pipeline
 * AGORA COM OPÇÃO DE NÃO GUARDAR IMAGEM (STORAGE OPCIONAL)
 */
export async function processInvoice(imageFile, userId, balanceId, shouldSaveImage = false) {
  try {
    // Step 1: Compress image
    const compressedBlob = await compressImage(imageFile, 1200, 1200, 0.7);
    
    // Step 2: Extract text with OCR
    const ocrText = await extractTextFromImage(compressedBlob);
    
    if (!ocrText || ocrText.trim().length < 10) {
      throw new Error('Não foi possível extrair texto da imagem. Tente com uma foto mais clara.');
    }
    
    // Step 3: Parse with AI
    const invoiceData = await parseInvoiceWithAI(ocrText);
    
    if (!invoiceData.amount || invoiceData.amount === 0) {
      throw new Error('Não foi possível encontrar o valor da fatura. Verifique se a imagem é legível.');
    }
    
    // Step 4: Upload image (ONLY IF shouldSaveImage = true)
    let storagePath = null;
    if (shouldSaveImage) {
      try {
        storagePath = await uploadInvoiceImage(compressedBlob, userId, invoiceData.date);
      } catch (uploadError) {
        // Upload failed, continue without storing image
      }
    }
    
    // Step 5: Create transaction
    const transaction = await createTransactionFromInvoice(
      userId,
      invoiceData,
      storagePath,
      balanceId
    );

    await incrementInvoiceScansCount(userId);

    console.log('🎉 Fatura processada com sucesso!');
    return transaction;
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    throw error;
  }
}