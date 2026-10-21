import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  Circle,
  CircleMarker
} from 'react-leaflet';
import L from 'leaflet';
import { Complaint, HotspotCluster } from '../types';
import { detectCurrentLocation } from '../services/geo';
import {
  Eye, MapPin, Crosshair
} from 'lucide-react';

// Fix Leaflet default icon path issues in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createSvgIcon = (color: string, label: string = '', isResolved: boolean = false) => {
  const innerSymbol = isResolved
    ? `<path d="M9 12l2 2 4-4" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="12" cy="12" r="4" fill="white" />`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 24 30">
      <defs>
        <filter id="shadow-${label}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="black" flood-opacity="0.6"/>
        </filter>
      </defs>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 18 12 18s12-9.5 12-18c0-6.63-5.37-12-12-12z"
            fill="${color}" filter="url(#shadow-${label})" stroke="#ffffff" stroke-width="1.5"/>
      ${innerSymbol}
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-map-pin',
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
};

const getMarkerIcon = (priority: string, status: string) => {
  if (status === 'Resolved') {
    return createSvgIcon('#10b981', 'R', true);
  }
  switch (priority) {
    case 'High':   return createSvgIcon('#ef4444', 'H');
    case 'Medium': return createSvgIcon('#f59e0b', 'M');
    default:       return createSvgIcon('#3b82f6', 'L');
  }
};

const pinDropIcon = createSvgIcon('#818cf8', 'P');

export const CIVIC_LANDMARKS = [
  { name: 'Connaught Place (CP)', lat: 28.6325, lng: 77.2185 },
  { name: 'India Gate / Central Vista', lat: 28.6129, lng: 77.2295 },
  { name: 'Lajpat Nagar Market (South)', lat: 28.5700, lng: 77.2400 },
  { name: 'Karol Bagh Market (Central)', lat: 28.6530, lng: 77.1890 },
  { name: 'Chandni Chowk / Old Delhi', lat: 28.6560, lng: 77.2300 },
  { name: 'Dwarka Sector 10 (West)', lat: 28.5820, lng: 77.0500 },
  { name: 'Rohini Sector 14 (North)', lat: 28.7150, lng: 77.1200 },
  { name: 'Laxmi Nagar (East Delhi)', lat: 28.6310, lng: 77.2770 },
  { name: 'Saket City Centre (South)', lat: 28.5240, lng: 77.2150 }
];

interface MapProps {
  complaints?: Complaint[];
  selectedLocation?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  onComplaintSelect?: (complaint: Complaint) => void;
  showHeatmap?: boolean;
  hotspots?: HotspotCluster[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  interactive?: boolean;
  showLandmarks?: boolean;
  showTileSwitcher?: boolean;
  showGpsButton?: boolean;
}

const LocationPicker: React.FC<{ onSelect?: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      if (onSelect) onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapResizer: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const t3 = setTimeout(() => map.invalidateSize(), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map]);
  return null;
};

const SmoothCameraController: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  const prevCenter = useRef<[number, number]>(center);
  const prevZoom = useRef<number | undefined>(zoom);

  useEffect(() => {
    const [lat, lng] = center;
    const [pLat, pLng] = prevCenter.current;
    const dist = Math.abs(lat - pLat) + Math.abs(lng - pLng);
    const zoomChanged = zoom !== prevZoom.current;
    if (dist > 0.0001 || zoomChanged) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2, easeLinearity: 0.25 });
      prevCenter.current = center;
      prevZoom.current = zoom;
    }
  }, [center, zoom, map]);

  return null;
};

