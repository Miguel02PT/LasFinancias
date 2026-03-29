#!/bin/bash
# Script para configurar GROQ_API_KEY e fazer deploy

echo "=========================================="
echo "Firebase Cloud Functions Setup"
echo "=========================================="
echo ""

# Verifica se groq key foi passada como argumento
if [ -z "$1" ]; then
    echo "❌ Erro: Precisa fornecer GROQ_API_KEY"
    echo ""
    echo "Uso:"
    echo "  bash setup-cloud-functions.sh 'sua_grroq_api_key_aqui'"
    echo ""
    echo "Como obter a chave:"
    echo "  1. Vai a https://console.groq.com/keys"
    echo "  2. Cria uma nova API Key"
    echo "  3. Copia e cola acima"
    echo ""
    exit 1
fi

GROQ_KEY=$1

echo "🔑 Configurando GROQ_API_KEY..."
firebase functions:config:set groq.api_key="$GROQ_KEY"

if [ $? -eq 0 ]; then
    echo "✅ Variável configurada!"
    echo ""
    echo "🚀 Deploy das Cloud Functions..."
    firebase deploy --only functions
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Deploy concluído!"
        echo "🎉 Cloud Function está pronta"
    else
        echo "❌ Erro no deploy"
        exit 1
    fi
else
    echo "❌ Erro ao configurar variável"
    exit 1
fi
