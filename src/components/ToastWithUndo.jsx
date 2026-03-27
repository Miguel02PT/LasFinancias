import toast from 'react-hot-toast';

export const showSuccessWithUndo = (message, onUndo) => {
  toast.custom((t) => (
    <div className={`toast-undo ${t.visible ? 'visible' : ''}`}>
      <span>{message}</span>
      <button onClick={() => { onUndo(); toast.dismiss(t.id); }} className="undo-btn">
        Undo
      </button>
    </div>
  ), { duration: 5000 });
};

export const showSuccess = (message) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#48bb78',
      color: 'white',
      borderRadius: '10px',
    },
  });
};

export const showError = (message) => {
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#f56565',
      color: 'white',
      borderRadius: '10px',
    },
  });
};

export const showInfo = (message) => {
  toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#4299e1',
      color: 'white',
      borderRadius: '10px',
    },
  });
};