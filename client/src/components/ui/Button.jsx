// FILE: client/src/components/ui/Button.jsx
import { Loader2 } from 'lucide-react';

const variants = {
  primary:  'bg-synapse-accent text-synapse-bg hover:bg-synapse-accent-dim font-semibold',
  success:  'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20',
  danger:   'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
  ghost:    'text-synapse-muted border border-synapse-border hover:bg-white/5 hover:text-synapse-text',
  outline:  'border border-synapse-accent/50 text-synapse-accent hover:bg-synapse-accent/10',
};

export default function Button({ children, variant = 'primary', loading, disabled, className = '', size = 'md', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
