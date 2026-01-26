import React, { useMemo, useState, useEffect } from 'react';
import { type AddRelationHandler, Artifact } from '../types';
import { formatStatusLabel } from '../utils/status';
import { LinkIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon, ChevronDownIcon } from './Icons';
import { useDepthPreferences } from '../contexts/DepthPreferencesContext';

interface RelationOption {
  kind: string;
  label?: string;
  description: string;
  targetFilter?: (artifact: Artifact) => boolean;
  placeholder?: string;
  group?: string;
}

interface EditorRelationSidebarProps {
  artifact: Artifact;
  projectArtifacts: Artifact[];
  relationOptions: RelationOption[];
  onAddRelation: AddRelationHandler;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
}

interface DraftSelections {
  [kind: string]: {
    targetIds: string[];
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
      acc[option.kind] = { targetIds: [], search: '' };
      return acc;
    }, {}),
  );
  const { showDetailedFields } = useDepthPreferences();

  useEffect(() => {
    setDraftSelections((prev) => {
      const next: DraftSelections = { ...prev };
      relationOptions.forEach((option) => {
        if (!next[option.kind]) {
          next[option.kind] = { targetIds: [], search: '' };
        }
      });
      return next;
    });
  }, [relationOptions]);

  const relationGroups = useMemo(() => {
    const grouped = relationOptions.reduce<Record<string, RelationOption[]>>((acc, option) => {
      const groupKey = option.group ?? 'Other Links';
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(option);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([group, options]) => ({
        group,
        options,
      }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [relationOptions]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };
      relationGroups.forEach(({ group }) => {
        if (typeof next[group] === 'undefined') {
          next[group] = true;
        }
      });
      return next;
    });
  }, [relationGroups]);

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

  const handleSearchChange = (kind: string, search: string) => {
    setDraftSelections((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        search,
      },
    }));
  };

  const handleTargetToggle = (kind: string, targetId: string) => {
    setDraftSelections((prev) => {
      const existing = prev[kind]?.targetIds ?? [];
      const nextTargetIds = existing.includes(targetId)
        ? existing.filter((id) => id !== targetId)
        : [...existing, targetId];

      return {
        ...prev,
        [kind]: {
          ...prev[kind],
          targetIds: nextTargetIds,
        },
      };
    });
  };

  const handleSelectVisible = (kind: string, targetIds: string[]) => {
    setDraftSelections((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        targetIds,
      },
    }));
  };

  const handleClearSelection = (kind: string) => {
    setDraftSelections((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        targetIds: [],
      },
    }));
  };

  const handleLink = (kind: string) => {
    const draft = draftSelections[kind];
    const targets = draft?.targetIds ?? [];
    if (targets.length === 0) return;

    targets.forEach((targetId) => {
      onAddRelation(artifact.id, targetId, kind);
    });
    setDraftSelections((prev) => ({
      ...prev,
      [kind]: { targetIds: [], search: '' },
    }));
  };

  const relationsByKind = useMemo(() => {
    return relationEntries.reduce<Record<string, { relation: Artifact['relations'][number]; index: number }[]>>(
      (acc, entry) => {
        if (!acc[entry.relation.kind]) {
          acc[entry.relation.kind] = [];
        }
        acc[entry.relation.kind].push(entry);
        return acc;
      },
      {},
    );
  }, [relationEntries]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

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

      {relationGroups.map(({ group, options }) => {
        const isExpanded = expandedGroups[group];

        return (
          <section key={group} className="space-y-4">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-left"
              aria-expanded={isExpanded}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{group}</p>
                <p className="text-[11px] text-slate-500">{options.length} relation type{options.length === 1 ? '' : 's'}</p>
              </div>
              <ChevronDownIcon
                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
              />
            </button>

            {isExpanded && (
              <div className="space-y-5">
                {options.map((option) => {
                  const draft = draftSelections[option.kind] ?? { targetIds: [], search: '' };
                  const matches = relationsByKind[option.kind] ?? [];
                  const availableTargets = projectArtifacts
                    .filter((candidate) => candidate.id !== artifact.id)
                    .filter(
                      (candidate) => !artifact.relations.some((rel) => rel.kind === option.kind && rel.toId === candidate.id),
                    )
                    .filter((candidate) => (option.targetFilter ? option.targetFilter(candidate) : true))
                    .filter((candidate) => {
                      const haystack = `${candidate.title} ${candidate.type}`.toLowerCase();
                      return haystack.includes(draft.search.trim().toLowerCase());
                    })
                    .sort((a, b) => a.title.localeCompare(b.title));
                  const visibleIds = availableTargets.map((candidate) => candidate.id);
                  const allVisibleSelected = visibleIds.every((id) => draft.targetIds.includes(id)) && visibleIds.length > 0;

                  const label = option.label ?? formatStatusLabel(option.kind);

                  return (
                    <article key={option.kind} className="space-y-3">
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
                                  className={`ml-auto text-slate-500 hover:text-red-400 transition ${
                                    showDetailedFields ? '' : 'opacity-80 hover:opacity-100 focus-visible:opacity-100'
                                  }`}
                                  aria-label={`Remove ${label} relation to ${target?.title ?? relation.toId}`}
                                  title="Remove relation"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-500 bg-slate-800/40 border border-dashed border-slate-700/60 rounded-md px-3 py-2">
                            {showDetailedFields
                              ? 'No links yet. Use the quick-add controls below to stitch one in.'
                              : 'No links yet. Reveal depth to begin weaving narrative links.'}
                          </p>
                        )}
                      </div>

                      {showDetailedFields && (
                        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/70 p-3">
                          <div className="relative">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              value={draft.search}
                              onChange={(event) => handleSearchChange(option.kind, event.target.value)}
                              placeholder="Search by title or type"
                              aria-label={`Search candidates for ${label}`}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md pl-8 pr-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                            <span>{availableTargets.length} match{availableTargets.length === 1 ? '' : 'es'}</span>
                            <div className="flex items-center gap-2 text-[10px] normal-case">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSelectVisible(
                                    option.kind,
                                    allVisibleSelected
                                      ? draft.targetIds.filter((id) => !visibleIds.includes(id))
                                      : Array.from(new Set([...draft.targetIds, ...visibleIds])),
                                  )
                                }
                                className="text-cyan-300 hover:text-cyan-200"
                              >
                                {allVisibleSelected ? 'Clear visible' : 'Select visible'}
                              </button>
                              {draft.targetIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleClearSelection(option.kind)}
                                  className="text-slate-400 hover:text-slate-200"
                                >
                                  Clear all
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-48 overflow-y-auto rounded-md border border-slate-800 divide-y divide-slate-800 bg-slate-900/60">
                            {availableTargets.length > 0 ? (
                              availableTargets.map((candidate) => {
                                const isChecked = draft.targetIds.includes(candidate.id);
                                return (
                                  <label
                                    key={`${option.kind}-${candidate.id}`}
                                    className="flex items-center gap-3 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/60 cursor-pointer"
                                    aria-label={`${label} relation target ${candidate.title}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleTargetToggle(option.kind, candidate.id)}
                                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    <div>
                                      <p className="font-medium text-slate-100">{candidate.title}</p>
                                      <p className="text-[11px] text-slate-400">{candidate.type}</p>
                                    </div>
                                  </label>
                                );
                              })
                            ) : (
                              <p className="px-3 py-4 text-xs text-slate-500 text-center">
                                No artifacts match your search yet.
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleLink(option.kind)}
                            disabled={(draft.targetIds?.length ?? 0) === 0}
                            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-white bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-400 hover:bg-cyan-500 rounded-md transition-colors"
                          >
                            <PlusIcon className="w-4 h-4" /> Link {draft.targetIds.length > 0 ? `${draft.targetIds.length} artifact${draft.targetIds.length === 1 ? '' : 's'}` : label}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </aside>
  );
};

export default EditorRelationSidebar;
