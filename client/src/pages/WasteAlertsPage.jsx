// FILE: client/src/pages/WasteAlertsPage.jsx
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getUrgencyBg } from '../utils/helpers';
import { Alert, useAlert } from '../components/ui/Alert';
import { AlertTriangle, Clock, ArrowLeftRight, Zap } from 'lucide-react';
import RequestTransferModal from '../components/transfers/RequestTransferModal';

export default function WasteAlertsPage() {
  const { user } = useAuth();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferItem, setTransferItem] = useState(null);
  const { alert, show: showAlert, clear } = useAlert();

  useEffect(() => {
    api.get('/inventory/waste-alerts')
      .then(r => setItems(r.data.data))
      .catch(() => showAlert('error', 'Failed to load waste alerts.'))
      .finally(() => setLoading(false));
  }, []);

  const critical = items.filter(i => i.urgency_level === 'critical');
  const high     = items.filter(i => i.urgency_level === 'high');
  const warning  = items.filter(i => i.urgency_level === 'warning');

  const canRequest = (item) => item.hospital_id !== user?.hospitalId;

  const Section = ({ title, items, color, icon: Icon }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className={`flex items-center gap-2 text-sm font-display font-semibold ${color}`}>
          <Icon size={16} />
          {title}
          <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-current/10">{items.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <WasteCard
              key={item.id}
              item={item}
              onRequest={canRequest(item) ? () => setTransferItem(item) : null}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs font-mono text-red-400 uppercase tracking-widest">High Priority Zone</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">Waste Alerts</h1>
          <p className="text-synapse-muted text-sm mt-1">Drugs expiring within 30 days — initiate transfers to prevent wastage</p>
        </div>
        {items.length > 0 && (
          <div className="text-right">
            <div className="text-3xl font-display font-bold text-red-400">{items.length}</div>
            <div className="text-xs text-synapse-muted font-mono">Items at risk</div>
          </div>
        )}
      </div>

      {alert && <Alert {...alert} onDismiss={clear} autoDismiss />}

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-synapse-surface border border-synapse-border animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <Zap size={32} className="text-green-400" />
          </div>
          <h3 className="text-lg font-display font-semibold text-synapse-text mb-2">No Waste Alerts</h3>
          <p className="text-synapse-muted text-sm">All inventory items are within safe expiry range.</p>
        </div>
      ) : (
        <>
          <Section title="CRITICAL — Expiring within 7 days" items={critical} color="text-red-400"    icon={AlertTriangle} />
          <Section title="HIGH — Expiring within 14 days"    items={high}     color="text-orange-400" icon={Clock} />
          <Section title="WARNING — Expiring within 30 days" items={warning}  color="text-yellow-400" icon={AlertTriangle} />
        </>
      )}

      {transferItem && (
        <RequestTransferModal
          item={transferItem}
          onClose={() => setTransferItem(null)}
          onSuccess={() => {
            setTransferItem(null);
            showAlert('success', 'Transfer request submitted.');
          }}
        />
      )}
    </div>
  );
}

function WasteCard({ item, onRequest }) {
  const daysLeft = item.days_to_expiry;
  const pct = Math.max(0, Math.min(100, (daysLeft / 30) * 100));
  const barColor = daysLeft <= 7 ? 'bg-red-500' : daysLeft <= 14 ? 'bg-orange-500' : 'bg-yellow-500';
  const borderClass = daysLeft <= 7 ? 'border-red-500/30' : daysLeft <= 14 ? 'border-orange-500/30' : 'border-yellow-500/30';

  return (
    <div className={`bg-synapse-surface border ${borderClass} rounded-xl p-5 flex flex-col gap-3 hover:scale-[1.02] transition-transform`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-synapse-text text-sm truncate">{item.drug_name}</div>
          {item.generic_name && <div className="text-xs text-synapse-muted truncate">{item.generic_name}</div>}
        </div>
        <span className={`ml-2 shrink-0 px-2 py-0.5 text-xs rounded-lg border ${getUrgencyBg(item.urgency_level)}`}>
          {daysLeft}d
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-synapse-muted mb-0.5">Hospital</div>
          <div className="text-synapse-text font-medium truncate">{item.hospital_name}</div>
        </div>
        <div>
          <div className="text-synapse-muted mb-0.5">Quantity</div>
          <div className="text-synapse-text font-medium font-mono">{item.quantity} {item.unit}</div>
        </div>
        <div>
          <div className="text-synapse-muted mb-0.5">Batch</div>
          <div className="text-synapse-text font-mono">{item.batch_number}</div>
        </div>
        <div>
          <div className="text-synapse-muted mb-0.5">Expires</div>
          <div className="text-synapse-text font-medium">{formatDate(item.expiry_date)}</div>
        </div>
      </div>

      {/* Expiry progress bar */}
      <div>
        <div className="h-1 bg-synapse-bg rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-synapse-muted mt-1">{daysLeft} days remaining of 30-day window</div>
      </div>

      {onRequest && (
        <button
          onClick={onRequest}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs border border-synapse-accent/40 text-synapse-accent rounded-lg hover:bg-synapse-accent/10 transition-colors font-medium mt-1"
        >
          <ArrowLeftRight size={12} />
          Request Transfer
        </button>
      )}
    </div>
  );
}
