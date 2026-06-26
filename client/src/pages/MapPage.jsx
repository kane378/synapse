// FILE: client/src/pages/MapPage.jsx
import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { MapPin, Building2, Phone, Mail, CheckCircle } from 'lucide-react';

export default function MapPage() {
  const [hospitals, setHospitals] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const mapRef                    = useRef(null);
  const mapInstanceRef            = useRef(null);
  const markersRef                = useRef([]);

  useEffect(() => {
    api.get('/hospitals')
      .then(r => setHospitals(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;

    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      if (window.L) { initMap(); return; }

      // Load Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Load Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    };

    loadLeaflet();
  }, [loading, hospitals]);

  const HOSPITAL_COORDS = {
    'Care Hospital':   { lat: 17.4123, lng: 78.4480 }, // Banjara Hills
    'CARE HOSPTAL':    { lat: 17.4123, lng: 78.4480 },
    'Deccan Hospital': { lat: 17.4239, lng: 78.4738 }, // Somajiguda
    'DECCAN HOSPITAL': { lat: 17.4239, lng: 78.4738 },
    'NIMS':            { lat: 17.4399, lng: 78.4483 }, // Punjagutta
  };

  const getCoords = (hospital) => {
    // Check known hospitals
    for (const [name, coords] of Object.entries(HOSPITAL_COORDS)) {
      if (hospital.name?.toUpperCase().includes(name.toUpperCase()) ||
          name.toUpperCase().includes(hospital.name?.toUpperCase())) {
        return coords;
      }
    }
    // Default to Hyderabad center with slight random offset
    return {
      lat: 17.3850 + (Math.random() - 0.5) * 0.05,
      lng: 78.4867 + (Math.random() - 0.5) * 0.05,
    };
  };

  const initMap = () => {
    if (!mapRef.current || !window.L) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const L = window.L;

    // Create map centered on Hyderabad
    const map = L.map(mapRef.current).setView([17.3850, 78.4867], 13);
    mapInstanceRef.current = map;

    // OpenStreetMap tiles — completely free
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Custom hospital marker icon
    const hospitalIcon = L.divIcon({
      className: '',
      html: `<div style="
        background: #0d1526;
        border: 2px solid #00d4ff;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 0 12px rgba(0,212,255,0.4);
      ">🏥</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Clear old markers
    markersRef.current = [];

    // Add markers for each hospital
    hospitals.forEach(h => {
      const coords = getCoords(h);
      const marker = L.marker([coords.lat, coords.lng], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:Arial,sans-serif;min-width:200px;">
            <div style="font-weight:bold;font-size:14px;margin-bottom:6px;">🏥 ${h.name}</div>
            <div style="color:#555;font-size:12px;">📍 ${h.address || ''}, ${h.city}</div>
            <div style="color:#555;font-size:12px;margin-top:4px;">📧 ${h.contact_email || ''}</div>
            ${h.contact_phone ? `<div style="color:#555;font-size:12px;">📞 ${h.contact_phone}</div>` : ''}
            <div style="margin-top:8px;">
              <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11px;">✓ Verified</span>
            </div>
          </div>
        `);

      markersRef.current.push({ marker, hospital: h, coords });
    });

    // Draw route line between hospitals if 2+
    if (hospitals.length >= 2) {
      const coordsList = hospitals.map(h => getCoords(h));
      const latLngs = coordsList.map(c => [c.lat, c.lng]);

      L.polyline(latLngs, {
        color: '#00d4ff',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(map);

      // Fit map to show all markers
      const group = L.featureGroup(markersRef.current.map(m => m.marker));
      map.fitBounds(group.getBounds().pad(0.2));
    }
  };

  const focusHospital = (hospital) => {
    setSelected(hospital);
    if (!mapInstanceRef.current || !window.L) return;

    const coords = getCoords(hospital);
    mapInstanceRef.current.setView([coords.lat, coords.lng], 16, { animate: true });

    // Open popup for this marker
    const markerData = markersRef.current.find(m => m.hospital.id === hospital.id);
    if (markerData) markerData.marker.openPopup();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-synapse-text tracking-tight">Hospital Map</h1>
        <p className="text-synapse-muted text-sm mt-1">View verified hospitals and delivery routes across Hyderabad</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Hospital list */}
        <div className="space-y-3">
          <div className="text-xs font-mono text-synapse-muted uppercase tracking-widest mb-2">
            Verified Hospitals ({hospitals.length})
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-synapse-surface border border-synapse-border animate-pulse" />
              ))}
            </div>
          ) : hospitals.map(h => (
            <div
              key={h.id}
              onClick={() => focusHospital(h)}
              className={`bg-synapse-surface border rounded-xl p-4 cursor-pointer transition-all hover:border-synapse-accent/50 ${
                selected?.id === h.id ? 'border-synapse-accent/60 bg-synapse-accent/5' : 'border-synapse-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-synapse-accent/10 border border-synapse-accent/30 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-synapse-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-medium text-synapse-text truncate">{h.name}</div>
                    <span className="shrink-0 flex items-center gap-0.5 text-xs text-green-400">
                      <CheckCircle size={10} /> Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-synapse-muted">
                    <MapPin size={10} /> {h.address}, {h.city}
                  </div>
                  {h.contact_phone && (
                    <div className="flex items-center gap-1 text-xs text-synapse-muted mt-0.5">
                      <Phone size={10} /> {h.contact_phone}
                    </div>
                  )}
                </div>
              </div>
              {selected?.id === h.id && (
                <div className="mt-2 pt-2 border-t border-synapse-border">
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(h.name + ' ' + h.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-synapse-accent hover:underline"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              )}
            </div>
          ))}

          {hospitals.length === 0 && !loading && (
            <div className="text-center py-8 text-synapse-muted text-sm">
              No verified hospitals yet
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div
            ref={mapRef}
            className="w-full rounded-xl overflow-hidden border border-synapse-border"
            style={{ height: '500px', zIndex: 0 }}
          />
          <div className="flex items-center gap-4 mt-3 text-xs text-synapse-muted">
            <span className="flex items-center gap-1">
              <span style={{ display:'inline-block', width:20, height:3, background:'#00d4ff', borderTop:'2px dashed #00d4ff' }} />
              Transfer Route
            </span>
            <span className="flex items-center gap-1">🏥 Hospital Location</span>
            <span>Map: © OpenStreetMap (Free)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
