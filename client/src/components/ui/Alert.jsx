// FILE: client/src/components/ui/Alert.jsx
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
const styles = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error:   'border-red-500/30 bg-red-500/10 text-red-400',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  info:    'border-synapse-accent/30 bg-synapse-accent/10 text-synapse-accent',
};

export function Alert({ type = 'info', message, onDismiss, autoDismiss = false }) {
  const Icon = icons[type];

  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const t = setTimeout(onDismiss, 4000);
      return () => clearTimeout(t);
    }
  }, [autoDismiss, onDismiss]);

  if (!message) return null;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles[type]} animate-slide-up`}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <span className="text-sm flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// Simple hook for managing alerts
export function useAlert() {
  const [alert, setAlert] = useState(null);
  const show = (type, message) => setAlert({ type, message });
  const clear = () => setAlert(null);
  return { alert, show, clear };
}
