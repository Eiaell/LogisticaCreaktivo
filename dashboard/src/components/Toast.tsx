import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          glassClass: 'liquid-glass-emerald',
          icon: '✓',
          iconBg: 'bg-emerald-600'
        };
      case 'error':
        return {
          glassClass: 'liquid-glass-pink',
          icon: '✕',
          iconBg: 'bg-red-600'
        };
      case 'warning':
        return {
          glassClass: 'liquid-glass-amber',
          icon: '⚠',
          iconBg: 'bg-amber-600'
        };
      case 'info':
        return {
          glassClass: 'liquid-glass-cyan',
          icon: 'ℹ',
          iconBg: 'bg-blue-600'
        };
      default:
        return {
          glassClass: 'liquid-glass-purple',
          icon: 'ℹ',
          iconBg: 'bg-gray-600'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`liquid-glass ${styles.glassClass} rounded-lg p-4 mb-3 flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in-right`}
    >
      {/* Icon */}
      <div className={`${styles.iconBg} rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0`}>
        <span className="text-white text-lg font-bold">{styles.icon}</span>
      </div>

      {/* Message */}
      <div className="flex-1 text-white text-sm font-medium whitespace-pre-line">
        {toast.message}
      </div>

      {/* Close Button */}
      <button
        onClick={() => onClose(toast.id)}
        className="text-white hover:text-gray-200 transition-colors flex-shrink-0 ml-2"
        aria-label="Cerrar notificación"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Toast;
