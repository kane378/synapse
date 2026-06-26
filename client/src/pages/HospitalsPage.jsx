// FILE: client/src/pages/HospitalsPage.jsx
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDate } from '../utils/helpers';
import { Alert, useAlert } from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { Building2, CheckCircle, Clock, MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all'); // all | pending | verified
  const { alert, show: showAlert, clear } = useAlert();

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hospitals');
      setHospitals(res.data.data);
    } catch { showAlert('error', 'Failed to load hospitals.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHospitals(); }, []);

  const handleVerify = async (id) => {
    if (!confirm('Verify this hospital? This will grant their admins platform access.')) return;
    try {
      await api.patch(`/hospitals/${id}/verify`);
      showAlert('success', 'Hospital verified successfully.');
      fetchHospitals();
    } catch (e) { showAlert('error', e.response?.data?.error || 'Verification failed.'); }
  };

  const filtered = hospitals.filter(h => {
    if (filter === 'pending')  return !h.is_verified;
    if (filter === 'verified') return h.is_verified;
    return true;
  });

  const pendingCount  = hospitals.filter(h => !h.is_verified).length;
  const verifiedCount = hospitals.filter(h => h.is_verified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">Hospital Registry</h1>
          <p className="text-synapse-muted text-sm mt-1">Manage and verify hospital registrations</p>
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
            <strong>{pendingCount}</strong> hospital{pendingCount > 1 ? 's' : ''} awaiting verification.
            Review and approve to grant platform access.
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[['all', 'All'], ['pending', 'Pending Verification'], ['verified', 'Verified']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
              filter === val
                ? 'bg-synapse-accent/10 border-synapse-accent/40 text-synapse-accent'
                : 'border-synapse-border text-synapse-muted hover:border-synapse-accent/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-synapse-surface border border-synapse-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={32} className="mx-auto mb-3 text-synapse-muted opacity-30" />
          <div className="text-synapse-muted text-sm">No hospitals found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(h => (
            <div
              key={h.id}
              className={`bg-synapse-surface border rounded-xl p-5 transition-all ${
                h.is_verified ? 'border-synapse-border' : 'border-yellow-500/30 bg-yellow-500/3'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    h.is_verified ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'
                  }`}>
                    <Building2 size={18} className={h.is_verified ? 'text-green-400' : 'text-yellow-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-synapse-text">{h.name}</h3>
                      {h.is_verified ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/10 border border-green-500/30 text-green-400 rounded-full">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-synapse-muted">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {h.city}, {h.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={10} /> {h.contact_email}
                      </span>
                      {h.contact_phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} /> {h.contact_phone}
                        </span>
                      )}
                      <span className="font-mono">License: {h.license_number}</span>
                      <span>Registered: {formatDate(h.created_at)}</span>
                      {h.admin_count > 0 && <span>{h.admin_count} admin(s)</span>}
                    </div>
                    {h.is_verified && h.verification_date && (
                      <div className="text-xs text-green-400/70 mt-1">
                        Verified on {formatDate(h.verification_date)}
                      </div>
                    )}
                  </div>
                </div>

                {!h.is_verified && (
                  <Button
                    onClick={() => handleVerify(h.id)}
                    variant="success"
                    size="sm"
                    className="shrink-0"
                  >
                    <CheckCircle size={14} /> Verify Hospital
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
