
import React, { useState, useCallback } from 'react';
import { Artifact, Relation } from '../types';
import { expandSummary } from '../services/geminiService';
import { exportArtifactToMarkdown } from '../utils/export';
import { SparklesIcon, Spinner, LinkIcon, PlusIcon, ArrowDownTrayIcon } from './Icons';

interface ArtifactDetailProps {
  artifact: Artifact;
  projectArtifacts: Artifact[];
  onUpdateArtifact: (updatedArtifact: Artifact) => void;
  onAddRelation: (fromId: string, toId: string, kind: string) => void;
  addXp: (amount: number) => void;
}

const ArtifactDetail: React.FC<ArtifactDetailProps> = ({ artifact, projectArtifacts, onUpdateArtifact, onAddRelation, addXp }) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [relationTargetId, setRelationTargetId] = useState('');

  const handleExpandSummary = useCallback(async () => {
    setIsExpanding(true);
    setExpandError(null);
    try {
      const newSummary = await expandSummary(artifact);
      onUpdateArtifact({ ...artifact, summary: newSummary });
    } catch (e) {
      setExpandError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsExpanding(false);
    }
  }, [artifact, onUpdateArtifact]);

  const handleAddRelationClick = () => {
    if (relationTargetId) {
        onAddRelation(artifact.id, relationTargetId, 'RELATES_TO');
        addXp(2); // XP Source: link two artifacts (+2)
        setRelationTargetId('');
        setShowAddRelation(false);
    }
  };

  const availableTargets = projectArtifacts.filter(a => a.id !== artifact.id && !artifact.relations.some(r => r.toId === a.id));

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 divide-y divide-slate-700/50">
      <div className="p-6">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">{artifact.title}</h3>
                <p className="text-sm text-slate-400 mb-4">Type: <span className="font-semibold text-cyan-400">{artifact.type}</span></p>
            </div>
            <button onClick={() => exportArtifactToMarkdown(artifact)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">
                <ArrowDownTrayIcon className="w-4 h-4" /> Export .md
            </button>
        </div>
        
        <div className="prose prose-invert prose-sm max-w-none text-slate-300 mb-4">{artifact.summary}</div>

        <button
          onClick={handleExpandSummary}
          disabled={isExpanding}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-md transition-colors disabled:bg-slate-500"
        >
          {isExpanding ? <Spinner className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
          Lore Weaver: Expand Summary
        </button>
        {expandError && <p className="text-red-400 mt-2 text-xs">{expandError}</p>}
      </div>

      <div className="p-6">
        <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2"><LinkIcon className="w-5 h-5 text-slate-400"/>Relations</h4>
        <div className="space-y-2">
            {artifact.relations.map((rel, i) => {
                const target = projectArtifacts.find(a => a.id === rel.toId);
                return (
                    <div key={i} className="flex items-center gap-2 text-sm bg-slate-700/50 px-3 py-1.5 rounded-md">
                        <span className="text-slate-400">{rel.kind.replace(/_/g, ' ').toLowerCase()}</span>
                        <span className="font-semibold text-cyan-300">{target?.title || 'Unknown Artifact'}</span>
                    </div>
                );
            })}
            {artifact.relations.length === 0 && !showAddRelation && <p className="text-sm text-slate-500">No relations yet.</p>}
        </div>
        
        {showAddRelation ? (
            <div className="flex items-center gap-2 mt-4">
                <select 
                    value={relationTargetId} 
                    onChange={e => setRelationTargetId(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                >
                    <option value="">Select an artifact to link...</option>
                    {availableTargets.map(a => <option key={a.id} value={a.id}>{a.title} ({a.type})</option>)}
                </select>
                <button onClick={handleAddRelationClick} className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors">Link</button>
            </div>
        ) : (
            <button onClick={() => setShowAddRelation(true)} className="mt-4 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">
                <PlusIcon className="w-4 h-4" /> Add Relation
            </button>
        )}
      </div>
    </div>
  );
};

export default ArtifactDetail;
