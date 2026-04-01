import { useState, useRef, useCallback } from 'react';
import { Camera, X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { processInvoice } from '../services/invoiceService';
import './InvoiceScanner.css';  // ← PRECISA ESTAR NO TOPO

const PROCESSING_STEPS = [
  { id: 'compress', label: 'Compressing image...' },
  { id: 'ocr', label: 'Extracting text with OCR...' },
  { id: 'analyze', label: 'Analyzing with AI...' },
  { id: 'save', label: 'Saving transaction...' }
];

export function InvoiceScanner({ isOpen, onClose, onSuccess, userId, balanceId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [saveImages, setSaveImages] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setError('');
      setSuccess(false);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setError('');
    setSuccess(false);

    try {
      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        setCurrentStep(i);
        // Add small delay to show progress visually
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const transaction = await processInvoice(selectedFile, userId, balanceId, saveImages);
      setSuccess(true);
      setCurrentStep(0);
      
      setTimeout(() => {
        onSuccess?.(transaction);
        onClose();
        setSelectedFile(null);
        setPreview(null);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to process invoice. Try again.');
      setCurrentStep(0);
    } finally {
      setProcessing(false);
    }
  }, [selectedFile, userId, balanceId, saveImages, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="invoice-scanner-overlay" onClick={onClose}>
      <div className="invoice-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-scanner-header">
          <h2 id="Title">📸 Invoice Scanner</h2>
          <button className="close-btn" onClick={onClose} disabled={processing}>
            <X size={24} />
          </button>
        </div>

        <div className="invoice-scanner-content">
          {/* Processing State */}
          {processing && (
            <div className="processing-section">
              <div className="processing-spinner">
                <Loader2 className="spinning" size={48} />
              </div>
              <h3 className="processing-title">Processing Invoice</h3>
              <div className="processing-steps">
                {PROCESSING_STEPS.map((step, idx) => (
                  <div key={step.id} className="step">
                    <span>
                      {idx < currentStep ? (
                        '✓'
                      ) : idx === currentStep ? (
                        <Loader2 size={16} className="spinning" />
                      ) : (
                        '○'
                      )}
                    </span>
                    <span style={{ opacity: idx <= currentStep ? 1 : 0.4 }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {success && !processing && (
            <div className="success-section">
              <div className="success-icon">
                <CheckCircle2 size={40} />
              </div>
              <h3>Invoice Saved!</h3>
              <p className="success-message">Your invoice has been processed and saved successfully.</p>
            </div>
          )}

          {/* Error State */}
          {error && !processing && (
            <div className="error-message">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Upload/Edit State */}
          {!processing && !success && (
            <div className="upload-section">
              <h2 className="upload-title">Upload Receipt/Invoice</h2>
              <p className="upload-subtitle">Take a photo or upload an image</p>

              {preview && (
                <div className="preview-section">
                  <p className="preview-info">✓ Image selected</p>
                  <div className="preview-image">
                    <img src={preview} alt="Invoice preview" />
                  </div>
                </div>
              )}

              {!preview && (
                <div className="upload-buttons">
                  <button
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={32} />
                    <span>Take Photo</span>
                  </button>
                  <button
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={32} />
                    <span>Upload Image</span>
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="saveImages"
                  checked={saveImages}
                  onChange={(e) => setSaveImages(e.target.checked)}
                />
                <label htmlFor="saveImages" style={{ fontSize: '0.9rem' }}>
                  Save invoice image (optional)
                </label>
              </div>

              <p className="upload-info">
                • Supports JPG, PNG images<br/>
                • Maximum file size: 5MB<br/>
                • Works best with clear, well-lit photos
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!processing && !success && (
          <div className="invoice-scanner-actions">
            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleProcess}
              disabled={!selectedFile || processing}
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="spinning" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Process Invoice
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}