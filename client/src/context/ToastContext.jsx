import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    timersRef.current[id] = setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const toast = useCallback(
    Object.assign(() => {}, {
      error: (msg) => addToast(msg, 'error'),
      success: (msg) => addToast(msg, 'success'),
      info: (msg) => addToast(msg, 'info'),
    }),
    [addToast]
  );

  const typeStyles = {
    error: 'bg-red-600 dark:bg-red-700 text-white',
    success: 'bg-green-600 dark:bg-green-700 text-white',
    info: 'bg-blue-600 dark:bg-blue-700 text-white',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${typeStyles[t.type]} px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 text-sm font-medium animate-slide-in`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
