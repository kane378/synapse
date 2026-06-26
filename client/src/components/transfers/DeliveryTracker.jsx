// FILE: client/src/components/transfers/DeliveryTracker.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/helpers';
import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const STEPS = [
  { key: 'Pending',    label: 'Delivery Arranged',  icon: Package      },
  { key: 'Packed',     label: 'Medicine Packed',     icon: Package      },
  { key: 'PickedUp',   label: 'Picked Up by Agent',  icon: Truck        },
  { key: 'InTransit',  label: 'In Transit',          icon: Truck        },
  { key: 'Delivered',  label: 'Delivered ✅',         icon: CheckCircle  },
];

const STATUS_ORDER = ['Pending', 'Packed', 'PickedUp', 'InTransit', 'Delivered'];

const METHOD_LABELS = {
  self_pickup:          '🚗 Self Pickup',
  hospital_vehicle:     '🚑 Hospital Vehicle',
  porter:               '📦 Porter',
  shadowfax:            '❄️ Shadowfax',
  dunzo:                '⚡ Dunzo',
  licensed_distributor: '📋 Licensed Distributor',
};

export default function DeliveryTracker({ transfer, onClose, onUpdate }) {
  const { user }                = useAuth();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError]       = useState('');

  // transfer.id is the actual transfer UUID
  const transferId = transfer.id;

  const userHospitalId      = user?.hospitalId || user?.hospital_id;
  const isProvidingHospital = transfer.providing_hospital_id === userHospitalId;

  useEffect(() => {
    setLoading(true);
    api.get(`/deliveries/transfer/${transferId}`)
      .then(r => setDelivery(r.data.data))
      .catch(() => setError('Failed to load delivery info.'))
      .finally(() => setLoading(false));
  }, [transferId]);

  const advanceStatus = async () => {
    if (!delivery) return;
    const currentIdx = STATUS_ORDER.indexOf(delivery.status);
    if (currentIdx >= STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[currentIdx + 1];

    setUpdating(true);
    setError('');
    try {
      await api.patch(`/deliveries/${delivery.id}/status`, { status: nextStatus });
      setDelivery(prev => prev ? { ...prev, status: nextStatus } : prev);
      if (onUpdate) onUpdate();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const currentStepIdx = delivery ? STATUS_ORDER.indexOf(delivery.status) : -1;

  return (
    <Modal title="Delivery Tracker" onClose={onClose} size="lg">
      {loading ? (
        <div className="text-center py-10 text-synapse-muted text-sm animate-pulse">
          Loading delivery info...
        </div>
      ) : !delivery ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 rounded-full bg-synapse-border/30 flex items-center justify-center mx-auto">
            <Truck size={28} className="text-synapse-muted opacity-40" />
          </div>
          <div className="text-synapse-text font-medium">No Delivery Arranged Yet</div>
          <div className="text-synapse-muted text-sm">
            {isProvidingHospital
              ? 'You need to arrange delivery for this transfer. Go back and click "Arrange Delivery".'
              : 'The providing hospital has not arranged delivery yet. You will be notified when they do.'
            }
          </div>
        </div>
      ) : (
        <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-1">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Delivery info summary */}
          <div className="bg-synapse-bg border border-synapse-border rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-synapse-muted mb-0.5">Delivery Method</div>
              <div className="text-synapse-text font-medium">{METHOD_LABELS[delivery.delivery_method] || delivery.delivery_method}</div>
            </div>
            {delivery.agent_name && (
              <div>
                <div className="text-synapse-muted mb-0.5">Agent Name</div>
                <div className="text-synapse-text font-medium">{delivery.agent_name}</div>
              </div>
            )}
            {delivery.agent_phone && (
              <div>
                <div className="text-synapse-muted mb-0.5">Agent Phone</div>
                <div className="text-synapse-accent font-mono">{delivery.agent_phone}</div>
              </div>
            )}
            {delivery.tracking_id && (
              <div>
                <div className="text-synapse-muted mb-0.5">Tracking ID</div>
                <div className="text-synapse-accent font-mono">{delivery.tracking_id}</div>
              </div>
            )}
            <div className="col-span-2">
              <div className="text-synapse-muted mb-0.5">📍 Pickup From</div>
              <div className="text-synapse-text">{delivery.pickup_address}</div>
            </div>
            <div className="col-span-2">
              <div className="text-synapse-muted mb-0.5">📍 Deliver To</div>
              <div className="text-synapse-text">{delivery.delivery_address}</div>
            </div>
            {delivery.estimated_delivery && delivery.status !== 'Delivered' && (
              <div className="col-span-2 flex items-center gap-1 text-yellow-400">
                <Clock size={11} />
                <span>ETA: {formatDateTime(delivery.estimated_delivery)}</span>
              </div>
            )}
          </div>

          {/* Step-by-step progress */}
          <div>
            <div className="text-xs font-mono text-synapse-muted uppercase tracking-widest mb-4">
              Live Progress
            </div>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-synapse-border" />

              <div className="space-y-4">
                {STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStepIdx;
                  const isCurrent   = idx === currentStepIdx;
                  const isPending   = idx > currentStepIdx;
                  const Icon        = step.icon;

                  return (
                    <div key={step.key} className="flex items-center gap-4 relative">
                      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
                        isCompleted ? 'border-synapse-green bg-synapse-green/20' :
                        isCurrent   ? 'border-synapse-accent bg-synapse-accent/20 ring-4 ring-synapse-accent/10' :
                                      'border-synapse-border bg-synapse-bg'
                      }`}>
                        <Icon size={15} className={
                          isCompleted ? 'text-synapse-green' :
                          isCurrent   ? 'text-synapse-accent' :
                                        'text-synapse-muted'
                        } />
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${
                          isCompleted ? 'text-synapse-text' :
                          isCurrent   ? 'text-synapse-accent' :
                                        'text-synapse-muted'
                        }`}>
                          {step.label}
                        </div>
                        {isCurrent && (
                          <div className="text-xs text-synapse-accent font-mono animate-pulse mt-0.5">
                            ● CURRENT STATUS
                          </div>
                        )}
                      </div>
                      {isCompleted && (
                        <div className="text-xs text-synapse-green">✓ Done</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Update status — only providing hospital, only if not delivered */}
          {isProvidingHospital && delivery.status !== 'Delivered' && delivery.status !== 'Failed' && (
            <div className="pt-4 border-t border-synapse-border">
              <p className="text-xs text-synapse-muted mb-3">
                As the providing hospital, update the delivery status as it progresses:
              </p>
              <Button
                onClick={advanceStatus}
                loading={updating}
                variant="primary"
                className="w-full justify-center"
              >
                <Truck size={14} />
                Mark as "{STATUS_ORDER[currentStepIdx + 1]}"
              </Button>
            </div>
          )}

          {delivery.status === 'Delivered' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <CheckCircle size={22} className="text-green-400 shrink-0" />
              <div>
                <div className="text-sm font-display font-semibold text-green-400">Medicine Delivered!</div>
                <div className="text-xs text-synapse-muted mt-0.5">Transfer has been completed successfully.</div>
              </div>
            </div>
          )}

          {delivery.notes && (
            <div className="text-xs p-3 bg-synapse-bg border border-synapse-border rounded-lg">
              <span className="text-synapse-accent font-medium">Notes: </span>
              <span className="text-synapse-muted">{delivery.notes}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
