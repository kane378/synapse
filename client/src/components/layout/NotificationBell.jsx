// FILE: client/src/components/layout/NotificationBell.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Bell, X, Check, Truck, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { formatDateTime } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const TYPE_ICONS = {
  delivery_created:   <Truck size={14} className="text-blue-400" />,
  delivery_completed: <Check size={14} className="text-green-400" />,
  transfer_requested: <ArrowLeftRight size={14} className="text-yellow-400" />,
  waste_alert:        <AlertTriangle size={14} className="text-red-400" />,
};

export default function NotificationBell() {
  const { isHospitalAdmin }       = useAuth();
  const [open, setOpen]           = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]       = useState(0);

  const fetchUnread = () => {
    if (!isHospitalAdmin) return;
    api.get('/notifications/unread-count')
      .then(r => setUnread(r.data.count))
      .catch(() => {});
  };

  const fetchNotifications = () => {
    if (!isHospitalAdmin) return;
    api.get('/notifications')
      .then(r => setNotifications(r.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    fetchNotifications();
    if (unread > 0) {
      api.patch('/notifications/mark-read').then(() => setUnread(0)).catch(() => {});
    }
  };

  if (!isHospitalAdmin) return null;

  return (
    <div className="relative">
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative p-2 rounded-lg text-synapse-muted hover:text-synapse-text hover:bg-white/5 transition-colors"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-mono">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 w-80 bg-synapse-surface border border-synapse-border rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-synapse-border">
            <span className="text-sm font-display font-semibold text-synapse-text">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-synapse-muted hover:text-synapse-text">
              <X size={14} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-synapse-muted text-sm">No notifications</div>
            ) : notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 border-b border-synapse-border/50 hover:bg-white/2 transition-colors ${!n.is_read ? 'bg-synapse-accent/3' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{TYPE_ICONS[n.type] || <Bell size={14} className="text-synapse-muted" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-synapse-text">{n.title}</div>
                    <div className="text-xs text-synapse-muted mt-0.5 leading-relaxed">{n.message}</div>
                    <div className="text-xs text-synapse-muted/60 mt-1">{formatDateTime(n.created_at)}</div>
                  </div>
                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-synapse-accent mt-1.5 shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
