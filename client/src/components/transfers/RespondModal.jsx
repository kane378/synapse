// FILE: client/src/components/transfers/RespondModal.jsx
import { useState } from 'react';
import api from '../../utils/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { CheckCircle, XCircle } from 'lucide-react';

export default function RespondModal({ transfer, onClose, onSuccess }) {
  const [approvedQty, setApprovedQty] = useState(transfer.requested_quantity);
  const [note, setNote]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const respond = async (action) => {
    setLoading(true);
    setError('');
    try {
      await api.patch(`/transfers/${transfer.id}/respond`, {
        action,
        approved_quantity: action === 'approve' ? parseInt(approvedQty) : undefined,
        response_note: note,
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed.');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Respond to Transfer Request" onClose={onClose}>
      <div className="bg-synapse-bg border border-synapse-border rounded-xl p-4 mb-5 space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-synapse-muted">Drug</span>
          <span className="text-xs text-synapse-text font-medium">{transfer.drug_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-synapse-muted">Requested By</span>
          <span className="text-xs text-synapse-text">{transfer.requesting_hospital_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-synapse-muted">Requested Qty</span>
          <span className="text-xs text-synapse-accent font-mono">{transfer.requested_quantity} {transfer.unit}</span>
        </div>
        {transfer.request_note && (
          <div className="pt-2 border-t border-synapse-border">
            <div className="text-xs text-synapse-muted mb-1">Note from requester:</div>
            <div className="text-xs text-synapse-text italic">"{transfer.request_note}"</div>
          </div>
        )}
      </div>
      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">Approved Quantity</label>
          <input type="number" min="1" max={transfer.requested_quantity} value={approvedQty}
            onChange={e => setApprovedQty(e.target.value)}
            className="w-full bg-synapse-bg border border-synapse-border rounded-lg px-3 py-2.5 text-sm text-synapse-text focus:outline-none focus:border-synapse-accent" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">Response Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Optional note..." rows={3}
            className="w-full bg-synapse-bg border border-synapse-border rounded-lg px-3 py-2.5 text-sm text-synapse-text placeholder:text-synapse-muted/50 focus:outline-none focus:border-synapse-accent resize-none" />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={() => respond('reject')}>
            <XCircle size={14} /> Reject
          </Button>
          <Button variant="success" loading={loading} onClick={() => respond('approve')}>
            <CheckCircle size={14} /> Approve
          </Button>
        </div>
      </div>
    </Modal>
  );
}
