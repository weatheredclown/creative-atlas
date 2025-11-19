
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dagre from 'dagre';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useEdgesState,
  useNodesState,
  type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Artifact, ArtifactType, ArcStageId, isNarrativeArtifactType } from '../types';
import {
  ARC_STAGE_CONFIG,
  buildCharacterArcEvaluationMap,
  formatProgressionStatus,
  getArcStageBadgeClassName,
  getArcStageProgressBarClasses,
  type CharacterArcEvaluation,
} from '../utils/characterProgression';

interface GraphViewProps {
  artifacts: Artifact[];
  onSelectArtifact: (id: string) => void;
  selectedArtifactId: string | null;
  projectId: string;
  characterProgressionMap?: Map<string, CharacterArcEvaluation>;
}

const nodeColor = (type: ArtifactType): string => {
  if (isNarrativeArtifactType(type)) {
    return '#2dd4bf'; // teal-400 for all narrative formats
  }

  switch (type) {
    case ArtifactType.Character: return '#60a5fa'; // blue-400
    case ArtifactType.Location: return '#a78bfa'; // violet-400
    case ArtifactType.Conlang: return '#f472b6'; // pink-400
    case ArtifactType.Game: return '#fb923c'; // orange-400
    case ArtifactType.Repository: return '#38bdf8'; // sky-400
    case ArtifactType.Issue: return '#facc15'; // amber-400
    case ArtifactType.Release: return '#f97316'; // orange-500
    default: return '#94a3b8'; // slate-400
  }
};

type GraphNodeData = { label: React.ReactNode; type: ArtifactType };

type StageByArtifactId = Record<string, ArcStageId | null>;

interface StageFilterSummary {
  stageId: ArcStageId;
  label: string;
  count: number;
}

const createBaseNodeStyle = (type: ArtifactType) => ({
  background: '#1e293b', // slate-800
  color: '#e2e8f0', // slate-200
  border: `1px solid ${nodeColor(type)}`,
  borderRadius: '0.5rem',
  width: 160,
  textAlign: 'center',
  padding: '12px 8px',
  transition: 'transform 150ms ease, box-shadow 150ms ease, border-width 150ms ease',
});

const NODE_WIDTH = 180;
const NODE_HEIGHT = 96;

type StoredNodePositions = Record<string, { x: number; y: number }>;

const STORAGE_PREFIX = 'creative-atlas:graph-layout:';
const STAGE_FILTER_STORAGE_PREFIX = 'creative-atlas:arc-stage-filter:';
const VALID_STAGE_IDS = new Set<ArcStageId>(ARC_STAGE_CONFIG.map((stage) => stage.id));

const loadStoredPositions = (storageKey: string): StoredNodePositions => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as { positions?: StoredNodePositions } | StoredNodePositions;
    if (!parsed) {
      return {};
    }

    if ('positions' in parsed && parsed.positions && typeof parsed.positions === 'object') {
      return parsed.positions as StoredNodePositions;
    }

    if (typeof parsed === 'object') {
      return parsed as StoredNodePositions;
    }

    return {};
  } catch (error) {
    console.warn('Failed to load persisted graph layout positions.', error);
    return {};
  }
};

const loadStageFilter = (storageKey: string): 'all' | ArcStageId => {
  if (typeof window === 'undefined') {
    return 'all';
  }

  try {
    const persistedValue = window.localStorage.getItem(storageKey);
    if (persistedValue && VALID_STAGE_IDS.has(persistedValue as ArcStageId)) {
      return persistedValue as ArcStageId;
    }
  } catch (error) {
    console.warn('Failed to load persisted arc stage filter selection.', error);
  }

  return 'all';
};

const persistStageFilter = (storageKey: string, stageFilter: 'all' | ArcStageId) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, stageFilter);
  } catch (error) {
    console.warn('Failed to persist arc stage filter selection.', error);
  }
};

const layoutGraph = (nodes: Node<GraphNodeData>[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 120, ranksep: 160, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const columnCount = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const xSpacing = NODE_WIDTH + 120;
  const ySpacing = NODE_HEIGHT + 80;

  return nodes.map((node, index) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const fallbackPosition = {
      x: (index % columnCount) * xSpacing,
      y: Math.floor(index / columnCount) * ySpacing,
    };

    if (!nodeWithPosition) {
      return {
        ...node,
        position: fallbackPosition,
      };
    }

    const layoutX = nodeWithPosition.x - NODE_WIDTH / 2;
    const layoutY = nodeWithPosition.y - NODE_HEIGHT / 2;
    const hasValidCoordinates = Number.isFinite(layoutX) && Number.isFinite(layoutY);

    return {
      ...node,
      position: hasValidCoordinates ? { x: layoutX, y: layoutY } : fallbackPosition,
    };
  });
};

