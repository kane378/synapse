// FILE: client/src/components/ui/Input.jsx
export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        className={`
          w-full bg-synapse-bg border rounded-lg px-3 py-2.5 text-sm text-synapse-text
          placeholder:text-synapse-muted/50 outline-none transition-all duration-200
          ${error
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-synapse-border focus:border-synapse-accent focus:ring-1 focus:ring-synapse-accent/20'
          }
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
