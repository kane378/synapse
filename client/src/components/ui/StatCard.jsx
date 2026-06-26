// FILE: client/src/components/ui/StatCard.jsx
export default function StatCard({ label, value, sub, icon: Icon, color = 'accent', trend }) {
  const colors = {
    accent: 'border-synapse-accent/30 bg-synapse-accent/5',
    green:  'border-green-500/30 bg-green-500/5',
    red:    'border-red-500/30 bg-red-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
  };
  const textColors = {
    accent: 'text-synapse-accent',
    green:  'text-green-400',
    red:    'text-red-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-synapse-muted uppercase tracking-widest">{label}</span>
        {Icon && <Icon size={16} className={textColors[color]} />}
      </div>
      <div className={`text-3xl font-display font-bold ${textColors[color]} text-glow-${color === 'accent' ? 'accent' : ''}`}>
        {value ?? '—'}
      </div>
      {sub && <div className="text-xs text-synapse-muted mt-1">{sub}</div>}
    </div>
  );
}
