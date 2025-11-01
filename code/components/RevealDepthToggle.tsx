import React from 'react';
import { TriangleToggleIcon, SparklesIcon } from './Icons';
import { useDepthPreferences } from '../contexts/DepthPreferencesContext';

const RevealDepthToggle: React.FC = () => {
  const { showDetailedFields, toggleDetailedFields } = useDepthPreferences();

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-900/50 px-4 py-2 text-slate-200 shadow-inner shadow-slate-900/40">
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Detail Level</span>
        <span className="text-xs text-slate-200">{showDetailedFields ? 'Detailed fields revealed' : 'Simple fields only'}</span>
      </div>
      <button
        type="button"
        onClick={toggleDetailedFields}
        aria-pressed={showDetailedFields}
        className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
          showDetailedFields ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
      >
        <TriangleToggleIcon className={`h-3 w-6 transition-transform ${showDetailedFields ? 'rotate-180 text-white' : 'text-cyan-300'}`} />
        {showDetailedFields ? (
          <span className="flex items-center gap-1">
            <SparklesIcon className="h-3.5 w-3.5" /> Detailed View
          </span>
        ) : (
          <span>Reveal Depth</span>
        )}
      </button>
    </div>
  );
};

export default RevealDepthToggle;