const TILE_URLS = {
  dark: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

export const MapComponent: React.FC<MapProps> = ({
  complaints = [],
  selectedLocation,
  onLocationSelect,
  onComplaintSelect,
  showHeatmap = false,
  hotspots = [],
  center = [28.6325, 77.2185],
  zoom = 13,
  height = '500px',
  interactive = true,
  showLandmarks = false,
  showTileSwitcher = true,
  showGpsButton = true,
}) => {
  const [tileTheme, setTileTheme] = useState<'dark' | 'satellite'>('dark');
  const [gpsLocating, setGpsLocating] = useState(false);
  const [userGps, setUserGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const markerRef = useRef<any>(null);

  const handleMapLocateMe = async () => {
    setGpsLocating(true);
    setGpsError(null);
    try {
      const loc = await detectCurrentLocation();
      setUserGps({ lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy || 100 });
      if (onLocationSelect) onLocationSelect(loc.lat, loc.lng);
    } catch (err: any) {
      setGpsError('Could not detect location. Please allow location access and try again.');
    } finally {
      setGpsLocating(false);
    }
  };

  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null && onLocationSelect) {
      const latlng = marker.getLatLng();
      onLocationSelect(latlng.lat, latlng.lng);
    }
  };

  const currentTile = TILE_URLS[tileTheme];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-0" style={{ height }}>
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 pointer-events-auto">
        {showGpsButton && interactive && (
          <button
            type="button"
            onClick={handleMapLocateMe}
            disabled={gpsLocating}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-white/10 shadow-lg backdrop-blur-md transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-60"
            title="Detect my GPS location"
          >
            <Crosshair className={`w-4 h-4 ${gpsLocating ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">{gpsLocating ? 'Locating...' : 'GPS Me'}</span>
          </button>
        )}
        {showTileSwitcher && (
          <div className="flex bg-slate-900/90 border border-white/10 rounded-xl p-1 shadow-lg backdrop-blur-md text-[11px] font-semibold">
            {(['dark', 'satellite'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setTileTheme(theme)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  tileTheme === theme ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {theme === 'dark' ? 'Dark' : 'Satellite'}
              </button>
            ))}
          </div>
        )}
      </div>

      {showLandmarks && onLocationSelect && (
        <div className="absolute top-3 left-3 z-[1000] pointer-events-auto max-w-[200px] sm:max-w-xs">
          <select
            onChange={(e) => {
              const lm = CIVIC_LANDMARKS.find(l => l.name === e.target.value);
              if (lm) onLocationSelect(lm.lat, lm.lng);
            }}
            defaultValue=""
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none backdrop-blur-md shadow-lg cursor-pointer"
          >
            <option value="" disabled>?? Jump to Delhi Landmark...</option>
            {CIVIC_LANDMARKS.map((lm) => (
              <option key={lm.name} value={lm.name}>{lm.name}</option>
            ))}
          </select>
        </div>
      )}

      {gpsError && (
        <div className="absolute top-14 right-3 z-[1000] max-w-[260px] bg-red-950/90 border border-red-500/40 rounded-xl px-3 py-2 text-[11px] text-red-300 backdrop-blur-md shadow-lg pointer-events-auto flex items-start gap-2">
          <span className="text-red-400 flex-shrink-0 mt-0.5">?</span>
          <span>{gpsError}</span>
          <button onClick={() => setGpsError(null)} className="ml-auto text-slate-400 hover:text-white flex-shrink-0">?</button>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={interactive}
        className={tileTheme === 'dark' ? 'dark-map-tiles' : ''}
      >
        <MapResizer />
        <SmoothCameraController center={center} zoom={zoom} />
        {interactive && <LocationPicker onSelect={onLocationSelect} />}

        <TileLayer
          key={tileTheme}
          attribution={currentTile.attribution}
          url={currentTile.url}
          maxZoom={19}
        />

        {userGps && (
          <>
            <Circle
              center={[userGps.lat, userGps.lng]}
              radius={Math.max(40, userGps.accuracy)}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1.5 }}
            />
            <CircleMarker
              center={[userGps.lat, userGps.lng]}
              radius={8}
              pathOptions={{ color: '#ffffff', fillColor: '#2563eb', fillOpacity: 1, weight: 2.5 }}
            >
              <Popup>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ color: '#60a5fa' }}>?? Your GPS Location</span><br />
                  Accuracy: �{Math.round(userGps.accuracy)}m<br />
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>{userGps.lat.toFixed(5)}, {userGps.lng.toFixed(5)}</span>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={pinDropIcon}
            draggable={interactive}
            eventHandlers={{ dragend: handleMarkerDragEnd }}
            ref={markerRef}
          >
            <Popup>
              <div style={{ fontSize: '11px', fontWeight: 600 }}>
                <span style={{ color: '#818cf8' }}>?? Waste Report Location</span><br />
                {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}<br />
                <span style={{ color: '#94a3b8', fontSize: '10px' }}>?? Drag pin to adjust</span>
              </div>
            </Popup>
          </Marker>
        )}

        {showHeatmap && hotspots.map((h, idx) => {
          const intensity = Math.min(1.0, h.count / 10);
          return (
            <Circle
              key={`hotspot-${idx}`}
              center={[h.latitude, h.longitude]}
              radius={350 + h.count * 60}
              pathOptions={{
                color: h.high_priority_count > 0 ? '#ef4444' : '#f59e0b',
                fillColor: h.high_priority_count > 0 ? '#ef4444' : '#f59e0b',
                fillOpacity: 0.35 * intensity,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <p style={{ fontWeight: 700, color: '#f87171' }}>?? Garbage Hotspot</p>
                  <p>Total: <strong>{h.count}</strong></p>
                  <p style={{ color: '#fbbf24' }}>High priority: <strong>{h.high_priority_count}</strong></p>
                  <p style={{ color: '#34d399' }}>Resolved: <strong>{h.resolved_count}</strong></p>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {!showHeatmap && complaints
          .filter((c) => c.latitude && c.longitude)
          .map((c) => (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={getMarkerIcon(c.priority, c.status)}
              eventHandlers={{ click: () => onComplaintSelect && onComplaintSelect(c) }}
            >
              <Popup>
                <div style={{ padding: '4px', maxWidth: '240px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#818cf8' }}>{c.public_reference}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: c.priority === 'High' ? 'rgba(239,68,68,0.2)' : c.priority === 'Medium' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)', color: c.priority === 'High' ? '#fca5a5' : c.priority === 'Medium' ? '#fcd34d' : '#93c5fd' }}>
                      {c.priority}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', margin: '0 0 6px' }}>{c.description}</p>
                  <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <MapPin size={11} /> <span>{c.location_description}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: c.status === 'Resolved' ? 'rgba(16,185,129,0.2)' : c.status === 'In Progress' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)', color: c.status === 'Resolved' ? '#6ee7b7' : c.status === 'In Progress' ? '#fcd34d' : '#a5b4fc' }}>
                      {c.status}
                    </span>
                    {onComplaintSelect && (
                      <button
                        type="button"
                        onClick={() => onComplaintSelect(c)}
                        style={{ fontSize: '11px', color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                      >
                        <Eye size={11} /> View
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-xl text-xs space-y-1.5 pointer-events-auto">
        <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Map Legend</div>
        {showHeatmap ? (
          <>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span><span className="text-slate-300 text-[11px]">High Priority Hotspot</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="text-slate-300 text-[11px]">Normal Hotspot</span></div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span><span className="text-slate-300 text-[11px]">High Priority</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="text-slate-300 text-[11px]">Medium Priority</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-slate-300 text-[11px]">Low Priority</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-slate-300 text-[11px]">Resolved</span></div>
          </>
        )}
        <div className="flex items-center gap-2 pt-0.5 border-t border-white/5">
          <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white"></span>
          <span className="text-slate-300 text-[11px]">Your GPS Location</span>
        </div>
      </div>
    </div>
  );
};
