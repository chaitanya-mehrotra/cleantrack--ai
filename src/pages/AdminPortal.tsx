import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AdminAnalytics, Complaint, AuditLogItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { ComplaintModal } from '../components/ComplaintModal';
import {
  Shield, AlertTriangle, CheckCircle2, Clock, Download, Users,
  BarChart3, Activity, ArrowUpRight, Search, FileSpreadsheet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

export const AdminPortal: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, complaintsData, workersData, auditData] = await Promise.all([
        api.getAdminAnalytics(),
        api.getComplaints({ limit: 100 }),
        api.getSanitationWorkers(),
        api.getAuditLogs(30),
      ]);
      setAnalytics(analyticsData);
      setComplaints(complaintsData);
      setWorkers(workersData);
      setAuditLogs(auditData);
    } catch (err) {
      console.error('Failed loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleExportCsv = () => {
    window.open('/api/admin/export-csv', '_blank');
  };

  const filteredComplaints = complaints.filter((c) => {
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        c.description.toLowerCase().includes(s) ||
        c.public_reference.toLowerCase().includes(s) ||
        c.location_description.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Admin Verification Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-3xl font-extrabold text-white">Municipal Authority Portal</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Shield className="w-3.5 h-3.5" />
              Verified Official Account
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Municipal Corporation of Delhi (MCD) · Sanitation Control Room &amp; Civic Command Centre
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 self-start"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Complaints</div>
            <div className="font-display text-3xl font-extrabold text-indigo-400">
              {analytics.summary.total_reports}
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">High Priority Active</div>
            <div className="font-display text-3xl font-extrabold text-red-400">
              {analytics.summary.high_priority}
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue (&gt; 48h)</div>
            <div className="font-display text-3xl font-extrabold text-amber-400">
              {analytics.summary.overdue_unresolved}
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">City Resolution Rate</div>
            <div className="font-display text-3xl font-extrabold text-emerald-400">
              {analytics.summary.resolution_rate_percent}%
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue Categories Breakdown Bar Chart */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Civic Problem Distribution</span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.issue_breakdown} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <XAxis type="number" stroke="#64748b" textAnchor="end" fontSize={11} />
                  <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={10} width={130} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131929', borderColor: 'rgba(255,255,255,0.1)' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {analytics.issue_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ward Sanitation Performance Table */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Ward Sanitation Performance</span>
            </h3>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                    <th className="pb-2">Ward Name</th>
                    <th className="pb-2">Total</th>
                    <th className="pb-2">Resolved</th>
                    <th className="pb-2">Resolution %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {analytics.ward_performance.map((w) => (
                    <tr key={w.ward_id} className="hover:bg-white/5">
                      <td className="py-2.5 font-semibold text-slate-200">{w.ward_name}</td>
                      <td className="py-2.5 text-slate-300">{w.total_complaints}</td>
                      <td className="py-2.5 text-emerald-400 font-bold">{w.resolved_complaints}</td>
                      <td className="py-2.5">
                        <span className="font-mono font-bold text-indigo-300">{w.resolution_rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Triage & Assignment Table */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-white">Complaint Triage &amp; Assignments</h2>

          <div className="flex flex-wrap gap-2.5">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference or keywords..."
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
            />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="all">Priority: All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="all">Status: All</option>
              <option value="Submitted">Submitted</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Cleanup Review">Cleanup Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-3">Reference ID</th>
                <th className="pb-3">Problem &amp; Location</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Priority</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Reported</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredComplaints.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition">
                  <td className="py-3 font-mono font-bold text-indigo-400">{c.public_reference}</td>
                  <td className="py-3 max-w-xs">
                    <div className="font-semibold text-slate-200 truncate">{c.description}</div>
                    <div className="text-[11px] text-slate-400 truncate">{c.location_description}</div>
                  </td>
                  <td className="py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {c.issue_category}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        c.priority === 'High'
                          ? 'bg-red-500/20 text-red-400'
                          : c.priority === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`font-semibold ${
                        c.status === 'Resolved' ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400 text-[11px]">
                    {new Date(c.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => setSelectedComplaint(c)}
                      className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-bold text-[11px] transition"
                    >
                      Triage / Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Drawer */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-white">Official Administrative Audit Trail</h3>
        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Entity</th>
                <th className="pb-2">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5">
                  <td className="py-2 text-slate-500">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 text-indigo-400 font-bold">{log.action}</td>
                  <td className="py-2 text-slate-300">{log.entity_id}</td>
                  <td className="py-2 text-slate-400 font-sans">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complaint Modal */}
      <ComplaintModal
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdated={() => {
          loadAdminData();
          setSelectedComplaint(null);
        }}
        currentUser={user}
        workers={workers}
      />
    </div>
  );
};
