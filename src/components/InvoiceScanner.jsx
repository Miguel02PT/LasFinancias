import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader, Check } from 'lucide-react';
import { processInvoice } from '../services/invoiceService';
import './InvoiceScanner.css';

export function InvoiceScanner({ isOpen, onClose, onSuccess, balanceId, userId }) {
  const [step, setStep] = useState('upload'); // upload, preview, editing, processing, success
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 10MB.');
      return;
    }

    setImageFile(file);
    setError('');

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setStep('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    handleFileSelect(e.target.files?.[0]);
  };

  const handleProcess = async () => {
    if (!imageFile || !userId) {
      setError('Dados incompletos');
      return;
    }

    setLoading(true);
    setStep('processing');
    setError('');

    try {
      const transaction = await processInvoice(imageFile, userId, balanceId);
      setInvoiceData(transaction);
      setStep('success');
      
      // Fechar automaticamente em 3 segundos
      setTimeout(() => {
        onSuccess?.(transaction);
        handleClose();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Erro ao processar a fatura');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setImageFile(null);
    setImagePreview(null);
    setInvoiceData(null);
    setError('');
    setStep('upload');
  };

  const handleClose = () => {
    handleRetry();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="invoice-scanner-overlay">
      <div className="invoice-scanner-modal">
        {/* Header */}
        <div className="invoice-scanner-header">
          <h2>📸 Invoice Scanner</h2>
          <button className="close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="invoice-scanner-content">
          {step === 'upload' && (
            <div className="upload-section">
              <p className="upload-title">Carregue uma foto ou documento de uma fatura</p>
              <p className="upload-subtitle">A IA vai processar automaticamente</p>

              <div className="upload-buttons">
                <button className="upload-btn camera-btn" onClick={handleCameraClick}>
                  <Camera size={32} />
                  <span>Câmera</span>
                </button>
                <button className="upload-btn file-btn" onClick={handleUploadClick}>
                  <Upload size={32} />
                  <span>Carregar Ficheiro</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <p className="upload-info">
                ✅ Formatos aceitos: JPG, PNG<br/>
                ✅ Máximo: 10MB<br/>
                ✅ Melhor resultado com fotos claras
              </p>
            </div>
          )}

          {step === 'preview' && (
            <div className="preview-section">
              <div className="preview-image">
                <img src={imagePreview} alt="Preview" />
              </div>
              <p className="preview-info">Carregando e analisando a fatura...</p>
            </div>
          )}

          {step === 'processing' && (
            <div className="processing-section">
              <div className="processing-spinner">
                <Loader size={48} className="spinning" />
              </div>
              <p className="processing-title">Processando fatura...</p>
              <div className="processing-steps">
                <div className="step">
                  <span>🔍</span> Extraindo texto
                </div>
                <div className="step">
                  <span>🤖</span> Analisando com IA
                </div>
                <div className="step">
                  <span>💾</span> Salvando transação
                </div>
              </div>
            </div>
          )}

          {step === 'success' && invoiceData && (
            <div className="success-section">
              <div className="success-icon">
                <Check size={64} />
              </div>
              <h3>Fatura Processada!</h3>
              <div className="success-details">
                <div className="detail-row">
                  <span className="label">Categoria:</span>
                  <span className="value">{invoiceData.category}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Valor:</span>
                  <span className="value">€{invoiceData.amount?.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Data:</span>
                  <span className="value">{new Date(invoiceData.date).toLocaleDateString('pt-PT')}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Descrição:</span>
                  <span className="value">{invoiceData.description}</span>
                </div>
              </div>
              <p className="success-message">Transação adicionada com sucesso! ✨</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Actions */}
        {(step === 'preview' || step === 'processing') && (
          <div className="invoice-scanner-actions">
            <button
              className="btn-secondary"
              onClick={handleRetry}
              disabled={loading}
            >
              ← Voltar
            </button>
            <button
              className="btn-primary"
              onClick={handleProcess}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={18} className="spinning" />
                  Processando...
                </>
              ) : (
                'Processar Fatura'
              )}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="invoice-scanner-actions">
            <button className="btn-primary" onClick={handleClose}>
              Fechar
            </button>
          </div>
        )}

        {step === 'upload' && (
          <div className="invoice-scanner-actions">
            <button className="btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
