// FILE: client/src/pages/AgentDeliveryPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Truck, Package, CheckCircle, MapPin, Clock, AlertCircle, Loader2, Navigation, WifiOff } from 'lucide-react';

const STATUS_ORDER = ['Pending', 'Packed', 'PickedUp', 'InTransit', 'Delivered'];
const STEPS = [
  { key: 'Pending',   label: 'Delivery Assigned',    icon: Package     },
  { key: 'Packed',    label: 'Medicine Packed',       icon: Package     },
  { key: 'PickedUp',  label: 'Picked Up',             icon: Truck       },
  { key: 'InTransit', label: 'In Transit',            icon: Truck       },
  { key: 'Delivered', label: 'Delivered ✅',           icon: CheckCircle },
];
const NEXT_ACTION = {
  Pending:   { label: '📦 Mark as Packed',      next: 'Packed'    },
  Packed:    { label: '🚗 Mark as Picked Up',   next: 'PickedUp'  },
  PickedUp:  { label: '🚚 Mark as In Transit',  next: 'InTransit' },
  InTransit: { label: '✅ Mark as Delivered',   next: 'Delivered' },
};

export default function AgentDeliveryPage() {
  const { token }               = useParams();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  // GPS states
  const [gpsEnabled, setGpsEnabled]   = useState(false);
  const [gpsError, setGpsError]       = useState('');
  const [lastLocation, setLastLocation] = useState(null);
  const [gpsStatus, setGpsStatus]     = useState('idle'); // idle | requesting | active | error
  const gpsIntervalRef                = useRef(null);
  const watchIdRef                    = useRef(null);

  useEffect(() => {
    axios.get(`/api/deliveries/track/${token}`)
      .then(r => setDelivery(r.data.data))
      .catch(() => setError('Invalid or expired delivery link.'))
      .finally(() => setLoading(false));

    return () => {
      // Cleanup GPS on unmount
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [token]);

  // Send location to server
  const sendLocation = async (lat, lng, accuracy) => {
    try {
      await axios.post(`/api/gps/location/${token}`, {
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
      });
      setLastLocation({ lat, lng, time: new Date().toLocaleTimeString() });
    } catch (err) {
      console.error('GPS send error:', err);
    }
  };

  // Start GPS tracking
  const startGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Your browser does not support GPS.');
      setGpsStatus('error');
      return;
    }

    setGpsStatus('requesting');
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        sendLocation(latitude, longitude, accuracy);
        setGpsEnabled(true);
        setGpsStatus('active');

        // Send location every 10 seconds
        gpsIntervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => sendLocation(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
            (e) => console.error('GPS interval error:', e),
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }, 10000);
      },
      (err) => {
        setGpsStatus('error');
        if (err.code === 1) {
          setGpsError('Location permission denied. Please allow location access.');
        } else if (err.code === 2) {
          setGpsError('Location unavailable. Please check your GPS settings.');
        } else {
          setGpsError('Location request timed out. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Stop GPS tracking
  const stopGPS = () => {
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    setGpsEnabled(false);
    setGpsStatus('idle');
    setLastLocation(null);
  };

  const updateStatus = async (nextStatus) => {
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      await axios.patch(`/api/deliveries/track/${token}/status`, { status: nextStatus });
      setDelivery(prev => ({ ...prev, status: nextStatus }));
      setSuccess(`Status updated: ${nextStatus} ✅`);
      // Stop GPS if delivered
      if (nextStatus === 'Delivered') stopGPS();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const currentIdx = delivery ? STATUS_ORDER.indexOf(delivery.status) : -1;
  const nextAction = delivery ? NEXT_ACTION[delivery.status] : null;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p style={{ color: '#64748b' }}>Loading delivery...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#ff4757', marginBottom: 8 }}>Invalid Link</h2>
            <p style={{ color: '#64748b' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>🧬 SYNAPSE</div>
          <div style={styles.subtitle}>Agent Delivery Portal</div>
          <div style={styles.agentBadge}>👤 {delivery?.agent_name || 'Delivery Agent'}</div>
        </div>

        {/* GPS Tracking Section */}
        <div style={{
          margin: '12px 16px 0',
          padding: 16,
          background: gpsEnabled ? 'rgba(0,255,157,0.05)' : 'rgba(30,58,95,0.5)',
          border: `1px solid ${gpsEnabled ? 'rgba(0,255,157,0.3)' : '#1e3a5f'}`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: gpsEnabled ? '#00ff9d' : '#e2e8f0' }}>
                  Live Location Sharing
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {gpsEnabled ? `Updating every 10s • Last: ${lastLocation?.time || '...'}` : 'Share your location with the hospital'}
                </div>
              </div>
            </div>

            {/* GPS Toggle Button */}
            {delivery?.status !== 'Delivered' && (
              gpsStatus === 'requesting' ? (
                <div style={{ color: '#fbbf24', fontSize: 12 }}>Requesting...</div>
              ) : gpsEnabled ? (
                <button onClick={stopGPS} style={{
                  background: 'rgba(255,71,87,0.2)', border: '1px solid rgba(255,71,87,0.4)',
                  color: '#ff4757', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer'
                }}>
                  Stop
                </button>
              ) : (
                <button onClick={startGPS} style={{
                  background: 'rgba(0,255,157,0.2)', border: '1px solid rgba(0,255,157,0.4)',
                  color: '#00ff9d', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                  Start GPS
                </button>
              )
            )}
          </div>

          {/* GPS status indicators */}
          {gpsEnabled && lastLocation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#00ff9d' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff9d', animation: 'pulse 2s infinite' }} />
              Live • Hospital can see your location on map
            </div>
          )}

          {gpsError && (
            <div style={{ fontSize: 12, color: '#ff4757', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚠️ {gpsError}
            </div>
          )}

          {gpsStatus === 'idle' && !gpsError && delivery?.status !== 'Delivered' && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Tap "Start GPS" to let the hospital track your location in real time
            </div>
          )}
        </div>

        {/* Drug info */}
        <div style={styles.infoBox}>
          <div style={styles.infoTitle}>📦 Delivery Details</div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Medicine</span>
            <span style={styles.infoValue}>{delivery?.drug_name}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Quantity</span>
            <span style={{ ...styles.infoValue, color: '#00d4ff' }}>
              {delivery?.approved_quantity || delivery?.requested_quantity} {delivery?.unit}
            </span>
          </div>
        </div>

        {/* Addresses */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 16px 0' }}>
          <div style={styles.addressBox}>
            <div style={styles.addressTitle}>📍 PICKUP FROM</div>
            <div style={styles.addressText}>{delivery?.pickup_address}</div>
          </div>
          <div style={styles.addressBox}>
            <div style={styles.addressTitle}>🏥 DELIVER TO</div>
            <div style={styles.addressText}>{delivery?.delivery_address}</div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ margin: '12px 16px 0', padding: 16, background: '#111d35', border: '1px solid #1e3a5f', borderRadius: 12 }}>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            Delivery Progress
          </div>
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent   = idx === currentIdx;
            const Icon        = step.icon;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCompleted ? '#00ff9d22' : isCurrent ? '#00d4ff22' : '#1e3a5f',
                  border: `2px solid ${isCompleted ? '#00ff9d' : isCurrent ? '#00d4ff' : '#1e3a5f'}`,
                  boxShadow: isCurrent ? '0 0 12px #00d4ff44' : 'none',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 14 }}>
                    {isCompleted ? '✓' : isCurrent ? '●' : '○'}
                  </span>
                </div>
                <div>
                  <div style={{
                    fontSize: 14,
                    color: isCompleted ? '#e2e8f0' : isCurrent ? '#00d4ff' : '#64748b',
                    fontWeight: isCurrent ? 'bold' : 'normal',
                  }}>
                    {step.label}
                  </div>
                  {isCurrent && <div style={{ fontSize: 11, color: '#00d4ff', marginTop: 2 }}>● CURRENT</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Messages */}
        {success && (
          <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)', color: '#00ff9d', borderRadius: 8, fontSize: 13 }}>
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: '#ff4757', borderRadius: 8, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Action button */}
        {delivery?.status !== 'Delivered' && nextAction && (
          <div style={{ margin: '16px 16px 0' }}>
            <button
              onClick={() => updateStatus(nextAction.next)}
              disabled={updating}
              style={{
                width: '100%', padding: 18, borderRadius: 12, border: 'none',
                background: '#00d4ff', color: '#070b14', fontWeight: 'bold',
                fontSize: 18, cursor: updating ? 'not-allowed' : 'pointer',
                opacity: updating ? 0.7 : 1, transition: 'all 0.2s',
              }}
            >
              {updating ? '⏳ Updating...' : nextAction.label}
            </button>
          </div>
        )}

        {delivery?.status === 'Delivered' && (
          <div style={{ margin: '16px', padding: 24, background: 'rgba(0,255,157,0.05)', border: '1px solid rgba(0,255,157,0.3)', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#00ff9d' }}>Delivery Complete!</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Both hospitals have been notified. Great work!</div>
          </div>
        )}

        {delivery?.notes && (
          <div style={{ margin: '12px 16px', padding: '10px 14px', background: '#111d35', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 13, color: '#94a3b8' }}>
            📋 <span style={{ color: '#00d4ff' }}>Notes: </span>{delivery.notes}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: 16, color: '#1e3a5f', fontSize: 11, borderTop: '1px solid #1e3a5f', marginTop: 16 }}>
          Powered by Synapse Health Technologies
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#070b14', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', fontFamily: 'Arial, sans-serif' },
  card: { width: '100%', maxWidth: 480, background: '#0d1526', border: '1px solid #1e3a5f', borderRadius: 16, overflow: 'hidden', paddingBottom: 8 },
  header: { background: 'linear-gradient(135deg, #0d1526, #111d35)', borderBottom: '1px solid #1e3a5f', padding: '24px 20px', textAlign: 'center' },
  logo: { fontSize: 22, fontWeight: 'bold', color: '#00d4ff', letterSpacing: 4 },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 4, letterSpacing: 2 },
  agentBadge: { display: 'inline-block', marginTop: 12, background: '#1e3a5f', color: '#e2e8f0', padding: '4px 16px', borderRadius: 20, fontSize: 13, border: '1px solid #2d5a8e' },
  infoBox: { margin: '12px 16px 0', background: '#111d35', border: '1px solid #1e3a5f', borderRadius: 12, padding: 16 },
  infoTitle: { color: '#00d4ff', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e3a5f' },
  infoLabel: { color: '#64748b', fontSize: 13 },
  infoValue: { color: '#e2e8f0', fontSize: 13, fontWeight: 'bold' },
  addressBox: { background: '#111d35', border: '1px solid #1e3a5f', borderRadius: 12, padding: 12 },
  addressTitle: { fontSize: 10, color: '#64748b', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  addressText: { color: '#e2e8f0', fontSize: 12, lineHeight: 1.5 },
};
