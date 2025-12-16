import React, { useState, useCallback, useMemo } from 'react';
import { type AddRelationHandler, type Artifact, ArtifactType, type ProductData, type Relation } from '../types';
import { formatStatusLabel } from '../utils/status';
import {
  LinkIcon,
  PlusIcon,
  XMarkIcon,
} from './Icons';
import { useDepthPreferences } from '../contexts/DepthPreferencesContext';

interface ArtifactRelationsProps {
  artifact: Artifact;
  projectArtifacts: Artifact[];
  onAddRelation: AddRelationHandler;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
  onSelectArtifact?: (artifactId: string) => void;
  addXp: (amount: number) => void;
}

const createRelationEntries = (
  value: unknown,
): { relation: Relation; index: number }[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (
        entry &&
        typeof (entry as { toId?: unknown }).toId === 'string' &&
        typeof (entry as { kind?: unknown }).kind === 'string'
      ) {
        return { relation: entry as Relation, index };
      }
      return null;
    })
    .filter((entry): entry is { relation: Relation; index: number } => entry !== null);
};

const ArtifactRelations: React.FC<ArtifactRelationsProps> = ({
  artifact,
  projectArtifacts,
  onAddRelation,
  onRemoveRelation,
  onSelectArtifact,
  addXp,
}) => {
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [relationTargetId, setRelationTargetId] = useState('');
  const [relationKind, setRelationKind] = useState('RELATES_TO');
  const { showDetailedFields } = useDepthPreferences();

  const relationEntries = useMemo(
    () => createRelationEntries(artifact.relations as unknown),
    [artifact.relations],
  );

  const projectArtifactsList = useMemo(
    () => (Array.isArray(projectArtifacts) ? projectArtifacts : []),
    [projectArtifacts],
  );

  const handleSelectRelatedArtifact = useCallback(
    (artifactId: string) => {
      if (!onSelectArtifact) {
        return;
      }

      const exists = projectArtifactsList.some((candidate) => candidate.id === artifactId);
      if (!exists) {
        return;
      }

      onSelectArtifact(artifactId);
    },
    [onSelectArtifact, projectArtifactsList],
  );

  const handleAddRelationClick = () => {
    if (relationTargetId) {
      onAddRelation(artifact.id, relationTargetId, relationKind);
      addXp(2); // XP Source: link two artifacts (+2)
      setRelationTargetId('');
      setRelationKind('RELATES_TO');
      setShowAddRelation(false);
    }
  };

  const handleRemoveRelation = (indexToRemove: number) => {
    onRemoveRelation(artifact.id, indexToRemove);
  };

  const availableTargets = projectArtifactsList.filter(
    (candidate) => {
      if (candidate.id === artifact.id) {
        return false;
      }

      const hasCatalogRelation = relationEntries.some(
        (entry) => entry.relation.toId === candidate.id && !entry.relation.variantId,
      );

      return !hasCatalogRelation;
    },
  );

  const relationOptions = [
    'RELATES_TO',
    'CONTAINS',
    'DERIVES_FROM',
    'USES',
    'APPEARS_IN',
    'SET_IN',
    'PUBLISHES_TO',
  ];

  const getVariantLabel = useCallback(
    (variantId?: string): string | null => {
      if (!variantId || artifact.type !== ArtifactType.ProductCatalog) {
        return null;
      }

      const data = artifact.data as ProductData | undefined;
      const variants = Array.isArray(data?.variants) ? data?.variants : [];
      const variant = variants.find((entry) => entry.id === variantId);

      return variant?.name ?? null;
    },
    [artifact],
  );

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6" id="artifact-relations-panel">
      <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <LinkIcon className="w-5 h-5 text-slate-400" /> Relations
      </h4>
      {showDetailedFields ? (
        <>
          <div className="space-y-2">
            {relationEntries.map(({ relation, index }) => {
              const target = projectArtifactsList.find((a) => a.id === relation.toId);
              const isNavigable = Boolean(onSelectArtifact && target);
              const variantLabel = getVariantLabel(relation.variantId);
              return (
                <div key={`${relation.toId}-${index}`} className="flex items-center gap-2 text-sm bg-slate-700/50 px-3 py-1.5 rounded-md">
                  <span className="text-slate-400">{formatStatusLabel(relation.kind)}</span>
                  {variantLabel ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                      Merch item: {variantLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleSelectRelatedArtifact(relation.toId)}
                    disabled={!isNavigable}
                    className={`font-semibold transition-colors ${
                      isNavigable
                        ? 'text-cyan-300 hover:text-cyan-100 underline underline-offset-2 decoration-cyan-400'
                        : 'text-slate-400 cursor-default'
                    }`}
                  >
                    {target?.title || 'Unknown Artifact'}
                  </button>
                  <button
                    onClick={() => handleRemoveRelation(index)}
                    className="ml-auto p-1 text-slate-400 hover:text-red-400 transition"
                    aria-label={`Remove relation ${relation.kind} to ${target?.title ?? relation.toId}`}
                    title="Remove relation"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {relationEntries.length === 0 && !showAddRelation && (
              <p className="text-sm text-slate-500">No relations yet.</p>
            )}
          </div>

          {showAddRelation ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
              <select
                value={relationKind}
                onChange={(event) => setRelationKind(event.target.value)}
                className="w-full sm:w-40 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              >
                {relationOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatStatusLabel(option)}
                  </option>
                ))}
              </select>
              <select
                value={relationTargetId}
                onChange={(event) => setRelationTargetId(event.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              >
                <option value="">Select an artifact to link...</option>
                {availableTargets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.type})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddRelationClick}
                className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
              >
                Link
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRelation(true)}
              className="mt-4 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Add Relation
            </button>
          )}
        </>
      ) : (
        <div className="space-y-3 text-sm text-slate-400">
          {relationEntries.length > 0 ? (
            <ul className="space-y-2">
              {relationEntries.map(({ relation, index }) => {
                const target = projectArtifactsList.find((a) => a.id === relation.toId);
                const isNavigable = Boolean(onSelectArtifact && target);
                const variantLabel = getVariantLabel(relation.variantId);
                return (
                  <li key={`${relation.toId}-${index}`} className="rounded-md border border-slate-700/60 bg-slate-800/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectRelatedArtifact(relation.toId)}
                        disabled={!isNavigable}
                        className={`font-semibold transition-colors ${
                          isNavigable
                            ? 'text-cyan-300 hover:text-cyan-100 underline underline-offset-2 decoration-cyan-400'
                            : 'text-slate-400 cursor-default'
                        }`}
                      >
                        {target?.title || 'Unknown Artifact'}
                      </button>
                      <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{formatStatusLabel(relation.kind)}</span>
                      {variantLabel ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                          Merch item: {variantLabel}
                        </span>
                      ) : null}
                      <button
                        onClick={() => handleRemoveRelation(index)}
                        className="ml-auto text-slate-500 hover:text-red-400 transition"
                        aria-label={`Remove relation ${relation.kind} to ${target?.title ?? relation.toId}`}
                        title="Remove relation"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No relations yet. Reveal depth to start weaving connections.</p>
          )}
          <p className="text-xs text-slate-500">Detailed linking tools appear when you reveal depth.</p>
        </div>
      )}
    </div>
  );
};

export default ArtifactRelations;
