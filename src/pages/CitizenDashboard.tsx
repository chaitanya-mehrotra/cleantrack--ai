import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Complaint } from '../types';
import { useAuth } from '../context/AuthContext';
import { ComplaintModal } from '../components/ComplaintModal';
import {
  FileText, Clock, CheckCircle2, AlertCircle, PlusCircle, Bell,
  ChevronRight, MapPin, ThumbsUp
} from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [myReports, notifs] = await Promise.all([
        api.getComplaints({ my_reports_only: true }),
        user ? api.getNotifications() : Promise.resolve([]),
      ]);
      setComplaints(myReports);
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed loading citizen reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const activeCount = complaints.length - resolvedCount;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">Citizen Portal Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back, <strong className="text-slate-200">{user?.display_name || 'Resident Citizen'}</strong>. Track your submitted garbage reports and verify resolutions.
          </p>
        </div>

        <Link
          to="/report"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition flex items-center gap-2 self-start"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit New Complaint</span>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Total Complaints</div>
          <div className="font-display text-3xl font-extrabold text-indigo-400">{complaints.length}</div>
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress / Pending</div>
          <div className="font-display text-3xl font-extrabold text-amber-400">{activeCount}</div>
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Resolved</div>
          <div className="font-display text-3xl font-extrabold text-emerald-400">{resolvedCount}</div>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">My Submitted Reports</h2>

        {complaints.length === 0 ? (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-500 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">No Complaints Submitted Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Spot garbage or overflowing bins in your neighborhood? Submit your first report to alert the municipal sanitation team.
            </p>
            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] mt-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Waste</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComplaint(c)}
                className="bg-slate-900 border border-white/10 hover:border-indigo-500/50 rounded-2xl p-5 space-y-3 cursor-pointer transition shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-400">{c.public_reference}</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        c.priority === 'High'
                          ? 'bg-red-500/20 text-red-400'
                          : c.priority === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {c.priority} Priority
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">{c.description}</p>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{c.location_description}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      c.status === 'Resolved'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : c.status === 'Cleanup Review'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {c.status}
                  </span>

                  <span className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold text-[11px]">
                    <span>View Timeline</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications Drawer */}
      {notifications.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <span>Recent Status Notifications</span>
          </div>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 text-xs flex justify-between items-start">
                <div>
                  <div className="font-bold text-slate-200">{n.title}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{n.message}</div>
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      <ComplaintModal
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdated={() => {
          loadData();
          setSelectedComplaint(null);
        }}
        currentUser={user}
      />
    </div>
  );
};
