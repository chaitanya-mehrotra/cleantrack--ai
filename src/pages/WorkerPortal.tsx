import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WorkerTask } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Wrench, Navigation, Camera, CheckCircle2, AlertTriangle, Clock,
  Upload, Check, X, ShieldAlert, ArrowRight, ExternalLink
} from 'lucide-react';

export const WorkerPortal: React.FC = () => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<WorkerTask | null>(null);

  // Evidence upload state
  const [afterImageBase64, setAfterImageBase64] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Obstacle modal state
  const [showObstacleModal, setShowObstacleModal] = useState(false);
  const [obstacleNotes, setObstacleNotes] = useState('');
  const [isReportingObstacle, setIsReportingObstacle] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed loading worker tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleStartWork = async (taskId: number) => {
    try {
      await api.updateTaskProgress(taskId, { status: 'In Progress' });
      alert('Task status updated to In Progress. On-site cleanup started.');
      loadTasks();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAfterImageBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!selectedTask) return;
    if (!afterImageBase64) {
      alert('Please capture or upload an After-Cleanup verification photograph.');
      return;
    }

    setIsSubmittingProof(true);
    try {
      await api.updateTaskProgress(selectedTask.assignment_id, {
        status: 'Review Requested',
        notes: completionNotes || 'Cleaned and cleared by sanitation team',
        after_image_base64: afterImageBase64,
      });
      alert('Verification evidence submitted successfully for municipal review!');
      setSelectedTask(null);
      setAfterImageBase64(null);
      setCompletionNotes('');
      loadTasks();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleReportObstacleSubmit = async () => {
    if (!selectedTask || !obstacleNotes.trim()) return;
    setIsReportingObstacle(true);
    try {
      await api.reportObstacle(selectedTask.assignment_id, obstacleNotes);
      alert('Obstacle flagged to the municipal control room.');
      setShowObstacleModal(false);
      setObstacleNotes('');
      loadTasks();
    } catch (err: any) {
      alert(`Reporting failed: ${err.message}`);
    } finally {
      setIsReportingObstacle(false);
    }
  };

  const pendingTasks = tasks.filter((t) => t.assignment_status !== 'Review Requested' && t.status !== 'Resolved');
  const completedTasks = tasks.filter((t) => t.assignment_status === 'Review Requested' || t.status === 'Resolved');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Worker Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-white">Sanitation Worker Field App</h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Low-Bandwidth Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Assigned Field Worker: <strong className="text-slate-200">{user?.display_name || 'Ramesh Kumar'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-white/5 text-center">
            <div className="text-xs font-semibold text-slate-400">Pending Assignments</div>
            <div className="font-display text-xl font-extrabold text-amber-400">{pendingTasks.length}</div>
          </div>
        </div>
      </div>

      {/* Active Tasks List */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <span>Assigned Cleanup Tasks</span>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded-full">
            {pendingTasks.length}
          </span>
        </h2>

        {pendingTasks.length === 0 ? (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-10 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">All Assigned Tasks Completed!</div>
            <p className="text-xs text-slate-400">Great job. You have cleared all complaints in your queue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((t) => (
              <div
                key={t.assignment_id}
                className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-emerald-500/30 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">{t.public_reference}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          t.priority === 'High'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {t.priority} Priority
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {t.issue_category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Assigned {new Date(t.assigned_at).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                      t.assignment_status === 'In Progress'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {t.assignment_status}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-medium">{t.description}</p>

                {t.notes && (
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-white/5 text-[11px] text-indigo-300">
                    <strong>Admin Note:</strong> {t.notes}
                  </div>
                )}

                <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl flex items-center justify-between">
                  <span>📍 {t.location_description}</span>
                  <a
                    href={t.navigation_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold text-[11px]"
                  >
                    <span>Open Navigation</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Worker Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {t.assignment_status === 'Assigned' && (
                      <button
                        onClick={() => handleStartWork(t.assignment_id)}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                      >
                        <Wrench className="w-4 h-4" /> Start On-Site Work
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedTask(t);
                        setAfterImageBase64(null);
                        setCompletionNotes('');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      <Camera className="w-4 h-4" /> Upload After-Cleanup Photo
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTask(t);
                      setShowObstacleModal(true);
                    }}
                    className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Report Obstacle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Upload After-Cleanup Photo & Request Review */}
      {selectedTask && !showObstacleModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-slate-100 space-y-5 animate-slideUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Camera className="w-4 h-4" />
                <span>Submit Cleanup Verification Evidence</span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Task: <strong className="text-indigo-400 font-mono">{selectedTask.public_reference}</strong> · {selectedTask.issue_category}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300">
                1. After-Cleanup Photograph (Required)
              </label>

              {afterImageBase64 ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <img src={afterImageBase64} alt="After cleanup" className="w-full h-52 object-cover" />
                  <button
                    type="button"
                    onClick={() => setAfterImageBase64(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-lg text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500 rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40 transition">
                  <input type="file" accept="image/*" onChange={handleImageCapture} className="hidden" />
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">Tap to capture clean site photo</span>
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">2. Completion Notes</label>
              <textarea
                rows={2}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Bin completely emptied, road washed and swept, tipper truck departed."
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitProof}
                disabled={isSubmittingProof || !afterImageBase64}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmittingProof ? 'Uploading Proof...' : 'Submit Verification Evidence'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Report Obstacle */}
      {selectedTask && showObstacleModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100 space-y-4 animate-slideUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Report Inaccessible Location / Obstacle</span>
              </div>
              <button
                onClick={() => setShowObstacleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Notify the municipal control room if you cannot access the garbage point due to locked gates,
              heavy traffic obstruction, or hazardous conditions.
            </p>

            <textarea
              rows={3}
              value={obstacleNotes}
              onChange={(e) => setObstacleNotes(e.target.value)}
              placeholder="e.g. Locked gate at residential society / JCB equipment needed for concrete malba..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowObstacleModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReportObstacleSubmit}
                disabled={isReportingObstacle || !obstacleNotes.trim()}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl disabled:opacity-50"
              >
                {isReportingObstacle ? 'Submitting...' : 'Flag Obstacle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
