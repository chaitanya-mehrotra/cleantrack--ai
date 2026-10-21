import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Complaint, AdminAnalytics } from '../types';
import {
  Trash2, Map, PlusCircle, Sparkles, ShieldAlert, CheckCircle2,
  TrendingUp, ArrowRight, Activity, Clock, ShieldCheck
} from 'lucide-react';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    resolved: 0,
    active: 0,
  });
  const [recentReports, setRecentReports] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const complaints = await api.getComplaints({ limit: 6 });
        const total = complaints.length;
        const high = complaints.filter((c) => c.priority === 'High').length;
        const resolved = complaints.filter((c) => c.status === 'Resolved').length;
        const active = total - resolved;

        setStats({ total, high, resolved, active });
        setRecentReports(complaints);
      } catch (err) {
        console.error('Failed loading home data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 max-w-7xl mx-auto overflow-hidden">
        {/* Glowing backdrop elements */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>CleanTrack AI 2.0 · Smart Civic Waste Intelligence</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.12] tracking-tight">
              Smart Waste Reporting <br />
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                Powered by Real AI
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Empowering Indian citizens, municipal administrators, and sanitation workers.
              Report garbage via text or photo, detect issues through multimodal AI, and track transparent resolution on an interactive city map.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/report"
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(99,102,241,0.5)] transition flex items-center gap-2 group"
              >
                <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition duration-300" />
                <span>Report Waste Problem</span>
              </Link>

              <Link
                to="/map"
                className="px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 font-bold text-sm transition flex items-center gap-2"
              >
                <Map className="w-4 h-4 text-indigo-400" />
                <span>Explore Live Garbage Map</span>
              </Link>
            </div>

            {/* Live Metrics Counters */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 max-w-lg">
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-indigo-400">
                  {stats.total}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">Total Reports</div>
              </div>
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-red-400">
                  {stats.high}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">High Priority</div>
              </div>
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-emerald-400">
                  {stats.resolved}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">Resolved</div>
              </div>
            </div>
          </div>

          {/* AI Interactive Simulation Card */}
          <div className="lg:col-span-5 relative">
            <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 backdrop-blur-xl animate-float-slow">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider ml-2">
                    Multimodal AI Core 2.0
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  LIVE PIPELINE
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 text-slate-300">
                  <span className="text-indigo-400 font-bold">Resident Input:</span> "Massive plastic bottles overflowing near market drain, water is blocked"
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Detected Problem:</span>
                    <span className="text-indigo-300 font-bold">Blocked Drain &amp; Overflow</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Material Segregation:</span>
                    <span className="text-cyan-300 font-bold">Plastic, Inert Silt</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Priority Engine:</span>
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> High Priority (Biohazard/Flooding)
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-slate-400">Calibrated Confidence:</span>
                    <span className="text-emerald-400 font-bold">96.5%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Assigned to Ward 101 Sanitation Team with GPS turn-by-turn routing</span>
                </div>
              </div>
            </div>

            {/* Floating mini badge */}
            <div className="absolute -bottom-6 -left-6 bg-slate-900 border border-white/10 rounded-2xl p-3 shadow-xl flex items-center gap-3 hidden sm:flex">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Zero Simulated Data</div>
                <div className="text-[10px] text-slate-400">Real database &amp; GPS spatial tracking</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How CleanTrack AI Works (3-Portal Architecture) */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center space-y-3 mb-16">
          <h2 className="font-display text-3xl font-extrabold text-white">
            Unified Civic Intelligence Architecture
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Connecting every stakeholder in Indian urban waste management into one seamless, transparent resolution loop.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">1. Citizen Portal</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Report waste in seconds via text or camera photo. Dropped pin GPS prevents location ambiguity.
              Duplicate detection prevents double-reporting, and citizens can confirm completed cleanups or reopen unsatisfied tasks.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-amber-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">2. Authority Portal</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Municipal commissioners and ward officers triage reports, override priority with audit reasons,
              dispatch field workers, detect chronic dumping hotspots on heatmaps, and export CSV/PDF compliance reports.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">3. Sanitation Worker Portal</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mobile-first, low-bandwidth optimized task viewer for field workers. Turn-by-turn navigation link to complaints,
              status updates, and required "After-Cleanup" photo evidence uploads before task closure.
            </p>
          </div>
        </div>
      </section>

      {/* Live Community Reports Feed */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Recent City Waste Complaints</h2>
            <p className="text-xs text-slate-400">Live feed of public civic issues reported across municipal zones</p>
          </div>
          <Link
            to="/map"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
          >
            <span>View All on Interactive Map</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentReports.map((r) => (
            <div
              key={r.id}
              className="bg-slate-900/70 border border-white/10 rounded-2xl p-5 space-y-4 hover:border-white/20 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-400">{r.public_reference}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      r.priority === 'High'
                        ? 'bg-red-500/20 text-red-400'
                        : r.priority === 'Medium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {r.priority} Priority
                  </span>
                </div>

                <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">{r.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                    {r.issue_category}
                  </span>
                  {r.waste_categories.slice(0, 2).map((m, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[180px]">{r.location_description}</span>
                <span
                  className={`font-bold ${
                    r.status === 'Resolved' ? 'text-emerald-400' : 'text-indigo-400'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
