// FILE: client/src/components/transfers/RequestTransferModal.jsx
import { useState } from 'react';
import api from '../../utils/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatDate, getUrgencyBg } from '../../utils/helpers';
import { AlertTriangle } from 'lucide-react';

export default function RequestTransferModal({ item, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || parseInt(quantity) < 1) {
      return setError('Please enter a valid quantity.');
    }
    if (parseInt(quantity) > item.quantity) {
      return setError(`Maximum available: ${item.quantity} ${item.unit}`);
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/transfers', {
        inventory_id: item.id,
        requested_quantity: parseInt(quantity),
        request_note: note,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed.');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Request Drug Transfer" onClose={onClose}>
      {/* Item summary */}
      <div className="bg-synapse-bg border border-synapse-border rounded-xl p-4 mb-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="font-display font-semibold text-synapse-text">{item.drug_name}</div>
            {item.generic_name && <div className="text-xs text-synapse-muted">{item.generic_name}</div>}
          </div>
          <span className={`px-2 py-1 text-xs rounded-lg border ${getUrgencyBg(item.urgency_level)}`}>
            {item.urgency_level}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
          <div>
            <div className="text-synapse-muted mb-0.5">From</div>
            <div className="text-synapse-text font-medium">{item.hospital_name}</div>
          </div>
          <div>
            <div className="text-synapse-muted mb-0.5">Available</div>
            <div className="text-synapse-text font-medium">{item.quantity} {item.unit}</div>
          </div>
          <div>
            <div className="text-synapse-muted mb-0.5">Expires</div>
            <div className="text-synapse-text font-medium">{formatDate(item.expiry_date)}</div>
          </div>
        </div>
      </div>

      {item.days_to_expiry <= 7 && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertTriangle size={12} />
          CRITICAL: This item expires in {item.days_to_expiry} days. Urgent transfer required.
        </div>
      )}

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={`Quantity Requested (max: ${item.quantity} ${item.unit})`}
          type="number"
          min="1"
          max={item.quantity}
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          required
          placeholder={`Enter quantity`}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-synapse-muted uppercase tracking-widest">
            Request Note (optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Reason for request, patient count, urgency details..."
            rows={3}
            className="w-full bg-synapse-bg border border-synapse-border rounded-lg px-3 py-2.5 text-sm text-synapse-text placeholder:text-synapse-muted/50 focus:outline-none focus:border-synapse-accent resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} variant="primary">
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
