// FILE: client/src/pages/DeliveriesPage.jsx
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/helpers';
import { Truck, Package, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import DeliveryTracker from '../components/transfers/DeliveryTracker';

const STATUS_COLORS = {
  Pending:    'bg-gray-500/10 text-gray-400 border-gray-500/30',
  Packed:     'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PickedUp:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  InTransit:  'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Delivered:  'bg-green-500/10 text-green-400 border-green-500/30',
  Failed:     'bg-red-500/10 text-red-400 border-red-500/30',
};

const METHOD_LABELS = {
  self_pickup:          '🚗 Self Pickup',
  hospital_vehicle:     '🚑 Hospital Vehicle',
  porter:               '📦 Porter',
  shadowfax:            '❄️ Shadowfax',
  dunzo:                '⚡ Dunzo',
  licensed_distributor: '📋 Licensed Distributor',
};

export default function DeliveriesPage() {
  const { user }          = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [trackerItem, setTrackerItem] = useState(null);

  const fetchDeliveries = () => {
    api.get('/deliveries')
      .then(r => setDeliveries(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const inTransitCount = deliveries.filter(d => ['Pending','Packed','PickedUp','InTransit'].includes(d.status)).length;
  const deliveredCount = deliveries.filter(d => d.status === 'Delivered').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">Deliveries</h1>
          <p className="text-synapse-muted text-sm mt-1">Track medicine deliveries between hospitals</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-2xl font-display font-bold text-orange-400">{inTransitCount}</div>
            <div className="text-xs text-synapse-muted font-mono">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-display font-bold text-green-400">{deliveredCount}</div>
            <div className="text-xs text-synapse-muted font-mono">Delivered</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-synapse-surface border border-synapse-border animate-pulse" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-24">
          <Truck size={40} className="mx-auto mb-4 text-synapse-muted opacity-30" />
          <div className="text-synapse-muted text-sm">No deliveries yet. They appear here after a transfer is approved and delivery is arranged.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map(d => (
            <div key={d.id} className="bg-synapse-surface border border-synapse-border rounded-xl p-5 hover:border-synapse-accent/30 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${STATUS_COLORS[d.status]}`}>
                    <Truck size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-display font-semibold text-synapse-text">{d.drug_name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                    </div>
                    <div className="text-xs text-synapse-muted mb-2">
                      {d.providing_hospital_name} → {d.requesting_hospital_name}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className="text-synapse-muted">
                        Method: <span className="text-synapse-text">{METHOD_LABELS[d.delivery_method] || d.delivery_method}</span>
                      </span>
                      {d.agent_name && (
                        <span className="text-synapse-muted">
                          Agent: <span className="text-synapse-text">{d.agent_name}</span>
                          {d.agent_phone && <span className="text-synapse-accent ml-1">{d.agent_phone}</span>}
                        </span>
                      )}
                      {d.tracking_id && (
                        <span className="text-synapse-muted">
                          Tracking: <span className="text-synapse-accent font-mono">{d.tracking_id}</span>
                        </span>
                      )}
                      <span className="text-synapse-muted">
                        Qty: <span className="text-synapse-text font-mono">{d.transfer_quantity} {d.unit}</span>
                      </span>
                    </div>
                    {d.estimated_delivery && d.status !== 'Delivered' && (
                      <div className="flex items-center gap-1 text-xs text-yellow-400 mt-1">
                        <Clock size={10} /> ETA: {formatDateTime(d.estimated_delivery)}
                      </div>
                    )}
                    {d.delivered_at && (
                      <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                        <CheckCircle size={10} /> Delivered: {formatDateTime(d.delivered_at)}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setTrackerItem({ ...d, id: d.transfer_id, providing_hospital_id: d.providing_hospital_id, requesting_hospital_id: d.requesting_hospital_id })}
                  className="px-3 py-1.5 text-xs border border-synapse-accent/40 text-synapse-accent rounded-lg hover:bg-synapse-accent/10 transition-colors shrink-0"
                >
                  Track →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {trackerItem && (
        <DeliveryTracker
          transfer={trackerItem}
          onClose={() => setTrackerItem(null)}
          onUpdate={fetchDeliveries}
        />
      )}
    </div>
  );
}
