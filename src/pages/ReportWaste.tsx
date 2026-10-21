import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { AIClassifyResponse } from '../types';
import { MapComponent, CIVIC_LANDMARKS } from '../components/MapComponent';
import { AIPreviewPanel } from '../components/AIPreviewPanel';
import {
  Camera, MapPin, Mic, MicOff, AlertTriangle, CheckCircle, Sparkles,
  ArrowRight, Upload, X, HelpCircle, Navigation, Search, Loader2,
  CheckCircle2, Crosshair, Compass
} from 'lucide-react';

export const ReportWaste: React.FC = () => {
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  // Default coordinate: Delhi center
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 28.6325,
    lng: 77.2185,
  });
  const [locationName, setLocationName] = useState('Inner Circle, Connaught Place, New Delhi');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchLandmark, setSearchLandmark] = useState('');
  const [isSearchingLandmark, setIsSearchingLandmark] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<{
    type: 'info' | 'success' | 'error' | 'loading';
    message: string;
  } | null>(null);

  // AI Classification state
  const [aiAnalysis, setAiAnalysis] = useState<AIClassifyResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);

  // Speech to text state
  const [isListening, setIsListening] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState<any | null>(null);

  // Reverse geocoding: convert (lat, lng) to civic address
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: { 'User-Agent': 'CleanTrackAI/2.0' },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addr = data.address || {};
          const parts = [
            addr.amenity || addr.shop || addr.building,
            addr.road || addr.street,
            addr.neighbourhood || addr.suburb || addr.residential,
            addr.city || addr.town || addr.state_district,
            addr.postcode,
          ].filter(Boolean);
          const formatted =
            parts.length > 0
              ? parts.join(', ')
              : data.display_name.split(',').slice(0, 3).join(', ');
          setLocationName(formatted);
          return formatted;
        }
      }
      setLocationName(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch {
      setLocationName(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Forward geocoding: search landmark or locality in Delhi NCR
  const handleSearchLandmark = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchLandmark.trim()) return;

    setIsSearchingLandmark(true);
    setGpsNotice({ type: 'loading', message: `Searching landmark "${searchLandmark}"...` });

    try {
      const query = encodeURIComponent(`${searchLandmark.trim()} Delhi NCR`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        {
          headers: { 'User-Agent': 'CleanTrackAI/2.0' },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setCoords({ lat, lng });
          const parts = data[0].display_name.split(',').slice(0, 3).join(', ');
          setLocationName(parts || searchLandmark);
          setGpsNotice({
            type: 'success',
            message: `Found: ${data[0].display_name.split(',')[0]} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          });
          setSearchLandmark('');
          return;
        }
      }
      setGpsNotice({
        type: 'error',
        message: `Landmark "${searchLandmark}" not found. Try another landmark or drop a pin directly on the map.`,
      });
    } catch {
      setGpsNotice({
        type: 'error',
        message: 'Landmark search request failed. Please click on the map to set location.',
      });
    } finally {
      setIsSearchingLandmark(false);
    }
  };

  // Robust GPS Geolocation button with automatic fallback
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsNotice({
        type: 'error',
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setGpsNotice({
      type: 'loading',
      message: 'Locking onto your device GPS satellite coordinates...',
    });

    const onGpsSuccess = async (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      setGpsNotice({
        type: 'success',
        message: `GPS coordinates acquired (accuracy ±${Math.round(accuracy)}m). Identifying civic address...`,
      });
      const addr = await reverseGeocode(latitude, longitude);
      if (addr) {
        setGpsNotice({
          type: 'success',
          message: `Location locked: ${addr} (accuracy ±${Math.round(accuracy)}m)`,
        });
      }
    };

    const onGpsError = (err: GeolocationPositionError) => {
      // If high accuracy timed out (common on desktop/laptops), retry with standard accuracy
      if (err.code === err.TIMEOUT) {
        setGpsNotice({
          type: 'loading',
          message: 'High-precision GPS timed out. Trying standard network location...',
        });
        navigator.geolocation.getCurrentPosition(
          onGpsSuccess,
          () => {
            setGpsNotice({
              type: 'error',
              message:
                'GPS timed out. You can click anywhere on the map or pick a Delhi landmark below.',
            });
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      } else if (err.code === err.PERMISSION_DENIED) {
        setGpsNotice({
          type: 'error',
          message:
            'Location access was denied in your browser settings. You can click on the map to drop a pin.',
        });
      } else {
        setGpsNotice({
          type: 'error',
          message: `GPS unavailable (${err.message}). Click on the map or select a landmark.`,
        });
      }
    };

    navigator.geolocation.getCurrentPosition(onGpsSuccess, onGpsError, {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 15000,
    });
  };

  // Image Upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB.');
      return;
    }

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Speech Recognition (Multilingual speech-to-text)
  const toggleSpeechRecognition = () => {
    const windowWithSpeech = window as any;
    const SpeechRecognition =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech-to-text is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English / Hindi mix
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  // Final submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 4) {
      alert('Please describe the waste problem in at least 4 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        description,
        latitude: coords.lat,
        longitude: coords.lng,
        location_description: locationName,
        issue_category: aiAnalysis?.issue_category,
        waste_categories: aiAnalysis?.waste_categories,
        priority: aiAnalysis?.suggested_priority,
        priority_reason: aiAnalysis?.priority_reason,
        classification_source: imageBase64 ? 'AI_MULTIMODAL' : 'AI_TEXT_ONLY',
        image_base64: imageBase64 || undefined,
      };

      const res = await api.submitComplaint(payload);
      setSuccessReport(res);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successReport) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
          <CheckCircle className="w-8 h-8" />
        </div>

        <h2 className="font-display text-2xl font-extrabold text-white">
          Complaint Successfully Submitted!
        </h2>

        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 text-left space-y-3">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Reference ID</span>
            <span className="font-mono text-base font-bold text-indigo-400">{successReport.public_reference}</span>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Classified Issue:</span>
              <span className="font-bold text-slate-200">{successReport.issue_category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Priority:</span>
              <span className="font-bold text-red-400">{successReport.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-indigo-300 font-bold">{successReport.status}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              setSuccessReport(null);
              setDescription('');
              setImageBase64(null);
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Submit Another Complaint
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2"
          >
            <span>View on Live Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-white">Report a Waste Problem</h1>
        <p className="text-sm text-slate-400 mt-1">
          Describe the garbage issue or take a photograph. CleanTrack AI diagnostic models will categorize it, assign verified priority, and alert municipal ward sanitation teams.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Duplicate Complaint Alert Banner */}
          {duplicateWarning.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Possible Duplicate Notice ({duplicateWarning.length} existing nearby report detected)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                A report for <strong>{duplicateWarning[0].issue_category}</strong> was already filed within {duplicateWarning[0].distance_meters}m ({duplicateWarning[0].public_reference}).
                Instead of submitting a duplicate, you can upvote the existing report to boost municipal priority!
              </p>
            </div>
          )}

          {/* Description & Voice Input */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>1. Problem Description</span>
              </label>

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30'
                }`}
                title="Voice input in English or Hindi"
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 'Massive plastic garbage and rotten food overflowing near the park boundary. Drains are choked and bad smell is spreading...'"
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 transition resize-none"
            />

            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>Mention overflowing bins, burning, blocked drains, or e-waste</span>
              <span>{description.length} characters</span>
            </div>
          </div>

          {/* Image Upload Zone */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Upload Photo Evidence (Optional)
            </label>

            {imageBase64 ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                <img src={imageBase64} alt="Uploaded waste preview" className="w-full h-56 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageBase64(null);
                    setImageFileName(null);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 rounded-md text-[11px] font-mono text-slate-300 truncate max-w-xs">
                  {imageFileName}
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/15 hover:border-indigo-500 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-950/40">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-200">Click or tap to capture / upload photograph</div>
                <div className="text-[11px] text-slate-500">Supports JPG, PNG up to 10MB</div>
              </label>
            )}
          </div>

          {/* Location & Interactive Pin Drop */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>3. Exact Civic Location</span>
              </label>

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] transition self-start sm:self-auto"
                title="Detect current device location using GPS"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Use My GPS</span>
              </button>
            </div>

            {/* GPS Status / Feedback Notification Banner */}
            {gpsNotice && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition animate-fadeIn ${
                  gpsNotice.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : gpsNotice.type === 'loading'
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}
              >
                {gpsNotice.type === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400 flex-shrink-0" />
                ) : gpsNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <span className="flex-1">{gpsNotice.message}</span>
                <button
                  type="button"
                  onClick={() => setGpsNotice(null)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Forward Geocoding: Landmark Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchLandmark}
                  onChange={(e) => setSearchLandmark(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchLandmark();
                    }
                  }}
                  placeholder="Search landmark (e.g. AIIMS, Karol Bagh, Saket Metro)..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchLandmark()}
                disabled={isSearchingLandmark || !searchLandmark.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-white/10 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                {isSearchingLandmark ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>Find</span>
              </button>
            </div>

            {/* Quick Landmark Preset Pills */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400">Quick Landmark Presets:</div>
              <div className="flex flex-wrap gap-1.5">
                {CIVIC_LANDMARKS.slice(0, 6).map((lm) => (
                  <button
                    key={lm.name}
                    type="button"
                    onClick={() => {
                      setCoords({ lat: lm.lat, lng: lm.lng });
                      reverseGeocode(lm.lat, lm.lng);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-950/30 text-slate-300 transition"
                  >
                    {lm.name.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Address Input with Geocode Indicator */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Civic Address / Landmark Details:</span>
                {isGeocoding && (
                  <span className="text-indigo-400 flex items-center gap-1 font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin" /> Detecting civic address...
                  </span>
                )}
              </div>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Near Gate 2, Metro Station, Sector 4..."
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 transition font-medium"
              />
            </div>

            {/* Interactive Map with Draggable Pin */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Drag the purple pin or click map to set exact spot:</span>
                <span className="font-mono text-indigo-400 text-[10px]">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              </div>
              <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <MapComponent
                  center={[coords.lat, coords.lng]}
                  zoom={15}
                  height="280px"
                  selectedLocation={coords}
                  showTileSwitcher={true}
                  showGpsButton={true}
                  onLocationSelect={(lat, lng) => {
                    setCoords({ lat, lng });
                    reverseGeocode(lat, lng);
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || description.trim().length < 4}
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-[0_0_25px_rgba(99,102,241,0.4)] transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Submitting to Municipal Queue...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze &amp; Submit CleanTrack Complaint</span>
              </>
            )}
          </button>
        </form>

        {/* Right Preview Column */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          <AIPreviewPanel
            analysis={aiAnalysis}
            isLoading={isAnalyzing}
            textLength={description.length}
          />

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-3 text-xs text-slate-300">
            <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
              SWM 2016 Priority Guidelines
            </div>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <span><strong>High Priority:</strong> Waste burning, medical syringes, blocked drains, hospital vicinity.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span><strong>Medium Priority:</strong> Construction malba debris, overflowing community bins, e-waste.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <span><strong>Low Priority:</strong> Single scattered wrappers, dry leaves on pavement.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
