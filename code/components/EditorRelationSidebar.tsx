import React, { useMemo, useState, useEffect } from 'react';
import { Artifact } from '../types';
import { formatStatusLabel } from '../utils/status';
import { LinkIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon } from './Icons';

interface RelationOption {
  kind: string;
  label?: string;
  description: string;
  targetFilter?: (artifact: Artifact) => boolean;
  placeholder?: string;
}

interface EditorRelationSidebarProps {
  artifact: Artifact;
  projectArtifacts: Artifact[];
  relationOptions: RelationOption[];
  onAddRelation: (fromId: string, toId: string, kind: string) => void;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
}

interface DraftSelections {
  [kind: string]: {
    targetId: string;
    search: string;
  };
}

const EditorRelationSidebar: React.FC<EditorRelationSidebarProps> = ({
  artifact,
  projectArtifacts,
  relationOptions,
  onAddRelation,
  onRemoveRelation,
}) => {
  const [draftSelections, setDraftSelections] = useState<DraftSelections>(() =>
    relationOptions.reduce<DraftSelections>((acc, option) => {
      acc[option.kind] = { targetId: '', search: '' };
      return acc;
    }, {}),
  );

  useEffect(() => {
    setDraftSelections((prev) => {
      const next: DraftSelections = { ...prev };
      relationOptions.forEach((option) => {
        if (!next[option.kind]) {
          next[option.kind] = { targetId: '', search: '' };
        }
      });
      return next;
    });
  }, [relationOptions]);

  const relationOptionsByKind = useMemo(() => {
    return relationOptions.reduce<Record<string, RelationOption>>((acc, option) => {
      acc[option.kind] = option;
      return acc;
    }, {});
  }, [relationOptions]);

  const relationEntries = useMemo(
    () =>
      artifact.relations
        .map((relation, index) => ({ relation, index }))
        .filter(({ relation }) => relationOptionsByKind[relation.kind]),
    [artifact.relations, relationOptionsByKind],
  );

  const handleTargetChange = (kind: string, targetId: string) => {
    setDraftSelections((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        targetId,
      },
    }));
  };

  const handleSearchChange = (kind: string, search: string) => {
    setDraftSelections((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        search,
      },
    }));
  };

  const handleLink = (kind: string) => {
    const draft = draftSelections[kind];
    if (!draft?.targetId) return;
    onAddRelation(artifact.id, draft.targetId, kind);
    setDraftSelections((prev) => ({
      ...prev,
      [kind]: { targetId: '', search: '' },
    }));
  };

  const groupedRelations = useMemo(() => {
    return relationOptions.map((option) => {
      const matches = relationEntries.filter(({ relation }) => relation.kind === option.kind);
      return { option, matches };
    });
  }, [relationEntries, relationOptions]);

  return (
    <aside className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-5 space-y-6">
      <header className="flex items-start gap-3">
        <div className="rounded-md bg-slate-800/80 p-2 border border-slate-700/80 text-slate-300">
          <LinkIcon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Editor Relations</h4>
          <p className="text-xs text-slate-400">
            Capture narrative links and dependencies without leaving the workbench. These updates feed the graph view and quest
            progress in real time.
          </p>
        </div>
      </header>

      {groupedRelations.map(({ option, matches }) => {
        const draft = draftSelections[option.kind] ?? { targetId: '', search: '' };
        const availableTargets = projectArtifacts
          .filter((candidate) => candidate.id !== artifact.id)
          .filter((candidate) => !artifact.relations.some((rel) => rel.kind === option.kind && rel.toId === candidate.id))
          .filter((candidate) => (option.targetFilter ? option.targetFilter(candidate) : true))
          .filter((candidate) => {
            const haystack = `${candidate.title} ${candidate.type}`.toLowerCase();
            return haystack.includes(draft.search.trim().toLowerCase());
          })
          .sort((a, b) => a.title.localeCompare(b.title));

        const label = option.label ?? formatStatusLabel(option.kind);

        return (
          <section key={option.kind} className="space-y-3">
            <div>
              <h5 className="text-sm font-semibold text-slate-100 flex items-center justify-between">
                <span>{label}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">{option.kind}</span>
              </h5>
              <p className="text-xs text-slate-400 mt-1">{option.description}</p>
            </div>

            <div className="space-y-2">
              {matches.length > 0 ? (
                matches.map(({ relation, index }) => {
                  const target = projectArtifacts.find((candidate) => candidate.id === relation.toId);
                  return (
                    <div
                      key={`${relation.kind}-${relation.toId}-${index}`}
                      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-200"
                    >
                      <div>
                        <p className="font-medium text-cyan-200">{target?.title ?? 'Unknown artifact'}</p>
                        <p className="text-xs text-slate-400">{target?.type ?? relation.toId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveRelation(artifact.id, index)}
                        className="ml-auto text-slate-500 hover:text-red-400"
                        aria-label={`Remove ${label} relation to ${target?.title ?? relation.toId}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 bg-slate-800/40 border border-dashed border-slate-700/60 rounded-md px-3 py-2">
                  No links yet. Use the quick-add controls below to stitch one in.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/70 p-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={draft.search}
                  onChange={(event) => handleSearchChange(option.kind, event.target.value)}
                  placeholder="Search by title or type"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md pl-8 pr-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
              </div>
              <select
                value={draft.targetId}
                onChange={(event) => handleTargetChange(option.kind, event.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              >
                <option value="">{option.placeholder ?? 'Choose an artifact to link'}</option>
                {availableTargets.map((candidate) => (
                  <option key={`${option.kind}-${candidate.id}`} value={candidate.id}>
                    {candidate.title} ({candidate.type})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleLink(option.kind)}
                disabled={!draft.targetId}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-white bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-400 hover:bg-cyan-500 rounded-md transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> Link {label}
              </button>
            </div>
          </section>
        );
      })}
    </aside>
  );
};

export default EditorRelationSidebar;
