// FILE: client/src/pages/AgentsPage.jsx
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDate } from '../utils/helpers';
import { Alert, useAlert } from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { Truck, CheckCircle, Clock, MapPin, Phone, Mail, ShieldCheck, Star } from 'lucide-react';

const VEHICLE_LABELS = {
  bike:           '🏍️ Bike',
  auto:           '🛺 Auto',
  van:            '🚐 Van',
  truck:          '🚛 Truck',
  cold_chain_van: '❄️ Cold Chain Van',
};

export default function AgentsPage() {
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const { alert, show: showAlert, clear } = useAlert();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/agents');
      setAgents(res.data.data);
    } catch { showAlert('error', 'Failed to load agents.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleVerify = async (id) => {
    if (!confirm('Verify this delivery agent?')) return;
    try {
      await api.patch(`/agents/${id}/verify`);
      showAlert('success', 'Agent verified successfully!');
      fetchAgents();
    } catch (e) { showAlert('error', e.response?.data?.error || 'Verification failed.'); }
  };

  const filtered = agents.filter(a => {
    if (filter === 'pending')  return !a.is_verified;
    if (filter === 'verified') return a.is_verified;
    return true;
  });

  const pendingCount  = agents.filter(a => !a.is_verified).length;
  const verifiedCount = agents.filter(a => a.is_verified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">Delivery Agents</h1>
          <p className="text-synapse-muted text-sm mt-1">Manage and verify delivery agent registrations</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-2xl font-display font-bold text-yellow-400">{pendingCount}</div>
            <div className="text-xs text-synapse-muted font-mono">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-display font-bold text-green-400">{verifiedCount}</div>
            <div className="text-xs text-synapse-muted font-mono">Verified</div>
          </div>
        </div>
      </div>

      {alert && <Alert {...alert} onDismiss={clear} autoDismiss />}

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
          <Clock size={16} className="text-yellow-400 shrink-0" />
          <span className="text-sm text-yellow-400">
            <strong>{pendingCount}</strong> agent{pendingCount > 1 ? 's' : ''} awaiting verification.
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[['all', 'All'], ['pending', 'Pending'], ['verified', 'Verified']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
              filter === val
                ? 'bg-synapse-accent/10 border-synapse-accent/40 text-synapse-accent'
                : 'border-synapse-border text-synapse-muted hover:border-synapse-accent/30'
            }`}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-synapse-surface border border-synapse-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Truck size={32} className="mx-auto mb-3 text-synapse-muted opacity-30" />
          <div className="text-synapse-muted text-sm">No agents found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(agent => (
            <div key={agent.id}
              className={`bg-synapse-surface border rounded-xl p-5 transition-all ${
                agent.is_verified ? 'border-synapse-border' : 'border-yellow-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl ${
                    agent.is_verified ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'
                  }`}>
                    {VEHICLE_LABELS[agent.vehicle_type]?.split(' ')[0] || '🚚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-display font-semibold text-synapse-text">{agent.full_name}</h3>
                      {agent.is_verified ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/10 border border-green-500/30 text-green-400 rounded-full">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                      <span className="text-xs text-synapse-muted">{VEHICLE_LABELS[agent.vehicle_type]}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-synapse-muted">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {agent.service_city}, {agent.service_state}</span>
                      <span className="flex items-center gap-1"><Phone size={10} /> {agent.phone}</span>
                      <span className="flex items-center gap-1"><Mail size={10} /> {agent.email}</span>
                      <span className="flex items-center gap-1"><Star size={10} /> {agent.rating} rating</span>
                      <span>{agent.total_deliveries} deliveries</span>
                      <span>Registered: {formatDate(agent.created_at)}</span>
                    </div>
                    {agent.is_verified && agent.verification_date && (
                      <div className="text-xs text-green-400/70 mt-1">
                        Verified on {formatDate(agent.verification_date)}
                      </div>
                    )}
                  </div>
                </div>
                {!agent.is_verified && (
                  <Button onClick={() => handleVerify(agent.id)} variant="success" size="sm" className="shrink-0">
                    <CheckCircle size={14} /> Verify Agent
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
