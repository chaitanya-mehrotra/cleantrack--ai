import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Trash2, Map, PlusCircle, LayoutDashboard, Shield, Wrench,
  Globe, LogIn, LogOut, Database, User
} from 'lucide-react';

interface NavbarProps {
  onOpenMigration: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMigration }) => {
  const { user, logout, isAdmin, isWorker } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const [legacyCount, setLegacyCount] = useState<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cleantrack_reports');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLegacyCount(parsed.length);
      }
    } catch {
      // ignore
    }
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#0a0e1a]/85 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:scale-105 transition">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-display text-lg font-bold tracking-tight text-white">
              <span>CleanTrack</span>
              <span className="text-indigo-400 font-extrabold">AI</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-1.5 py-0.2 rounded border border-indigo-500/30">
                2.0
              </span>
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              isActive('/')
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.home}
          </Link>

          <Link
            to="/report"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isActive('/report')
                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {t.report}
          </Link>

          <Link
            to="/map"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isActive('/map')
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            {t.map}
          </Link>

          {user && (
            <Link
              to="/my-reports"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                isActive('/my-reports')
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.myReports}
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                isActive('/admin')
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              {t.adminPortal}
            </Link>
          )}

          {isWorker && (
            <Link
              to="/worker"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                isActive('/worker')
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              {t.workerPortal}
            </Link>
          )}
        </nav>

        {/* Action Controls & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Legacy Migration Pill Button */}
          {legacyCount > 0 && (
            <button
              onClick={onOpenMigration}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition"
              title="Migrate v1.0 local browser reports into CleanTrack 2.0"
            >
              <Database className="w-3 h-3" />
              <span>Import {legacyCount} v1.0</span>
            </button>
          )}

          {/* Language Selector */}
          <div className="relative flex items-center bg-slate-900 border border-white/10 rounded-xl px-2 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-indigo-400 mr-1.5 flex-shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-medium"
            >
              <option value="en" className="bg-slate-900 text-white">English</option>
              <option value="hi" className="bg-slate-900 text-white">हिंदी (Hindi)</option>
              <option value="hinglish" className="bg-slate-900 text-white">Hinglish</option>
            </select>
          </div>

          {/* Auth Controls */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{user.display_name}</span>
                <span className="text-[10px] font-mono text-indigo-400 capitalize">{user.role}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700/80 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.login}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
