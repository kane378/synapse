// FILE: client/src/pages/TransfersPage.jsx  (REPLACE entire file)
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDateTime, getStatusBadge } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Alert, useAlert } from '../components/ui/Alert';
import { ArrowLeftRight, CheckCircle, XCircle, Truck, FileText } from 'lucide-react';
import RespondModal from '../components/transfers/RespondModal';
import ArrangeDeliveryModal from '../components/transfers/ArrangeDeliveryModal';
import LiveTrackingModal from '../components/transfers/LiveTrackingModal';
import DeliveryTracker from '../components/transfers/DeliveryTracker';
import CertificateModal from '../components/transfers/CertificateModal';

export default function TransfersPage() {
  const { user } = useAuth();
  const [transfers, setTransfers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatus]     = useState('');
  const [respondItem, setRespondItem] = useState(null);
  const [deliveryItem, setDeliveryItem] = useState(null);
  const [trackerItem, setTrackerItem] = useState(null);
  const [certItem, setCertItem]       = useState(null);
  const [liveTrackItem, setLiveTrackItem] = useState(null);
  const [liveTrackDelivery, setLiveTrackDelivery] = useState(null);
  const { alert, show: showAlert, clear } = useAlert();

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await api.get('/transfers', { params });
      setTransfers(res.data.data);
    } catch { showAlert('error', 'Failed to load transfers.'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const handleComplete = async (id) => {
    try {
      await api.patch(`/transfers/${id}/complete`);
      showAlert('success', 'Transfer marked as completed.');
      fetchTransfers();
    } catch (e) { showAlert('error', e.response?.data?.error || 'Failed.'); }
  };

  const userHospitalId = user?.hospitalId || user?.hospital_id;
  const isProvidingHospital  = (t) => t.providing_hospital_id === userHospitalId;
  const isRequestingHospital = (t) => t.requesting_hospital_id === userHospitalId;

  const statuses = ['', 'Pending', 'Approved', 'Completed', 'Rejected'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">Transfers</h1>
          <p className="text-synapse-muted text-sm mt-1">Inter-hospital drug transfer requests, approvals & delivery</p>
        </div>
      </div>

      {alert && <Alert {...alert} onDismiss={clear} autoDismiss />}

      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
              statusFilter === s
                ? 'bg-synapse-accent/10 border-synapse-accent/40 text-synapse-accent'
                : 'border-synapse-border text-synapse-muted hover:border-synapse-accent/30'
            }`}
          >{s || 'All'}</button>
        ))}
      </div>

      <div className="bg-synapse-surface border border-synapse-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-synapse-border">
                {['Drug', 'From → To', 'Qty', 'Requested', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono text-synapse-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center text-synapse-muted text-sm animate-pulse">Loading transfers...</td></tr>
              ) : transfers.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <ArrowLeftRight size={32} className="mx-auto mb-3 text-synapse-muted opacity-30" />
                  <div className="text-synapse-muted text-sm">No transfers found</div>
                </td></tr>
              ) : transfers.map(t => (
                <tr key={t.id} className="border-b border-synapse-border/50 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-synapse-text">{t.drug_name}</div>
                    <div className="text-xs text-synapse-muted font-mono">{t.batch_number}</div>
                    <div className="text-xs text-synapse-muted">Exp: {formatDate(t.expiry_date)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-synapse-muted">{t.providing_hospital_name}</div>
                    <div className="text-xs text-synapse-accent">→ {t.requesting_hospital_name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-synapse-text">
                    {t.approved_quantity ?? t.requested_quantity}
                    <span className="text-synapse-muted text-xs ml-1">{t.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-synapse-text">{t.requested_by_name}</div>
                    <div className="text-xs text-synapse-muted">{formatDateTime(t.requested_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-lg ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Providing hospital responds to pending */}
                      {t.status === 'Pending' && isProvidingHospital(t) && (
                        <button onClick={() => setRespondItem(t)}
                          className="px-2 py-1 text-xs border border-synapse-accent/40 text-synapse-accent rounded-lg hover:bg-synapse-accent/10 transition-colors">
                          Respond
                        </button>
                      )}
                      {/* Providing hospital arranges delivery after approval */}
                      {t.status === 'Approved' && isProvidingHospital(t) && (
                        <button onClick={() => setDeliveryItem(t)}
                          className="px-2 py-1 text-xs border border-blue-500/40 text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors flex items-center gap-1">
                          <Truck size={10} /> Arrange Delivery
                        </button>
                      )}
                      {/* Track delivery */}
                      {['Approved', 'Completed'].includes(t.status) && (
                        <button onClick={() => setTrackerItem(t)}
                          className="px-2 py-1 text-xs border border-purple-500/40 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-colors flex items-center gap-1">
                          <Truck size={10} /> Track
                        </button>
                      )}
{t.status === 'Approved' && (
  <button
    onClick={async () => {
      const res = await api.get(`/deliveries/transfer/${t.id}`);
      setLiveTrackDelivery(res.data.data);
      setLiveTrackItem(t);
    }}
    className="px-2 py-1 text-xs border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/10 transition-colors flex items-center gap-1">
    🗺️ Live
  </button>
)}
                      {/* Requesting hospital completes */}
                      {t.status === 'Approved' && isRequestingHospital(t) && (
                        <button onClick={() => handleComplete(t.id)}
                          className="px-2 py-1 text-xs border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/10 transition-colors">
                          Complete
                        </button>
                      )}
                      {/* Certificate for completed transfers */}
                      {t.status === 'Completed' && (
                        <button onClick={() => setCertItem(t)}
                          className="px-2 py-1 text-xs border border-yellow-500/40 text-yellow-400 rounded-lg hover:bg-yellow-500/10 transition-colors flex items-center gap-1">
                          <FileText size={10} /> Certificate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {respondItem && (
        <RespondModal transfer={respondItem} onClose={() => setRespondItem(null)}
          onSuccess={() => { setRespondItem(null); fetchTransfers(); showAlert('success', 'Response submitted.'); }} />
      )}
      {deliveryItem && (
        <ArrangeDeliveryModal transfer={deliveryItem} onClose={() => setDeliveryItem(null)}
          onSuccess={() => { setDeliveryItem(null); fetchTransfers(); showAlert('success', 'Delivery arranged successfully!'); }} />
      )}
      {trackerItem && (
        <DeliveryTracker transfer={trackerItem} onClose={() => setTrackerItem(null)}
          onUpdate={() => fetchTransfers()} />
      )}
{liveTrackItem && liveTrackDelivery && (
  <LiveTrackingModal
    transfer={liveTrackItem}
    delivery={liveTrackDelivery}
    onClose={() => { setLiveTrackItem(null); setLiveTrackDelivery(null); }}
  />
)}
      {certItem && (
        <CertificateModal transfer={certItem} onClose={() => setCertItem(null)} />
      )}
    </div>
  );
}
