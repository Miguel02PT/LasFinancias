import { useState, useRef } from 'react';
import { Camera, X, Upload, Loader2 } from 'lucide-react';
import { processInvoice } from '../services/invoiceService';

export function InvoiceScanner({ isOpen, onClose, onSuccess, userId, balanceId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [saveImages, setSaveImages] = useState(false); // Opção para guardar ou não imagens
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setError('');

    try {
      // Passar o parâmetro saveImages para controlar se guarda ou não no Storage
      const transaction = await processInvoice(selectedFile, userId, balanceId, saveImages);
      onSuccess?.(transaction);
      onClose();
    } catch (err) {
      console.error('Error processing invoice:', err);
      setError(err.message || 'Failed to process invoice. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📸 Invoice Scanner</h3>
          <button className="close-modal" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div 
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #ccc',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            {preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
              />
            ) : (
              <div>
                <Camera size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Click to take a photo or upload receipt</p>
                <small style={{ opacity: 0.7 }}>JPG, PNG - Max 5MB</small>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Opção para guardar ou não imagens */}
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="saveImages"
              checked={saveImages}
              onChange={(e) => setSaveImages(e.target.checked)}
            />
            <label htmlFor="saveImages">Save invoice image (requires Storage)</label>
          </div>

          {error && (
            <div style={{ 
              padding: '0.75rem', 
              background: '#fee', 
              color: '#c33', 
              borderRadius: '8px', 
              marginBottom: '1rem' 
            }}>
              {error}
            </div>
          )}

          <div className="modal-buttons" style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Upload size={16} /> Change Image
            </button>
            <button 
              className="process-btn"
              onClick={handleProcess}
              disabled={!selectedFile || processing}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: !selectedFile || processing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: !selectedFile || processing ? 0.6 : 1
              }}
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  Processing...
                </>
              ) : (
                'Process Invoice'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}