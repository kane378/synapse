// FILE: client/src/pages/InventoryPage.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getUrgencyBg } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Alert, useAlert } from '../components/ui/Alert';
import { Package, Plus, Search, Filter, Edit2, Trash2, ArrowLeftRight } from 'lucide-react';
import RequestTransferModal from '../components/transfers/RequestTransferModal';

export default function InventoryPage() {
  const { user, isHospitalAdmin } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all'); // all | expiring
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [transferItem, setTransferItem] = useState(null);
  const { alert, show: showAlert, clear } = useAlert();

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filter === 'expiring') params.expiring_soon = 'true';
      const res = await api.get('/inventory', { params });
      setItems(res.data.data);
    } catch { showAlert('error', 'Failed to load inventory.'); }
    finally { setLoading(false); }
  }, [search, filter]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleDelete = async (id) => {
    if (!confirm('Remove this inventory item?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      showAlert('success', 'Item removed.');
      fetchInventory();
    } catch (e) { showAlert('error', e.response?.data?.error || 'Delete failed.'); }
  };

  // Show items from OTHER hospitals for transfer request
  const canRequest = (item) => item.hospital_id !== user?.hospitalId;
  const canEdit    = (item) => !isHospitalAdmin || item.hospital_id === user?.hospitalId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">Inventory</h1>
          <p className="text-synapse-muted text-sm mt-1">Manage oncology drug stock across hospitals</p>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="primary" size="md">
          <Plus size={14} /> Add Item
        </Button>
      </div>

      {alert && <Alert {...alert} onDismiss={clear} autoDismiss />}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-synapse-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search drugs, batches..."
            className="w-full bg-synapse-surface border border-synapse-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-synapse-text placeholder:text-synapse-muted/50 focus:outline-none focus:border-synapse-accent"
          />
        </div>
        <div className="flex gap-2">
          {[['all', 'All Items'], ['expiring', 'Expiring Soon']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-2 text-xs font-mono rounded-lg border transition-all ${
                filter === val
                  ? 'bg-synapse-accent/10 border-synapse-accent/40 text-synapse-accent'
                  : 'border-synapse-border text-synapse-muted hover:border-synapse-accent/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-synapse-surface border border-synapse-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-synapse-border">
                {['Drug Name', 'Batch', 'Hospital', 'Qty', 'Expiry', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono text-synapse-muted uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-synapse-muted text-sm animate-pulse">Loading inventory...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-synapse-muted text-sm">
                  <Package size={32} className="mx-auto mb-3 opacity-30" />
                  No inventory items found
                </td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-synapse-border/50 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-synapse-text">{item.drug_name}</div>
                    {item.generic_name && <div className="text-xs text-synapse-muted">{item.generic_name}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-synapse-muted">{item.batch_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-synapse-text">{item.hospital_name}</div>
                    <div className="text-xs text-synapse-muted">{item.city}, {item.state}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-synapse-text">{item.quantity} <span className="text-synapse-muted text-xs">{item.unit}</span></td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-synapse-text">{formatDate(item.expiry_date)}</div>
                    <div className="text-xs text-synapse-muted">{item.days_to_expiry}d remaining</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-lg border ${getUrgencyBg(item.urgency_level)}`}>
                      {item.urgency_level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canRequest(item) && (
                        <button onClick={() => setTransferItem(item)} className="p-1.5 text-synapse-muted hover:text-synapse-accent transition-colors" title="Request Transfer">
                          <ArrowLeftRight size={14} />
                        </button>
                      )}
                      {canEdit(item) && (
                        <>
                          <button onClick={() => setEditItem(item)} className="p-1.5 text-synapse-muted hover:text-synapse-accent transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-synapse-muted hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddInventoryModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); fetchInventory(); showAlert('success', 'Item added successfully.'); }}
        />
      )}
      {editItem && (
        <EditInventoryModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSuccess={() => { setEditItem(null); fetchInventory(); showAlert('success', 'Item updated.'); }}
        />
      )}
      {transferItem && (
        <RequestTransferModal
          item={transferItem}
          onClose={() => setTransferItem(null)}
          onSuccess={() => { setTransferItem(null); showAlert('success', 'Transfer request submitted.'); }}
        />
      )}
    </div>
  );
}

function AddInventoryModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ unit: 'vials' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/inventory', { ...form, hospital_id: user.hospitalId });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add item.');
    } finally { setLoading(false); }
  };

  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <Modal title="Add Inventory Item" onClose={onClose} size="lg">
      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Input label="Drug Name" required {...f('drug_name')} placeholder="Trastuzumab" /></div>
        <Input label="Generic Name" {...f('generic_name')} placeholder="Herceptin" />
        <Input label="Manufacturer" {...f('manufacturer')} placeholder="Roche" />
        <Input label="Batch Number" required {...f('batch_number')} placeholder="BCH-2024-001" />
        <Input label="Expiry Date" type="date" required {...f('expiry_date')} />
        <Input label="Quantity" type="number" min="1" required {...f('quantity')} />
        <Input label="Unit" required {...f('unit')} placeholder="vials" />
        <Input label="Unit Price (₹)" type="number" step="0.01" {...f('unit_price')} />
        <div className="col-span-2"><Input label="Storage Conditions" {...f('storage_conditions')} placeholder="2–8°C, avoid light" /></div>
        <div className="col-span-2 flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add Item</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditInventoryModal({ item, onClose, onSuccess }) {
  const [form, setForm] = useState({ quantity: item.quantity, unit_price: item.unit_price, storage_conditions: item.storage_conditions });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/inventory/${item.id}`, form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed.');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Edit: ${item.drug_name}`} onClose={onClose}>
      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Quantity" type="number" min="0" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
        <Input label="Unit Price (₹)" type="number" step="0.01" value={form.unit_price || ''} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} />
        <Input label="Storage Conditions" value={form.storage_conditions || ''} onChange={e => setForm(p => ({ ...p, storage_conditions: e.target.value }))} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Update</Button>
        </div>
      </form>
    </Modal>
  );
}
