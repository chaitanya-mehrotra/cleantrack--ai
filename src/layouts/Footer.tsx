import React from 'react';
import { Trash2, Shield, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#0a0e1a] text-slate-400 py-12 px-4 lg:px-8 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Trash2 className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-base text-white">CleanTrack AI 2.0</span>
          </div>
          <p className="text-slate-400 max-w-sm leading-relaxed text-[11px]">
            AI-powered smart waste intelligence platform connecting citizens, municipal sanitation workers,
            and administrative decision makers for cleaner, healthier Indian communities.
          </p>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-[11px]">
            <Shield className="w-3.5 h-3.5" /> Compliant with Solid Waste Management (SWM) Rules 2016
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 uppercase tracking-wider mb-3 text-[11px]">Civic Portals</h4>
          <ul className="space-y-2">
            <li><a href="/report" className="hover:text-indigo-400 transition">Citizen Report Portal</a></li>
            <li><a href="/map" className="hover:text-indigo-400 transition">Interactive City Map</a></li>
            <li><a href="/admin" className="hover:text-indigo-400 transition">Municipal Authority Portal</a></li>
            <li><a href="/worker" className="hover:text-indigo-400 transition">Sanitation Worker Field App</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 uppercase tracking-wider mb-3 text-[11px]">System Capabilities</h4>
          <ul className="space-y-2">
            <li>Multimodal AI Classification</li>
            <li>Collision-Resistant Reference IDs</li>
            <li>Geospatial Hotspot Analytics</li>
            <li>Before / After Visual Verification</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
        <div>&copy; 2026 CleanTrack AI. Open Municipal Intelligence Initiative.</div>
        <div className="flex items-center gap-1">
          Made for Clean Cities across India
        </div>
      </div>
    </footer>
  );
};
