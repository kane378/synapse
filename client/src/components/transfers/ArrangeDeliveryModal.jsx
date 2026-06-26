// FILE: client/src/components/transfers/ArrangeDeliveryModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Truck, Clock, IndianRupee, Phone, CheckCircle, MessageCircle, Copy, User } from 'lucide-react';

const METHOD_ICONS = {
  self_pickup: '🚗', hospital_vehicle: '🚑', porter: '📦',
  shadowfax: '❄️', dunzo: '⚡', licensed_distributor: '📋',
};
const METHOD_COLORS = {
  self_pickup: 'border-green-500/30 hover:border-green-500/60',
  hospital_vehicle: 'border-blue-500/30 hover:border-blue-500/60',
  porter: 'border-orange-500/30 hover:border-orange-500/60',
  shadowfax: 'border-cyan-500/30 hover:border-cyan-500/60',
  dunzo: 'border-yellow-500/30 hover:border-yellow-500/60',
  licensed_distributor: 'border-purple-500/30 hover:border-purple-500/60',
};
const VEHICLE_ICONS = {
  bike: '🏍️', auto: '🛺', van: '🚐', truck: '🚛', cold_chain_van: '❄️',
};

export default function ArrangeDeliveryModal({ transfer, onClose, onSuccess }) {
  const [methods, setMethods]         = useState({});
  const [verifiedAgents, setVerifiedAgents] = useState([]);
  const [selected, setSelected]       = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentName, setAgentName]     = useState('');
  const [agentPhone, setAgentPhone]   = useState('');
  const [trackingId, setTrackingId]   = useState('');
  const [notes, setNotes]             = useState('');
  const [useRegisteredAgent, setUseRegisteredAgent] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [confirmed, setConfirmed]     = useState(false);
  const [agentLink, setAgentLink]     = useState('');
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    api.get('/deliveries/methods').then(r => setMethods(r.data.data)).catch(() => {});
    // Fetch verified agents in same city as providing hospital
    api.get('/agents').then(r => setVerifiedAgents(r.data.data)).catch(() => {});
  }, []);

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
    setAgentName(agent.full_name);
    setAgentPhone(agent.phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return setError('Please select a delivery method.');
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/deliveries', {
        transfer_id:     transfer.id,
        delivery_method: selected,
        agent_name:      agentName,
        agent_phone:     agentPhone,
        tracking_id:     trackingId,
        notes,
        agent_id:        selectedAgent?.id || null,
      });
      setAgentLink(res.data.agentLink);
      setConfirmed(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to arrange delivery.');
      setLoading(false);
    }
  };

  const buildWhatsAppUrl = () => {
    if (!agentPhone) return null;
    let phone = agentPhone.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('0')) phone = '91' + phone.slice(1);
    if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;

    const qty = transfer.approved_quantity ?? transfer.requested_quantity;
    const message = `Hello ${agentName || ''}! 🏥 *SYNAPSE Medical Delivery*

You have been assigned a delivery:
📦 *Drug:* ${transfer.drug_name} (${qty} ${transfer.unit})
📍 *Pickup:* ${transfer.providing_hospital_name}
🏥 *Deliver To:* ${transfer.requesting_hospital_name}
🚚 *Method:* ${methods[selected]?.label || selected}

👇 *Update delivery status here:*
${agentLink}

Thank you, Synapse Health`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(agentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (confirmed) {
    const whatsappUrl = buildWhatsAppUrl();
    return (
      <Modal title="Delivery Confirmed! 🎉" onClose={onSuccess} size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <CheckCircle size={24} className="text-green-400 shrink-0" />
            <div>
              <div className="text-sm font-display font-semibold text-green-400">Delivery Arranged!</div>
              <div className="text-xs text-synapse-muted mt-0.5">{transfer.requesting_hospital_name} has been notified.</div>
            </div>
          </div>

          {agentLink && (
            <div className="bg-synapse-bg border border-synapse-border rounded-xl p-4 space-y-3">
              <div className="text-xs font-mono text-synapse-accent uppercase tracking-widest">🔗 Agent Status Link</div>
              <p className="text-xs text-synapse-muted">
                Share with <span className="text-synapse-text font-medium">{agentName || 'agent'}</span> to update delivery status from their phone.
              </p>
              <div className="flex items-center gap-2 p-2 bg-synapse-surface border border-synapse-border rounded-lg">
                <span className="text-xs text-synapse-accent font-mono truncate flex-1">{agentLink}</span>
                <button onClick={copyLink}
                  className="shrink-0 px-2 py-1 text-xs border border-synapse-border rounded text-synapse-muted hover:text-synapse-accent transition-colors">
                  {copied ? '✓ Copied!' : <Copy size={12} />}
                </button>
              </div>
            </div>
          )}

          {whatsappUrl && (
            <div className="bg-synapse-bg border border-green-500/30 rounded-xl p-4 space-y-3">
              <div className="text-xs font-mono text-green-400 uppercase tracking-widest">📱 Send WhatsApp to Agent</div>
              <p className="text-xs text-synapse-muted">
                Sends drug details + pickup/delivery address + status update link to {agentName}.
              </p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors">
                <MessageCircle size={16} /> Send WhatsApp to {agentName || 'Agent'}
              </a>
            </div>
          )}

          <Button variant="primary" className="w-full justify-center" onClick={onSuccess}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Arrange Delivery" onClose={onClose} size="xl">
      <div className="overflow-y-auto max-h-[65vh] pr-1">
        {/* Transfer summary */}
        <div className="bg-synapse-bg border border-synapse-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><div className="text-synapse-muted mb-0.5">Drug</div><div className="text-synapse-text font-medium">{transfer.drug_name}</div></div>
            <div><div className="text-synapse-muted mb-0.5">Quantity</div><div className="text-synapse-accent font-mono">{transfer.approved_quantity ?? transfer.requested_quantity} {transfer.unit}</div></div>
            <div><div className="text-synapse-muted mb-0.5">Deliver To</div><div className="text-synapse-text font-medium">{transfer.requesting_hospital_name}</div></div>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Delivery method */}
          <div>
            <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest mb-3 block">Select Delivery Method</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(methods).map(([key, method]) => (
                <button key={key} type="button" onClick={() => setSelected(key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selected === key ? 'border-synapse-accent/60 bg-synapse-accent/10' : `bg-synapse-bg ${METHOD_COLORS[key]}`
                  }`}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-lg">{METHOD_ICONS[key]}</span>
                    {selected === key && <CheckCircle size={14} className="text-synapse-accent" />}
                  </div>
                  <div className="font-medium text-xs text-synapse-text mb-1">{method.label}</div>
                  <div className="text-xs text-synapse-muted leading-relaxed">{method.description}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-synapse-muted"><Clock size={10} /> ~{method.estimated_hours}h</span>
                    <span className="flex items-center gap-1 text-xs text-synapse-muted"><IndianRupee size={10} /> {method.cost === 0 ? 'Free' : `₹${method.cost}`}</span>
                  </div>
                  {method.contact && <div className="text-xs text-synapse-accent mt-1 flex items-center gap-1"><Phone size={9} /> {method.contact}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Agent selection */}
          {selected && !['self_pickup', 'hospital_vehicle'].includes(selected) && (
            <div className="space-y-3 p-4 bg-synapse-bg border border-synapse-border rounded-xl">
              <div className="text-xs font-mono text-synapse-accent uppercase tracking-widest">Agent / Courier Details</div>

              {/* Toggle: Registered agent vs Manual */}
              <div className="flex gap-2">
                <button type="button" onClick={() => setUseRegisteredAgent(false)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    !useRegisteredAgent ? 'bg-synapse-accent/10 border-synapse-accent/40 text-synapse-accent' : 'border-synapse-border text-synapse-muted'
                  }`}>
                  Enter Manually
                </button>
                <button type="button" onClick={() => setUseRegisteredAgent(true)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    useRegisteredAgent ? 'bg-synapse-accent/10 border-synapse-accent/40 text-synapse-accent' : 'border-synapse-border text-synapse-muted'
                  }`}>
                  <User size={11} className="inline mr-1" />
                  Choose Verified Agent ({verifiedAgents.length})
                </button>
              </div>

              {/* Verified agents list */}
              {useRegisteredAgent && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {verifiedAgents.length === 0 ? (
                    <div className="text-xs text-synapse-muted text-center py-4">
                      No verified agents yet. <a href="/register-agent" target="_blank" className="text-synapse-accent hover:underline">Register one →</a>
                    </div>
                  ) : verifiedAgents.map(agent => (
                    <button key={agent.id} type="button" onClick={() => handleAgentSelect(agent)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedAgent?.id === agent.id ? 'border-synapse-accent/60 bg-synapse-accent/10' : 'border-synapse-border bg-synapse-surface hover:border-synapse-accent/30'
                      }`}>
                      <span className="text-xl">{VEHICLE_ICONS[agent.vehicle_type] || '🚚'}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-synapse-text">{agent.full_name}</div>
                        <div className="text-xs text-synapse-muted">{agent.service_city}, {agent.service_state} · {agent.phone}</div>
                        <div className="text-xs text-synapse-muted">⭐ {agent.rating} · {agent.total_deliveries} deliveries</div>
                      </div>
                      {selectedAgent?.id === agent.id && <CheckCircle size={16} className="text-synapse-accent shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Manual entry */}
              {!useRegisteredAgent && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">Agent Name</label>
                    <input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="e.g. Raju Kumar"
                      className="w-full bg-synapse-surface border border-synapse-border rounded-lg px-3 py-2 text-sm text-synapse-text focus:outline-none focus:border-synapse-accent" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">
                      Phone {agentPhone && <span className="text-green-400 normal-case">← WhatsApp ready</span>}
                    </label>
                    <input value={agentPhone} onChange={e => setAgentPhone(e.target.value)} placeholder="+91 9876543210"
                      className="w-full bg-synapse-surface border border-synapse-border rounded-lg px-3 py-2 text-sm text-synapse-text focus:outline-none focus:border-synapse-accent" />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">Tracking ID (optional)</label>
                    <input value={trackingId} onChange={e => setTrackingId(e.target.value)} placeholder="e.g. SFX-2024-XXXXX"
                      className="w-full bg-synapse-surface border border-synapse-border rounded-lg px-3 py-2 text-sm text-synapse-text focus:outline-none focus:border-synapse-accent" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">Additional Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Cold chain requirements, special handling..." rows={2}
              className="w-full bg-synapse-bg border border-synapse-border rounded-lg px-3 py-2.5 text-sm text-synapse-text placeholder:text-synapse-muted/50 focus:outline-none focus:border-synapse-accent resize-none" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!selected}>
              <Truck size={14} /> Confirm Delivery
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
