import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Complaint, ServiceZone, HotspotCluster } from '../types';
import { MapComponent, CIVIC_LANDMARKS } from '../components/MapComponent';
import { ComplaintModal } from '../components/ComplaintModal';
import { useAuth } from '../context/AuthContext';
import {
  Filter, Layers, Flame, Search, MapPin, AlertCircle, CheckCircle,
  Clock, ListFilter, LayoutGrid, Crosshair, Loader2, Navigation,
  RotateCcw
} from 'lucide-react';

export const ExploreMap: React.FC = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<ServiceZone[]>([]);
  const [hotspots, setHotspots] = useState<HotspotCluster[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Map Navigation State
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6325, 77.2185]); // Connaught Place default
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'split'>('map');
  const [isLoading, setIsLoading] = useState(true);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.issue_category = categoryFilter;
      if (wardFilter !== 'all') params.service_zone_id = Number(wardFilter);
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [compRes, wardRes, hotRes] = await Promise.allSettled([
        api.getComplaints(params),
        api.getWards(),
        api.getHotspots(0.4),
      ]);

      const data = compRes.status === 'fulfilled' ? compRes.value : [];
      const wardsData = wardRes.status === 'fulfilled' ? wardRes.value : [];
      const hotspotData = hotRes.status === 'fulfilled' ? hotRes.value : [];

      setComplaints(data);
      setWards(wardsData);
      setHotspots(hotspotData);

      // If a specific ward was selected and has complaints, pan to its first complaint
      if (wardFilter !== 'all' && data.length > 0) {
        setMapCenter([data[0].latitude, data[0].longitude]);
        setMapZoom(14);
      }
    } catch (err) {
      console.error('Failed loading map complaints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [priorityFilter, statusFilter, categoryFilter, wardFilter, searchQuery]);

  // GPS Locate near user
  const handleLocateNearUser = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Geolocation is not supported in this browser.');
      return;
    }
    setGpsLoading(true);
    setGpsStatusMsg('Acquiring device GPS coordinates...');

    const onSuccess = (pos: GeolocationPosition) => {
      setGpsLoading(false);
      const { latitude, longitude } = pos.coords;
      setMapCenter([latitude, longitude]);
      setMapZoom(14);
      setGpsStatusMsg(`Centered on your GPS location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      setTimeout(() => setGpsStatusMsg(null), 5000);
    };

    const onError = (err: GeolocationPositionError) => {
      // Fallback to standard network accuracy
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        () => {
          setGpsLoading(false);
          setGpsStatusMsg('Unable to detect GPS. Click a landmark or search your area.');
          setTimeout(() => setGpsStatusMsg(null), 5000);
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 6000,
    });
  };

  // Jump to specific landmark preset
  const handleJumpLandmark = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(14);
  };

  // Select complaint and center map on it
  const handleSelectComplaintFromList = (c: Complaint) => {
    setSelectedComplaint(c);
    setMapCenter([c.latitude, c.longitude]);
    setMapZoom(15);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header & Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <span>Live Interactive Garbage Map</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2.5 py-1 rounded-full border border-indigo-500/30">
              {complaints.length} Points Visible
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Geospatial civic intelligence platform with GPS tracking, dark civic tile layers &amp; hotspot heatmaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* GPS Locate Me Button */}
          <button
            type="button"
            onClick={handleLocateNearUser}
            disabled={gpsLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] transition disabled:opacity-50"
            title="Locate my position on map"
          >
            {gpsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5" />
            )}
            <span>{gpsLoading ? 'Locating...' : 'Near Me (GPS)'}</span>
          </button>

          {/* Reset View Button */}
          <button
            type="button"
            onClick={() => {
              setMapCenter([28.6325, 77.2185]);
              setMapZoom(12);
              setPriorityFilter('all');
              setStatusFilter('all');
              setWardFilter('all');
              setSearchQuery('');
            }}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 rounded-xl transition"
            title="Reset map view to Delhi central"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Heatmap Toggle */}
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              showHeatmap
                ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-white/10'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{showHeatmap ? 'Heatmap Active' : 'Hotspot Heatmap'}</span>
          </button>

          {/* View Split Toggle */}
          <div className="flex bg-slate-900 border border-white/10 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                viewMode === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Split View
            </button>
          </div>
        </div>
      </div>

      {/* GPS Status feedback toast */}
      {gpsStatusMsg && (
        <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-indigo-400" />
            <span>{gpsStatusMsg}</span>
          </div>
          <button onClick={() => setGpsStatusMsg(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar & Quick Landmark Jump */}
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, problem, or reference ID..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
          >
            <option value="all">Priority: All</option>
            <option value="High">🔴 High Priority</option>
            <option value="Medium">🟡 Medium Priority</option>
            <option value="Low">🔵 Low Priority</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="Submitted">Submitted</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Cleanup Review">Cleanup Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Reopened">Reopened</option>
          </select>

          {/* Ward Filter */}
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
          >
            <option value="all">All Wards / Zones</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Landmark Jump Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5 text-xs text-slate-400">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-400" />
            <span>Jump Area:</span>
          </span>
          {CIVIC_LANDMARKS.slice(0, 7).map((lm) => (
            <button
              key={lm.name}
              type="button"
              onClick={() => handleJumpLandmark(lm.lat, lm.lng)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-950/30 text-slate-300 text-[11px] transition"
            >
              {lm.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map & Split View Container */}
      <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        <div className={viewMode === 'split' ? 'lg:col-span-8' : 'w-full'}>
          <MapComponent
            complaints={complaints}
            hotspots={hotspots}
            showHeatmap={showHeatmap}
            onComplaintSelect={(c) => setSelectedComplaint(c)}
            height={viewMode === 'split' ? '650px' : '650px'}
            center={mapCenter}
            zoom={mapZoom}
            showTileSwitcher={true}
            showGpsButton={true}
          />
        </div>

        {viewMode === 'split' && (
          <div className="lg:col-span-4 space-y-3 max-h-[650px] overflow-y-auto pr-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
              <span>Matching Complaints</span>
              <span>{complaints.length} Records</span>
            </div>

            {complaints.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs bg-slate-900/50 rounded-2xl border border-white/5 p-4">
                No complaints match the selected filter combination.
              </div>
            ) : (
              complaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectComplaintFromList(c)}
                  className={`bg-slate-900/80 border rounded-xl p-3.5 space-y-2 cursor-pointer transition ${
                    selectedComplaint?.id === c.id
                      ? 'border-indigo-500 bg-indigo-950/20'
                      : 'border-white/10 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-400">{c.public_reference}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.priority === 'High'
                          ? 'bg-red-500/20 text-red-400'
                          : c.priority === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {c.priority}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">{c.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                    <span className="truncate max-w-[150px]">{c.location_description}</span>
                    <span
                      className={`font-semibold ${
                        c.status === 'Resolved' ? 'text-emerald-400' : 'text-indigo-300'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Complaint Detail Modal */}
      <ComplaintModal
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdated={() => {
          fetchComplaints();
          setSelectedComplaint(null);
        }}
        currentUser={user}
      />
    </div>
  );
};
