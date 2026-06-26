// FILE: client/src/components/transfers/LiveTrackingModal.jsx
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import Modal from '../ui/Modal';
import { Navigation, Wifi, WifiOff, Clock, MapPin, Truck } from 'lucide-react';

export default function LiveTrackingModal({ transfer, delivery, onClose }) {
  const mapRef              = useRef(null);
  const mapInstanceRef      = useRef(null);
  const agentMarkerRef      = useRef(null);
  const trailLineRef        = useRef(null);
  const intervalRef         = useRef(null);
  const [location, setLocation]   = useState(null);
  const [isLive, setIsLive]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError]         = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);

  // Hospital coordinates (pickup and delivery)
  const HYDERABAD_CENTER = { lat: 17.3850, lng: 78.4867 };

  useEffect(() => {
    loadMap();
    fetchLocation(); // Fetch immediately
    intervalRef.current = setInterval(fetchLocation, 8000); // Poll every 8 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mapInstanceRef.current) mapInstanceRef.current.remove();
    };
  }, []);

  const loadMap = () => {
    if (window.L) { initMap(); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => { initMap(); setMapLoaded(true); };
    document.head.appendChild(script);
  };

  const initMap = () => {
    if (!mapRef.current || !window.L) return;
    if (mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current).setView([HYDERABAD_CENTER.lat, HYDERABAD_CENTER.lng], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Hospital markers
    const hospitalIcon = L.divIcon({
      className: '',
      html: `<div style="background:#0d1526;border:2px solid #00d4ff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 10px rgba(0,212,255,0.4)">🏥</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16],
    });

    // Add pickup hospital marker
    if (delivery?.pickup_address) {
      L.marker([17.4123, 78.4480], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(`<b>📍 Pickup</b><br>${delivery.pickup_address}`);
    }

    // Add delivery hospital marker
    if (delivery?.delivery_address) {
      L.marker([17.4239, 78.4738], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(`<b>🏥 Delivery</b><br>${delivery.delivery_address}`);
    }

    setMapLoaded(true);
  };

  const fetchLocation = async () => {
    if (!delivery?.id) return;
    try {
      const res = await api.get(`/gps/latest/${delivery.id}`);
      if (res.data.data) {
        const loc = res.data.data;
        setLocation(loc);
        setIsLive(loc.isLive);
        setLastUpdate(new Date().toLocaleTimeString());
        updateAgentOnMap(loc.latitude, loc.longitude);
      }
    } catch (err) {
      setError('Could not fetch agent location.');
    }
  };

  const updateAgentOnMap = (lat, lng) => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;

    const agentIcon = L.divIcon({
      className: '',
      html: `<div style="background:#ff6b35;border:3px solid #fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 15px rgba(255,107,53,0.6);animation:pulse 1s infinite">🚚</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20],
    });

    if (agentMarkerRef.current) {
      agentMarkerRef.current.setLatLng([lat, lng]);
    } else {
      agentMarkerRef.current = L.marker([lat, lng], { icon: agentIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>🚚 ${delivery?.agent_name || 'Agent'}</b><br>Live Location`);
    }

    // Pan map to agent
    mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 1 });

    // Fetch and draw trail
    fetchTrail();
  };

  const fetchTrail = async () => {
    if (!delivery?.id || !mapInstanceRef.current || !window.L) return;
    try {
      const res = await api.get(`/gps/trail/${delivery.id}`);
      const trail = res.data.data;

      if (trail.length < 2) return;

      const L = window.L;
      const latLngs = trail.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);

      if (trailLineRef.current) {
        trailLineRef.current.setLatLngs(latLngs);
      } else {
        trailLineRef.current = L.polyline(latLngs, {
          color: '#ff6b35', weight: 3, opacity: 0.7, dashArray: '8, 6',
        }).addTo(mapInstanceRef.current);
      }
    } catch (err) {
      console.error('Trail fetch error:', err);
    }
  };

  return (
    <Modal title="Live Agent Tracking" onClose={onClose} size="xl">
      <div className="space-y-4">
        {/* Status bar */}
        <div className={`flex items-center justify-between p-3 rounded-xl border ${
          isLive
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-synapse-bg border-synapse-border'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-synapse-muted'}`} />
            <div>
              <div className={`text-sm font-medium ${isLive ? 'text-green-400' : 'text-synapse-muted'}`}>
                {isLive ? '🟢 Agent is Live' : location ? '🟡 Last Known Location' : '⚪ Waiting for Agent'}
              </div>
              <div className="text-xs text-synapse-muted">
                {isLive
                  ? `Location updating every 10s • Last: ${lastUpdate}`
                  : location
                    ? `Last updated ${location.secondsAgo}s ago`
                    : 'Agent needs to tap "Start GPS" on their phone'
                }
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isLive ? (
              <Wifi size={16} className="text-green-400" />
            ) : (
              <WifiOff size={16} className="text-synapse-muted" />
            )}
          </div>
        </div>

        {/* Agent info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-synapse-bg border border-synapse-border rounded-xl p-3 text-center">
            <div className="text-lg mb-1">🚚</div>
            <div className="text-xs text-synapse-muted">Agent</div>
            <div className="text-sm font-medium text-synapse-text">{delivery?.agent_name || '—'}</div>
          </div>
          <div className="bg-synapse-bg border border-synapse-border rounded-xl p-3 text-center">
            <div className="text-lg mb-1">💊</div>
            <div className="text-xs text-synapse-muted">Drug</div>
            <div className="text-sm font-medium text-synapse-text truncate">{transfer?.drug_name || '—'}</div>
          </div>
          <div className="bg-synapse-bg border border-synapse-border rounded-xl p-3 text-center">
            <div className="text-lg mb-1">📊</div>
            <div className="text-xs text-synapse-muted">Status</div>
            <div className="text-sm font-medium text-synapse-accent">{delivery?.status || '—'}</div>
          </div>
        </div>

        {/* Map */}
        <div className="rounded-xl overflow-hidden border border-synapse-border" style={{ height: 350, position: 'relative' }}>
          <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0 }} />
          {!location && (
            <div className="absolute inset-0 flex items-center justify-center bg-synapse-bg/80 z-10 pointer-events-none">
              <div className="text-center">
                <Navigation size={32} className="mx-auto mb-3 text-synapse-muted opacity-40" />
                <div className="text-synapse-muted text-sm font-medium">Waiting for agent location...</div>
                <div className="text-synapse-muted text-xs mt-1">Agent needs to tap "Start GPS" on their delivery page</div>
              </div>
            </div>
          )}
        </div>

        {/* Map legend */}
        <div className="flex items-center gap-6 text-xs text-synapse-muted">
          <span className="flex items-center gap-1">🏥 Hospital</span>
          <span className="flex items-center gap-1">🚚 Agent (live)</span>
          <span className="flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 20, height: 2, background: '#ff6b35', borderTop: '2px dashed #ff6b35' }} />
            Route taken
          </span>
          <span>Auto-refreshes every 8s</span>
        </div>

        {error && (
          <div className="text-xs text-red-400 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">{error}</div>
        )}

        {/* Instructions for agent */}
        <div className="p-3 bg-synapse-bg border border-synapse-border rounded-xl">
          <div className="text-xs font-mono text-synapse-accent uppercase tracking-widest mb-2">How to activate live tracking</div>
          <div className="text-xs text-synapse-muted space-y-1">
            <div>1. Agent opens their delivery link on phone</div>
            <div>2. Agent taps <span className="text-green-400 font-medium">"Start GPS"</span> button</div>
            <div>3. Phone asks "Allow location?" → Agent taps <span className="text-green-400">Allow</span></div>
            <div>4. 🚚 Their location appears on this map and updates every 10 seconds</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
