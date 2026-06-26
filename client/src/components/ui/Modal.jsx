// FILE: client/src/components/ui/Modal.jsx
import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ title, children, onClose, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' };

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-synapse-surface border border-synapse-border rounded-2xl shadow-2xl animate-slide-up`}>
        <div className="flex items-center justify-between p-6 border-b border-synapse-border">
          <h2 className="text-lg font-display font-semibold text-synapse-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-synapse-muted hover:text-synapse-text hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
