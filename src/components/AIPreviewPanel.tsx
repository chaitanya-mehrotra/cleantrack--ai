import React from 'react';
import { AIClassifyResponse } from '../types';
import { Sparkles, AlertCircle, ShieldAlert, CheckCircle2, Cpu, Eye } from 'lucide-react';

interface AIPreviewPanelProps {
  analysis: AIClassifyResponse | null;
  isLoading: boolean;
  textLength: number;
}

export const AIPreviewPanel: React.FC<AIPreviewPanelProps> = ({ analysis, isLoading, textLength }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-5 space-y-4 animate-pulse">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>Multimodal AI Analyzing Waste Patterns...</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!analysis || textLength < 4) {
    return (
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl">
          🤖
        </div>
        <div className="text-sm font-semibold text-slate-300">AI Diagnostic Engine Ready</div>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Start typing a description or upload an image to view real-time civic classification, material segregation, and calibrated priority.
        </p>
      </div>
    );
  }

  const priorityColor =
    analysis.suggested_priority === 'High'
      ? 'text-red-400 bg-red-500/10 border-red-500/30'
      : analysis.suggested_priority === 'Medium'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">CleanTrack AI 2.0 Verdict</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{analysis.confidence}% Calibrated Confidence</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-800/60 border border-white/5 rounded-xl p-3">
          <div className="text-slate-400 uppercase tracking-wider text-[10px] mb-1">Issue Category</div>
          <div className="font-bold text-slate-100 text-sm">{analysis.issue_category}</div>
        </div>

        <div className={`border rounded-xl p-3 ${priorityColor}`}>
          <div className="uppercase tracking-wider text-[10px] opacity-80 mb-1">Assigned Priority</div>
          <div className="font-bold text-sm flex items-center gap-1.5">
            {analysis.suggested_priority === 'High' && <ShieldAlert className="w-4 h-4" />}
            {analysis.suggested_priority}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Material Segregation (SWM 2016)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {analysis.waste_categories.map((cat, idx) => (
            <span
              key={idx}
              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 text-xs space-y-1.5">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Explainability &amp; Reasoning
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">{analysis.priority_reason}</p>
      </div>

      {analysis.vision_analysis && analysis.vision_analysis.is_valid_image && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3 text-xs space-y-1.5">
          <div className="font-semibold text-indigo-300 flex items-center gap-1.5 text-[11px]">
            <Eye className="w-3.5 h-3.5 text-indigo-400" /> Vision Feature Analysis
          </div>
          <div className="text-slate-300 font-medium text-[11px]">{analysis.vision_analysis.verdict}</div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>Clutter Anomaly: {analysis.vision_analysis.clutter_anomaly_score}</span>
            <span>·</span>
            <span>Edge Density: {analysis.vision_analysis.edge_density}</span>
          </div>
        </div>
      )}

      {analysis.requires_manual_review && (
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Flagged for Municipal Officer Verification prior to worker dispatch.</span>
        </div>
      )}
    </div>
  );
};
