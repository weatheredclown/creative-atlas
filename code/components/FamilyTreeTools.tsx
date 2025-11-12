import React, { useMemo } from 'react';
import { Artifact, ArtifactType, CharacterData, ArcStageId } from '../types';
import {
  ARC_STAGE_CONFIG,
  buildCharacterArcEvaluationMap,
  formatProgressionStatus,
  getArcStageBadgeClassName,
  getArcStageOverlayClassName,
  getArcStageProgressBarClasses,
  type CharacterArcEvaluation,
} from '../utils/characterProgression';
import { UserCircleIcon, LinkIcon, PlusIcon } from './Icons';

type FamilyTreeToolsProps = {
  artifacts: Artifact[];
  onSelectCharacter?: (id: string) => void;
  onCreateCharacter?: () => void;
  characterProgressionMap?: Map<string, CharacterArcEvaluation>;
};

type RelationshipSummary = {
  character: Artifact;
  parents: number;
  children: number;
  partners: number;
  siblings: number;
};

type RelationshipMaps = {
  parentMap: Map<string, Set<string>>;
  childMap: Map<string, Set<string>>;
  partnerMap: Map<string, Set<string>>;
  siblingMap: Map<string, Set<string>>;
};

type FamilyUnit = {
  id: string;
  parents: Artifact[];
  children: Artifact[];
};

type PartnerCluster = {
  id: string;
  partners: Artifact[];
};

type ChipVariant = 'parent' | 'child' | 'partner' | 'independent';

const PARTNER_RELATION_KINDS = new Set(['PARTNER_OF', 'MARRIED_TO', 'SPOUSE_OF']);

const MIN_OVERLAY_PERCENT = 12;

const ensureSet = (map: Map<string, Set<string>>, key: string): Set<string> => {
  if (!map.has(key)) {
    map.set(key, new Set());
  }

  return map.get(key)!;
};

const sanitizeRelationKind = (kind: string): string => kind.trim().toUpperCase();

const extractCharacterDescriptor = (artifact: Artifact): string | undefined => {
  const data = artifact.data as CharacterData | undefined;
  if (!data) {
    return undefined;
  }

  const ageTrait = data.traits?.find((trait) => trait.key.toLowerCase() === 'age');
  if (ageTrait) {
    return `${ageTrait.key}: ${ageTrait.value}`;
  }

  if (data.traits && data.traits.length > 0) {
    const [firstTrait] = data.traits;
    return `${firstTrait.key}: ${firstTrait.value}`;
  }

  return undefined;
};