const GraphView: React.FC<GraphViewProps> = ({
  artifacts,
  onSelectArtifact,
  selectedArtifactId,
  projectId,
  characterProgressionMap,
}) => {
  const { nodes: layoutNodes, edges: layoutEdges, stageByArtifactId, stageCounts } = useMemo(() => {
    const artifactLookup = new Map<string, Artifact>(artifacts.map((artifact) => [artifact.id, artifact]));
    const artifactIds = new Set(artifactLookup.keys());
    const progressionMap = characterProgressionMap
      ? characterProgressionMap
      : buildCharacterArcEvaluationMap(artifacts, artifactLookup);
    const stageMap: StageByArtifactId = {};
    const stageCountAccumulator = ARC_STAGE_CONFIG.reduce<Record<ArcStageId, number>>((accumulator, stage) => {
      accumulator[stage.id] = 0;
      return accumulator;
    }, {} as Record<ArcStageId, number>);

    const nodes: Node<GraphNodeData>[] = artifacts.map((artifact) => {
      const arc = progressionMap.get(artifact.id);
      const stageProgressClasses = arc ? getArcStageProgressBarClasses(arc.stage.id) : null;
      const progressWidth = arc ? (arc.progressPercent > 0 ? Math.max(arc.progressPercent, 8) : 0) : 0;

      if (arc) {
        stageMap[artifact.id] = arc.stage.id;
        stageCountAccumulator[arc.stage.id] = (stageCountAccumulator[arc.stage.id] ?? 0) + 1;
      } else {
        stageMap[artifact.id] = null;
      }

      return {
        id: artifact.id,
        data: {
          label: (
            <div
              className="flex w-full flex-col items-center gap-2 py-1"
              title={
                arc
                  ? `${artifact.title} — ${arc.stage.label} (${formatProgressionStatus(arc.progression.status)})`
                  : artifact.title
              }
            >
              <span className="text-sm font-semibold text-slate-100">{artifact.title}</span>
              {arc && stageProgressClasses && (
                <>
                  <div
                    className={`h-1.5 w-full overflow-hidden rounded-full ${stageProgressClasses.track}`}
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full rounded-full ${stageProgressClasses.fill}`}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                  <span className={getArcStageBadgeClassName(arc.stage.id)}>{arc.stage.label}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {formatProgressionStatus(arc.progression.status)}
                  </span>
                </>
              )}
            </div>
          ),
          type: artifact.type,
        },
        style: createBaseNodeStyle(artifact.type),
      };
    });

    const edges: Edge[] = [];
    artifacts.forEach((sourceArtifact) => {
      sourceArtifact.relations.forEach((relation) => {
        if (artifactIds.has(relation.toId)) {
          edges.push({
            id: `e-${sourceArtifact.id}-${relation.toId}`,
            source: sourceArtifact.id,
            target: relation.toId,
            animated: true,
            label: relation.kind.replace(/_/g, ' ').toLowerCase(),
            style: { stroke: '#64748b', strokeWidth: 1.5 }, // slate-500
          });
        }
      });
      });

    const stageSummaries: StageFilterSummary[] = ARC_STAGE_CONFIG.map((stage) => ({
      stageId: stage.id,
      label: stage.label,
      count: stageCountAccumulator[stage.id] ?? 0,
    }));

    return { nodes: layoutGraph(nodes, edges), edges, stageByArtifactId: stageMap, stageCounts: stageSummaries };
  }, [artifacts, characterProgressionMap]);

  const storageKey = useMemo(() => `${STORAGE_PREFIX}${projectId}`, [projectId]);
  const stageFilterStorageKey = useMemo(() => `${STAGE_FILTER_STORAGE_PREFIX}${projectId}`, [projectId]);
  const [stageFilter, setStageFilter] = useState<'all' | ArcStageId>(() =>
    loadStageFilter(stageFilterStorageKey),
  );
  const totalTrackedStages = useMemo(
    () => stageCounts.reduce((accumulator, summary) => accumulator + summary.count, 0),
    [stageCounts],
  );
  const activeStageSummary = useMemo(() => {
    if (stageFilter === 'all') {
      return null;
    }
    return stageCounts.find((summary) => summary.stageId === stageFilter) ?? null;
  }, [stageCounts, stageFilter]);
  const [storedPositions, setStoredPositions] = useState<StoredNodePositions>(() => loadStoredPositions(storageKey));
  const [nodes, setNodes, onNodesStateChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setStageFilter(loadStageFilter(stageFilterStorageKey));
  }, [stageFilterStorageKey]);

  useEffect(() => {
    persistStageFilter(stageFilterStorageKey, stageFilter);
  }, [stageFilter, stageFilterStorageKey]);

  useEffect(() => {
    setStoredPositions(loadStoredPositions(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ positions: storedPositions }));
    } catch (error) {
      console.warn('Failed to persist graph layout positions.', error);
    }
  }, [storageKey, storedPositions]);

  useEffect(() => {
    const validIds = new Set(layoutNodes.map((node) => node.id));
    setStoredPositions((previous) => {
      const next: StoredNodePositions = {};
      let mutated = false;

      for (const [id, position] of Object.entries(previous)) {
        if (!validIds.has(id)) {
          mutated = true;
          continue;
        }

        next[id] = position;
      }

      return mutated ? next : previous;
    });
  }, [layoutNodes]);

  useEffect(() => {
    setEdges(layoutEdges);
    setNodes((prevNodes) => layoutNodes.map((node) => {
      const existing = prevNodes.find((prevNode) => prevNode.id === node.id);
      const stored = storedPositions[node.id];
      const type = (node.data as GraphNodeData).type;
      const isSelected = node.id === selectedArtifactId;
      const stageId = stageByArtifactId[node.id] ?? null;
      const shouldDim = stageFilter !== 'all' && stageId !== stageFilter;

      return {
        ...node,
        position: existing?.position ?? stored ?? node.position,
        style: {
          ...createBaseNodeStyle(type),
          opacity: shouldDim ? 0.28 : 1,
          filter: shouldDim ? 'grayscale(70%)' : undefined,
          boxShadow: isSelected ? '0 0 0 4px rgba(45, 212, 191, 0.25)' : undefined,
          borderWidth: isSelected ? 2 : 1,
          transform: isSelected ? 'scale(1.02)' : undefined,
        },
      };
    }));
  }, [layoutEdges, layoutNodes, selectedArtifactId, setEdges, setNodes, stageByArtifactId, stageFilter, storedPositions]);

  const handleNodesChange = useCallback((changes: NodeChange<GraphNodeData>[]) => {
    setStoredPositions((previous) => {
      let mutated = false;
      const next: StoredNodePositions = { ...previous };

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          next[change.id] = { x: change.position.x, y: change.position.y };
          mutated = true;
        }

        if (change.type === 'remove') {
          if (change.id in next) {
            delete next[change.id];
            mutated = true;
          }
        }
      }

      return mutated ? next : previous;
    });

    onNodesStateChange(changes);
  }, [onNodesStateChange]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/80 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl space-y-1">
            <h3 className="text-sm font-semibold text-slate-100">Arc stage spotlight</h3>
            <p className="text-xs text-slate-300">
              Pick a stage to highlight characters advancing through their arcs. While a stage is selected, other nodes dim so
              you can trace relations and attach supporting artifacts without losing the focus of the character journey.
            </p>
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <span>Stage filter</span>
            <select
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 shadow-inner shadow-slate-950 focus:border-emerald-400 focus:outline-none focus:ring-emerald-500/40"
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value as 'all' | ArcStageId)}
            >
              <option value="all">All stages ({totalTrackedStages})</option>
              {stageCounts.map((summary) => (
                <option key={summary.stageId} value={summary.stageId} disabled={summary.count === 0}>
                  {summary.label} ({summary.count})
                </option>
              ))}
            </select>
          </label>
        </div>

        {totalTrackedStages === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            Track characters with arc evaluations to unlock the stage spotlight filter.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            {stageCounts.map((summary) => {
              const badgeClassName = getArcStageBadgeClassName(summary.stageId);
              const isActive = stageFilter !== 'all' && stageFilter === summary.stageId;
              return (
                <span
                  key={summary.stageId}
                  className={`${badgeClassName} ${
                    isActive ? 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-slate-900' : 'ring-1 ring-slate-800/50'
                  }`}
                >
                  {summary.label}
                  <span className="ml-1 text-[10px] font-semibold">{summary.count}</span>
                </span>
              );
            })}
          </div>
        )}

        {activeStageSummary && (
          <p className="mt-3 text-xs text-emerald-200/80">
            Spotlighting <strong>{activeStageSummary.label}</strong> arcs — connect allies, rivals, and key locations while
            everything else remains in the background.
          </p>
        )}
      </div>

      <div style={{ height: '600px' }} className="overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/70">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => onSelectArtifact(node.id)}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          nodesDraggable
          nodesConnectable={false}
        >
          <Background color="#293548" gap={24} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => nodeColor((node.data as GraphNodeData | undefined)?.type ?? ArtifactType.Story)}
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{ background: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155' }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default GraphView;
