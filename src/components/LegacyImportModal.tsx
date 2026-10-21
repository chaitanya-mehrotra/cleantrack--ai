import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Database, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface LegacyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const LegacyImportModal: React.FC<LegacyImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [legacyReports, setLegacyReports] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem('cleantrack_reports');
        if (raw) {
          const parsed = JSON.parse(raw);
          setLegacyReports(Array.isArray(parsed) ? parsed : []);
        } else {
          setLegacyReports([]);
        }
      } catch (err) {
        console.error('Failed reading legacy reports:', err);
        setLegacyReports([]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (legacyReports.length === 0) return;
    setIsImporting(true);
    try {
      const res = await api.importLegacyReports(legacyReports);
      setResultMessage(`Success! Imported ${res.imported_count} legacy reports into CleanTrack 2.0.`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500);
    } catch (err: any) {
      setResultMessage(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-slate-100 space-y-5 animate-slideUp">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="font-display font-bold text-lg text-slate-100">
              CleanTrack v1.0 Local Data Migration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          CleanTrack AI 2.0 automatically detects existing complaint records stored inside your browser's
          Local Storage from the CleanTrack v1.0 prototype. You can safely migrate them into the new persistent
          shared database with collision-resistant reference IDs and GPS positioning.
        </p>

        {legacyReports.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Detected Local Reports: {legacyReports.length}</span>
              <span className="text-indigo-400">Ready to migrate</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 border border-white/5 rounded-xl p-2 bg-slate-950/60 text-xs">
              {legacyReports.map((r, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-indigo-300">{r.id || `RPT-00${idx + 1}`}</div>
                    <div className="text-slate-300 truncate max-w-xs">{r.description}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      {r.type || 'Mixed'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{r.priority || 'Medium'} Priority</div>
                  </div>
                </div>
              ))}
            </div>

            {resultMessage ? (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{resultMessage}</span>
              </div>
            ) : (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50"
                >
                  {isImporting ? 'Migrating Database...' : 'Migrate to CleanTrack 2.0'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2 bg-slate-950/40 rounded-xl border border-white/5">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">No Legacy Reports Found</div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your browser local storage contains zero unmigrated v1.0 reports. You're completely up to date!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