const FamilyTreeTools: React.FC<FamilyTreeToolsProps> = ({
  artifacts,
  onSelectCharacter,
  onCreateCharacter,
  characterProgressionMap,
}) => {
  const {
    characters,
    familyUnits,
    partnerClusters,
    independentCharacters,
    relationSummaries,
    stats,
  } = useMemo(() => {
    const characters = artifacts
      .filter((artifact) => artifact.type === ArtifactType.Character)
      .sort((a, b) => a.title.localeCompare(b.title));

    const characterMap = new Map<string, Artifact>(characters.map((character) => [character.id, character]));

    const parentMap: RelationshipMaps['parentMap'] = new Map();
    const childMap: RelationshipMaps['childMap'] = new Map();
    const partnerMap: RelationshipMaps['partnerMap'] = new Map();
    const siblingMap: RelationshipMaps['siblingMap'] = new Map();

    const parentEdges = new Set<string>();
    const partnerEdges = new Set<string>();
    const siblingEdges = new Set<string>();

    characters.forEach((character) => {
      ensureSet(parentMap, character.id);
      ensureSet(childMap, character.id);
      ensureSet(partnerMap, character.id);
      ensureSet(siblingMap, character.id);

      character.relations.forEach((relation) => {
        const normalizedKind = sanitizeRelationKind(relation.kind);
        const targetId = relation.toId;
        if (!characterMap.has(targetId)) {
          return;
        }

        switch (normalizedKind) {
          case 'PARENT_OF': {
            ensureSet(childMap, character.id).add(targetId);
            ensureSet(parentMap, targetId).add(character.id);
            parentEdges.add(`parent:${character.id}->${targetId}`);
            break;
          }
          case 'CHILD_OF': {
            ensureSet(parentMap, character.id).add(targetId);
            ensureSet(childMap, targetId).add(character.id);
            parentEdges.add(`parent:${targetId}->${character.id}`);
            break;
          }
          case 'SIBLING_OF': {
            ensureSet(siblingMap, character.id).add(targetId);
            ensureSet(siblingMap, targetId).add(character.id);
            siblingEdges.add(`sibling:${[character.id, targetId].sort().join('|')}`);
            break;
          }
          default: {
            if (PARTNER_RELATION_KINDS.has(normalizedKind)) {
              ensureSet(partnerMap, character.id).add(targetId);
              ensureSet(partnerMap, targetId).add(character.id);
              partnerEdges.add(`partner:${[character.id, targetId].sort().join('|')}`);
            }
            break;
          }
        }
      });
    });

    const titleForId = (id: string) => characterMap.get(id)?.title ?? '';
    const compareIds = (a: string, b: string) => {
      const titleComparison = titleForId(a).localeCompare(titleForId(b));
      if (titleComparison !== 0) {
        return titleComparison;
      }

      return a.localeCompare(b);
    };

    const familyUnitMap = new Map<string, { parents: string[]; parentSet: Set<string>; children: Set<string> }>();

    characters.forEach((character) => {
      const rawParentIds = Array.from(parentMap.get(character.id) ?? []).filter((parentId) => characterMap.has(parentId));
      if (rawParentIds.length === 0) {
        return;
      }

      const parentIds = rawParentIds.sort(compareIds);
      const unitKey = parentIds.join('|');
      if (!familyUnitMap.has(unitKey)) {
        familyUnitMap.set(unitKey, { parents: parentIds, parentSet: new Set(parentIds), children: new Set() });
      }

      familyUnitMap.get(unitKey)!.children.add(character.id);
    });

    const familyUnitEntries = Array.from(familyUnitMap.values());

    const familyUnits: FamilyUnit[] = familyUnitEntries
      .map((unit, index) => ({
        id: `family:${index}`,
        parents: unit.parents.map((parentId) => characterMap.get(parentId)!).filter(Boolean),
        children: Array.from(unit.children)
          .sort(compareIds)
          .map((childId) => characterMap.get(childId)!)
          .filter(Boolean),
      }))
      .sort((a, b) => {
        const aTitle = a.parents[0]?.title ?? a.children[0]?.title ?? '';
        const bTitle = b.parents[0]?.title ?? b.children[0]?.title ?? '';
        return aTitle.localeCompare(bTitle);
      });

    const partnerPairs = new Map<string, { members: string[] }>();
    characters.forEach((character) => {
      const partnerIds = Array.from(partnerMap.get(character.id) ?? []).filter((partnerId) => characterMap.has(partnerId));
      partnerIds.forEach((partnerId) => {
        const pairKey = [character.id, partnerId].sort(compareIds).join('|');
        if (!partnerPairs.has(pairKey)) {
          partnerPairs.set(pairKey, { members: [character.id, partnerId] });
        }
      });
    });

    const familyUnitParentSets = familyUnitEntries.map((unit) => unit.parentSet);
    const partnerClusters: PartnerCluster[] = Array.from(partnerPairs.entries())
      .filter(([, pair]) => !familyUnitParentSets.some((parentSet) => pair.members.every((member) => parentSet.has(member))))
      .map(([key, pair]) => ({
        id: `partners:${key}`,
        partners: pair.members.sort(compareIds).map((memberId) => characterMap.get(memberId)!).filter(Boolean),
      }))
      .sort((a, b) => {
        const aTitle = a.partners[0]?.title ?? '';
        const bTitle = b.partners[0]?.title ?? '';
        return aTitle.localeCompare(bTitle);
      });

    const relatedIds = new Set<string>();
    parentMap.forEach((parents, childId) => {
      if (parents.size > 0) {
        relatedIds.add(childId);
      }
      parents.forEach((parentId) => relatedIds.add(parentId));
    });
    partnerMap.forEach((partners, id) => {
      if (partners.size > 0) {
        relatedIds.add(id);
        partners.forEach((partnerId) => relatedIds.add(partnerId));
      }
    });

    const independentCharacters = characters
      .filter((character) => !relatedIds.has(character.id))
      .sort((a, b) => a.title.localeCompare(b.title));

    const relationSummaries: RelationshipSummary[] = characters.map((character) => ({
      character,
      parents: parentMap.get(character.id)?.size ?? 0,
      children: childMap.get(character.id)?.size ?? 0,
      partners: partnerMap.get(character.id)?.size ?? 0,
      siblings: siblingMap.get(character.id)?.size ?? 0,
    }));

    const stats = {
      familyCount: familyUnits.length,
      relationshipCount: parentEdges.size + partnerEdges.size + siblingEdges.size,
    };
    return {
      characters,
      familyUnits,
      partnerClusters,
      independentCharacters,
      relationSummaries,
      stats,
    };
  }, [artifacts]);

  const progressionMap = useMemo<Map<string, CharacterArcEvaluation>>(() => {
    if (characterProgressionMap) {
      return characterProgressionMap;
    }

    return buildCharacterArcEvaluationMap(artifacts);
  }, [artifacts, characterProgressionMap]);

  const stageDistribution = useMemo(() => {
    const distribution = ARC_STAGE_CONFIG.reduce<Record<ArcStageId, number>>((acc, stage) => {
      acc[stage.id] = 0;
      return acc;
    }, {} as Record<ArcStageId, number>);

    characters.forEach((character) => {
      const evaluation = progressionMap.get(character.id);
      if (evaluation) {
        distribution[evaluation.stage.id] = (distribution[evaluation.stage.id] ?? 0) + 1;
      }
    });

    return distribution;
  }, [characters, progressionMap]);

  if (characters.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-slate-800/80 p-2 text-slate-300">
              <UserCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Family tree tools</h3>
              <p className="text-sm text-slate-400">Add characters to start diagramming family structures.</p>
            </div>
          </div>
          {onCreateCharacter && (
            <button
              type="button"
              onClick={onCreateCharacter}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <PlusIcon className="h-4 w-4" />
              New Character
            </button>
          )}
        </header>
        <p className="mt-4 text-sm text-slate-400">
          Once you create character artifacts, Creative Atlas will map their parents, partners, and siblings here.
        </p>
        {onCreateCharacter && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onCreateCharacter}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <PlusIcon className="h-4 w-4" />
              Create a character artifact
            </button>
          </div>
        )}
      </section>
    );
  }

  const handleSelect = (id: string) => {
    if (onSelectCharacter) {
      onSelectCharacter(id);
    }
  };

  const renderCharacterChip = (artifact: Artifact, variant: ChipVariant) => {
    const baseStyles =
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';

    const variantStyles: Record<ChipVariant, string> = {
      parent: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400 hover:text-cyan-100 focus:ring-cyan-400/60',
      child: 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:border-amber-400 hover:text-amber-100 focus:ring-amber-400/60',
      partner:
        'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400 hover:text-emerald-100 focus:ring-emerald-400/60',
      independent:
        'border-slate-500/40 bg-slate-500/10 text-slate-200 hover:border-slate-400 hover:text-slate-100 focus:ring-slate-400/60',
    };

    const arc = progressionMap.get(artifact.id);
    const statusLabel = arc ? formatProgressionStatus(arc.progression.status) : null;
    const title = arc
      ? `${artifact.title} — ${arc.stage.label}${statusLabel ? ` · ${statusLabel}` : ''}`
      : artifact.title;

    return (
      <button
        type="button"
        onClick={() => handleSelect(artifact.id)}
        className={`${baseStyles} ${variantStyles[variant]}`}
        title={title}
      >
        {artifact.title}
      </button>
    );
  };

  const renderCharacterDetail = (artifact: Artifact, variant: ChipVariant) => {
    const descriptor = extractCharacterDescriptor(artifact);
    const arc = progressionMap.get(artifact.id);
    const stageProgressClasses = arc ? getArcStageProgressBarClasses(arc.stage.id) : null;
    const overlayWidth = arc ? Math.min(100, Math.max(MIN_OVERLAY_PERCENT, arc.progressPercent)) : 0;

    const accentStyles: Record<ChipVariant, string> = {
      parent: 'bg-cyan-500/10 text-cyan-300',
      child: 'bg-amber-500/10 text-amber-300',
      partner: 'bg-emerald-500/10 text-emerald-300',
      independent: 'bg-slate-500/10 text-slate-200',
    };

    return (
      <div
        key={artifact.id}
        className="relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-800/50 p-3 shadow-sm shadow-slate-950/10"
      >
        {arc ? (
          <div
            className={getArcStageOverlayClassName(arc.stage.id)}
            style={{ width: `${overlayWidth}%` }}
            aria-hidden="true"
          />
        ) : null}
        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleSelect(artifact.id)}
              className="text-left text-sm font-semibold text-slate-100 transition-colors hover:text-cyan-300"
            >
              {artifact.title}
            </button>
            {descriptor && <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{descriptor}</p>}
            {artifact.summary && <p className="text-xs text-slate-300/90 line-clamp-2">{artifact.summary}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`rounded-full p-2 ${accentStyles[variant]}`}>
              <LinkIcon className="h-4 w-4" />
            </div>
            {arc && (
              <div className="flex flex-col items-end gap-1 text-right">
                <span className={getArcStageBadgeClassName(arc.stage.id)}>{arc.stage.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-200/80">
                  {formatProgressionStatus(arc.progression.status)}
                </span>
              </div>
            )}
          </div>
        </div>
        {arc && stageProgressClasses ? (
          <div className="relative mt-3 space-y-1">
            <div
              className={`h-1.5 w-full overflow-hidden rounded-full ${stageProgressClasses.track}`}
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full ${stageProgressClasses.fill}`}
                style={{ width: `${arc.progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-200/80">
              {arc.progressPercent}% toward {arc.nextStage ? arc.nextStage.label : 'Legacy'}
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/10 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-slate-800/80 p-2 text-slate-300">
            <UserCircleIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Family tree tools</h3>
            <p className="text-sm text-slate-400">
              Visualise how your characters connect across generations, households, and sibling bonds.
            </p>
          </div>
        </div>
        {onCreateCharacter && (
          <button
            type="button"
            onClick={onCreateCharacter}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <PlusIcon className="h-4 w-4" />
            New Character
          </button>
        )}
      </header>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Families traced</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">{stats.familyCount}</dd>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Characters tracked</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">{characters.length}</dd>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mapped relationships</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">{stats.relationshipCount}</dd>
        </div>
      </dl>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Arc progression overlay</h4>
          <p className="text-xs text-slate-400">
            Track how characters advance through their arcs and spot households clustered in the same stage.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ARC_STAGE_CONFIG.map((stage) => {
            const count = stageDistribution[stage.id] ?? 0;
            const percentage = characters.length > 0 ? Math.round((count / characters.length) * 100) : 0;
            const { track, fill } = getArcStageProgressBarClasses(stage.id);
            const overlayWidth = count > 0 ? Math.max(percentage, 8) : 0;

            return (
              <div
                key={stage.id}
                className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4 shadow-sm shadow-slate-950/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={getArcStageBadgeClassName(stage.id)}>{stage.label}</span>
                  <span className="text-lg font-semibold text-slate-100">{count}</span>
                </div>
                <div
                  className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${track}`}
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full ${fill}`}
                    style={{ width: `${overlayWidth}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  {percentage}% of tracked characters are anchoring this stage.
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Lineage map</h4>
          <p className="text-xs text-slate-400">
            Explore parent households and their children to understand how families interlink across the project.
          </p>
        </div>
        <div className="space-y-4">
          {familyUnits.length > 0 ? (
            familyUnits.map((unit) => (
              <div
                key={unit.id}
                className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-800/60 p-4 shadow-sm shadow-slate-950/20"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Parent household</p>
                    <div className="flex flex-wrap gap-2">
                      {unit.parents.map((parent) => (
                        <div key={parent.id}>{renderCharacterChip(parent, 'parent')}</div>
                      ))}
                    </div>
                  </div>
                  {unit.parents.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {unit.parents.map((parent) => renderCharacterDetail(parent, 'parent'))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Parents not yet recorded for this household.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Children</p>
                  {unit.children.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {unit.children.map((child) => renderCharacterDetail(child, 'child'))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No children linked to this household yet.</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No parent-child relationships recorded yet.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Partner bonds without children</h4>
          <p className="text-xs text-slate-400">
            Track households-in-progress or romantic bonds that have not yet been linked to descendants.
          </p>
        </div>
        {partnerClusters.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {partnerClusters.map((cluster) => (
              <div key={cluster.id} className="space-y-2 rounded-xl border border-slate-700/70 bg-slate-800/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Partners</p>
                <div className="grid gap-2">
                  {cluster.partners.map((partner) => renderCharacterDetail(partner, 'partner'))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">All recorded partner bonds are already part of parent households.</p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Independent characters</h4>
          <p className="text-xs text-slate-400">
            Spotlight characters who have not yet been linked to family structures to inspire future relationship building.
          </p>
        </div>
        {independentCharacters.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {independentCharacters.map((character) => (
              <div key={character.id} className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4">
                {renderCharacterDetail(character, 'independent')}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Every character currently participates in at least one recorded relationship.</p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Relationship breakdown</h4>
          <p className="text-xs text-slate-400">
            Spot characters missing familial anchors or overstuffed webs to balance your cast.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/40">
          <div className="grid grid-cols-5 items-center gap-2 border-b border-slate-700/70 bg-slate-900/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Character</span>
            <span>Parents</span>
            <span>Children</span>
            <span>Partners</span>
            <span>Siblings</span>
          </div>
          {relationSummaries.map((summary) => {
            const arc = progressionMap.get(summary.character.id);
            return (
              <div
                key={summary.character.id}
                className="grid grid-cols-5 items-center gap-2 border-b border-slate-800/50 px-3 py-2 text-sm text-slate-200 last:border-b-0"
              >
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelect(summary.character.id)}
                    className="text-left font-semibold text-slate-100 transition-colors hover:text-cyan-300"
                  >
                    {summary.character.title}
                  </button>
                  {arc && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={getArcStageBadgeClassName(arc.stage.id)}>{arc.stage.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-200/80">
                        {formatProgressionStatus(arc.progression.status)}
                      </span>
                    </div>
                  )}
                </div>
                <span>{summary.parents}</span>
                <span>{summary.children}</span>
                <span>{summary.partners}</span>
                <span>{summary.siblings}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FamilyTreeTools;
