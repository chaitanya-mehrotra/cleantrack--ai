import React, { useState } from 'react';
import { Complaint, User } from '../types';
import { api } from '../services/api';
import {
  X, MapPin, ThumbsUp, Calendar, AlertCircle, CheckCircle, Clock,
  ArrowRight, Shield, UserCheck, RefreshCw, AlertTriangle
} from 'lucide-react';

interface ComplaintModalProps {
  complaint: Complaint | null;
  onClose: () => void;
  onUpdated: () => void;
  currentUser: User | null;
  workers?: Array<{ id: number; display_name: string; active_tasks: number }>;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  complaint,
  onClose,
  onUpdated,
  currentUser,
  workers = [],
}) => {
  if (!complaint) return null;

  const [isSupporting, setIsSupporting] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenInput, setShowReopenInput] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | ''>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Priority override modal state
  const [showPriorityOverride, setShowPriorityOverride] = useState(false);
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [overrideReason, setOverrideReason] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isOwner = currentUser?.id === complaint.user_id;

  const handleSupport = async () => {
    if (!currentUser) {
      alert('Please log in to support and upvote this civic complaint.');
      return;
    }
    setIsSupporting(true);
    try {
      await api.supportComplaint(complaint.id);
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Support vote failed');
    } finally {
      setIsSupporting(false);
    }
  };

  const handleConfirmCleanup = async () => {
    try {
      await api.confirmCleanup(complaint.id);
      alert('Thank you! You have confirmed the cleanup resolution.');
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Confirmation failed');
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      alert('Please specify why the resolution is incomplete.');
      return;
    }
    try {
      await api.reopenComplaint(complaint.id, reopenReason);
      alert('Complaint reopened for further municipal action.');
      setShowReopenInput(false);
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Reopening failed');
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedWorkerId) return;
    setIsAssigning(true);
    try {
      await api.assignComplaint(complaint.id, Number(selectedWorkerId), assignmentNotes);
      alert('Worker assigned successfully!');
      setSelectedWorkerId('');
      setAssignmentNotes('');
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOverridePriority = async () => {
    if (!overrideReason.trim()) {
      alert('Please provide an official audit reason for overriding priority.');
      return;
    }
    try {
      await api.overridePriority(complaint.id, newPriority, overrideReason);
      alert('Priority successfully updated with audit record.');
      setShowPriorityOverride(false);
      setOverrideReason('');
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Priority override failed');
    }
  };

  const beforeImages = complaint.images.filter((img) => img.image_type === 'BEFORE_CLEANUP');
  const afterImages = complaint.images.filter((img) => img.image_type === 'AFTER_CLEANUP');

  const steps = ['Submitted', 'Assigned', 'In Progress', 'Cleanup Review', 'Resolved'];
  const currentStepIdx = steps.indexOf(complaint.status);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-100 p-6 space-y-6 animate-slideUp">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-extrabold text-indigo-400">{complaint.public_reference}</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  complaint.priority === 'High'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : complaint.priority === 'Medium'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {complaint.priority} Priority
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  complaint.status === 'Resolved'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {complaint.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Reported on {new Date(complaint.created_at).toLocaleString('en-IN')} by {complaint.reporter_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Lifecycle Stepper */}
        <div className="bg-slate-950/70 border border-white/5 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            Resolution State Machine
          </div>
          <div className="flex items-center justify-between">
            {steps.map((st, idx) => {
              const isPastOrCurrent = currentStepIdx >= idx;
              const isCurrent = complaint.status === st;
              return (
                <React.Fragment key={st}>
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isCurrent
                          ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]'
                          : isPastOrCurrent
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border border-white/5'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-medium ${
                        isCurrent ? 'text-indigo-300 font-bold' : isPastOrCurrent ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {st}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        currentStepIdx > idx ? 'bg-emerald-500/50' : 'bg-slate-800'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Description & Location */}
        <div className="space-y-3">
          <div className="text-sm text-slate-200 bg-slate-800/40 border border-white/5 p-4 rounded-xl leading-relaxed">
            {complaint.description}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/40 border border-white/5 p-3 rounded-xl flex items-start gap-2">
              <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-300">Location:</span> {complaint.location_description}
                <div className="text-[11px] text-slate-400 mt-0.5">
                  GPS: {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)} ({complaint.service_zone_name || 'Ward Zone'})
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-white/5 p-3 rounded-xl space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Issue Category:</span>
                <span className="font-bold text-slate-200">{complaint.issue_category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Materials:</span>
                <span className="text-indigo-300">{complaint.waste_categories.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confidence:</span>
                <span className="text-emerald-400 font-semibold">{complaint.ai_confidence}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Before & After Photos Side by Side */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Verification Evidence (Before vs. After Cleanup)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/10 rounded-xl p-3 bg-slate-950/50">
              <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Initial Problem Photo (Before)
              </div>
              {beforeImages.length > 0 ? (
                <img
                  src={beforeImages[0].storage_path}
                  alt="Before cleanup"
                  className="w-full h-44 object-cover rounded-lg border border-white/10"
                />
              ) : (
                <div className="w-full h-44 rounded-lg bg-slate-900 border border-dashed border-white/10 flex items-center justify-center text-xs text-slate-500">
                  No initial photograph provided
                </div>
              )}
            </div>

            <div className="border border-white/10 rounded-xl p-3 bg-slate-950/50">
              <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Cleanup Evidence (After)
              </div>
              {afterImages.length > 0 ? (
                <img
                  src={afterImages[0].storage_path}
                  alt="After cleanup"
                  className="w-full h-44 object-cover rounded-lg border border-white/10"
                />
              ) : (
                <div className="w-full h-44 rounded-lg bg-slate-900 border border-dashed border-white/10 flex items-center justify-center text-xs text-slate-500">
                  {complaint.status === 'Resolved' || complaint.status === 'Cleanup Review'
                    ? 'Awaiting worker photo sync'
                    : 'Pending on-site worker completion'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Support upvote & Citizen Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSupport}
              disabled={isSupporting}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                complaint.has_user_supported
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{complaint.support_count} Upvotes</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {complaint.status === 'Cleanup Review' && (
              <>
                <button
                  onClick={handleConfirmCleanup}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Confirm Cleanup
                </button>
                <button
                  onClick={() => setShowReopenInput(!showReopenInput)}
                  className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reopen Report
                </button>
              </>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowPriorityOverride(true)}
                className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" /> Modify Priority
              </button>
            )}
          </div>
        </div>

        {/* Reopen reason input form */}
        {showReopenInput && (
          <div className="bg-red-950/30 border border-red-500/30 p-3 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-red-300">Why is the resolution unsatisfactory?</div>
            <input
              type="text"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Garbage still remaining in street corner / bin not emptied..."
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReopenInput(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg"
              >
                Submit Reopen
              </button>
            </div>
          </div>
        )}

        {/* Admin Priority Override Modal Drawer */}
        {showPriorityOverride && (
          <div className="bg-slate-950 border border-indigo-500/30 p-4 rounded-xl space-y-3">
            <div className="text-xs font-bold text-indigo-300 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Official Priority Override (Audit Logged)
            </div>
            <div className="flex gap-2">
              {(['High', 'Medium', 'Low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setNewPriority(p)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                    newPriority === p
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-400 border-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Mandatory official justification (e.g. Proximity to maternity hospital / VVIP route)..."
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPriorityOverride(false)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleOverridePriority}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg"
              >
                Save Override
              </button>
            </div>
          </div>
        )}

        {/* Admin Worker Assignment Section */}
        {isAdmin && workers.length > 0 && (
          <div className="bg-slate-950/80 border border-white/10 p-4 rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" /> Assign to Sanitation Team
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value ? Number(e.target.value) : '')}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Select Sanitation Worker...</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.display_name} ({w.active_tasks} active tasks)
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Instructions (e.g. Bring tipper van, clear by 2 PM)..."
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              onClick={handleAssignWorker}
              disabled={!selectedWorkerId || isAssigning}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              {isAssigning ? 'Assigning...' : 'Dispatch Assignment'}
            </button>
          </div>
        )}

        {/* Audit Status History Timeline */}
        {complaint.status_history && complaint.status_history.length > 0 && (
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Audit Trail &amp; Status History
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
              {complaint.status_history.map((h) => (
                <div key={h.id} className="bg-slate-950/40 p-2 rounded-lg flex items-start justify-between text-[11px]">
                  <div>
                    <span className="font-semibold text-indigo-300">{h.new_status}:</span> {h.reason}
                  </div>
                  <span className="text-slate-500 text-[10px] whitespace-nowrap ml-2">
                    {new Date(h.changed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
