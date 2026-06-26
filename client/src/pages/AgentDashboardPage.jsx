// FILE: client/src/pages/AgentDashboardPage.jsx
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/helpers';
import { Truck, Package, CheckCircle, MapPin, Clock, AlertCircle, ArrowLeft } from 'lucide-react';

const STATUS_ORDER = ['Pending', 'Packed', 'PickedUp', 'InTransit', 'Delivered'];
const STATUS_LABELS = {
  Pending:   { label: 'Assigned',    color: 'text-synapse-muted',  bg: 'bg-gray-500/10 border-gray-500/30' },
  Packed:    { label: 'Packed',      color: 'text-blue-400',       bg: 'bg-blue-500/10 border-blue-500/30' },
  PickedUp:  { label: 'Picked Up',   color: 'text-yellow-400',     bg: 'bg-yellow-500/10 border-yellow-500/30' },
  InTransit: { label: 'In Transit',  color: 'text-orange-400',     bg: 'bg-orange-500/10 border-orange-500/30' },
  Delivered: { label: 'Delivered',   color: 'text-green-400',      bg: 'bg-green-500/10 border-green-500/30' },
};
const NEXT_ACTIONS = {
  Pending:   { label: '📦 Mark as Packed',       next: 'Packed'    },
  Packed:    { label: '🚗 Mark as Picked Up',    next: 'PickedUp'  },
  PickedUp:  { label: '🚚 Mark as In Transit',   next: 'InTransit' },
  InTransit: { label: '✅ Mark as Delivered',    next: 'Delivered' },
};

export default function AgentDashboardPage() {
  const { user }                    = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState(null);
  const [error, setError]           = useState('');

  const fetchDeliveries = async () => {
    try {
      const res = await api.get('/agents/my-deliveries');
      setDeliveries(res.data.data);
    } catch { setError('Failed to load deliveries.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const updateStatus = async (deliveryId, nextStatus) => {
    setUpdating(deliveryId);
    try {
      await api.patch(`/deliveries/${deliveryId}/status`, { status: nextStatus });
      setDeliveries(prev => prev.map(d =>
        d.id === deliveryId ? { ...d, status: nextStatus } : d
      ));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update status.');
    } finally { setUpdating(null); }
  };

  const active    = deliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Failed');
  const completed = deliveries.filter(d => d.status === 'Delivered');

  return (
    <div className="space-y-6">
      <div>
  <button onClick={() => window.history.back()} className="flex items-center gap-2 text-synapse-muted hover:text-synapse-accent text-sm mb-4 transition-colors">
    <ArrowLeft size={14} /> Back
  </button>
  <div className="flex items-center gap-2 mb-1">
    <div className="w-2 h-2 rounded-full bg-synapse-green animate-pulse" />
          <span className="text-xs font-mono text-synapse-muted uppercase tracking-widest">Agent Online</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">My Deliveries</h1>
        <p className="text-synapse-muted text-sm mt-1">
          Welcome, <span className="text-synapse-accent">{user?.fullName || user?.full_name}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-synapse-surface border border-orange-500/30 rounded-xl p-4">
          <div className="text-2xl font-display font-bold text-orange-400">{active.length}</div>
          <div className="text-xs text-synapse-muted font-mono">Active</div>
        </div>
        <div className="bg-synapse-surface border border-green-500/30 rounded-xl p-4">
          <div className="text-2xl font-display font-bold text-green-400">{completed.length}</div>
          <div className="text-xs text-synapse-muted font-mono">Completed</div>
        </div>
        <div className="bg-synapse-surface border border-synapse-border rounded-xl p-4">
          <div className="text-2xl font-display font-bold text-synapse-accent">{deliveries.length}</div>
          <div className="text-xs text-synapse-muted font-mono">Total</div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-synapse-surface border border-synapse-border animate-pulse" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-16">
          <Truck size={40} className="mx-auto mb-4 text-synapse-muted opacity-30" />
          <div className="text-synapse-text font-medium mb-2">No Deliveries Yet</div>
          <div className="text-synapse-muted text-sm">You will see assigned deliveries here once a hospital assigns one to you.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map(d => {
            const statusInfo = STATUS_LABELS[d.status] || STATUS_LABELS.Pending;
            const nextAction = NEXT_ACTIONS[d.status];

            return (
              <div key={d.id}
                className={`bg-synapse-surface border rounded-xl p-5 ${
                  d.status === 'Delivered' ? 'border-synapse-border opacity-70' : 'border-synapse-accent/20'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-display font-semibold text-synapse-text text-lg">{d.drug_name}</div>
                    <div className="text-sm text-synapse-accent font-mono mt-0.5">
                      {d.approved_quantity || d.requested_quantity} {d.unit}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full border font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-synapse-muted">PICKUP FROM</div>
                      <div className="text-sm text-synapse-text">{d.pickup_address}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-synapse-muted">DELIVER TO</div>
                      <div className="text-sm text-synapse-text">{d.delivery_address}</div>
                    </div>
                  </div>
                </div>

                {/* ETA */}
                {d.estimated_delivery && d.status !== 'Delivered' && (
                  <div className="flex items-center gap-1 text-xs text-yellow-400 mb-4">
                    <Clock size={11} /> ETA: {formatDateTime(d.estimated_delivery)}
                  </div>
                )}

                {/* Notes */}
                {d.notes && (
                  <div className="text-xs text-synapse-muted p-2 bg-synapse-bg border border-synapse-border rounded-lg mb-4">
                    📋 {d.notes}
                  </div>
                )}

                {/* Action button */}
                {nextAction && d.status !== 'Delivered' && (
                  <button
                    onClick={() => updateStatus(d.id, nextAction.next)}
                    disabled={updating === d.id}
                    className="w-full py-3 rounded-xl bg-synapse-accent text-synapse-bg font-display font-bold text-sm hover:bg-synapse-accent-dim transition-colors disabled:opacity-50"
                  >
                    {updating === d.id ? 'Updating...' : nextAction.label}
                  </button>
                )}

                {d.status === 'Delivered' && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-sm text-green-400 font-medium">Delivered Successfully ✅</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
