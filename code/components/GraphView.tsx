
import React, { useEffect, useMemo } from 'react';
import dagre from 'dagre';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Artifact, ArtifactType, isNarrativeArtifactType } from '../types';
import {
  evaluateCharacterArc,
  formatProgressionStatus,
  getArcStageBadgeClassName,
} from '../utils/characterProgression';

interface GraphViewProps {
  artifacts: Artifact[];
  onSelectArtifact: (id: string) => void;
  selectedArtifactId: string | null;
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

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) {
      return node;
    }

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });
};

const GraphView: React.FC<GraphViewProps> = ({ artifacts, onSelectArtifact, selectedArtifactId }) => {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    const artifactLookup = new Map<string, Artifact>(artifacts.map((artifact) => [artifact.id, artifact]));
    const artifactIds = new Set(artifactLookup.keys());
    const nodes: Node<GraphNodeData>[] = artifacts.map((artifact) => {
      const arc = artifact.type === ArtifactType.Character
        ? evaluateCharacterArc(artifact, artifactLookup)
        : null;

      return {
        id: artifact.id,
        data: {
          label: (
            <div className="flex flex-col items-center gap-2 py-1">
              <span className="text-sm font-semibold text-slate-100">{artifact.title}</span>
              {arc && (
                <>
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
    artifacts.forEach(sourceArtifact => {
      sourceArtifact.relations.forEach(relation => {
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

    return { nodes: layoutGraph(nodes, edges), edges };
  }, [artifacts]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setEdges(layoutEdges);
    setNodes((prevNodes) => layoutNodes.map((node) => {
      const existing = prevNodes.find((prevNode) => prevNode.id === node.id);
      return {
        ...node,
        position: existing?.position ?? node.position,
      };
    }));
  }, [layoutEdges, layoutNodes, setEdges, setNodes]);

  useEffect(() => {
    setNodes((prevNodes) => prevNodes.map((node) => {
      const type = (node.data as GraphNodeData).type;
      const isSelected = node.id === selectedArtifactId;
      return {
        ...node,
        style: {
          ...createBaseNodeStyle(type),
          boxShadow: isSelected ? '0 0 0 4px rgba(45, 212, 191, 0.25)' : undefined,
          borderWidth: isSelected ? 2 : 1,
          transform: isSelected ? 'scale(1.02)' : undefined,
        },
      };
    }));
  }, [selectedArtifactId, setNodes]);

  return (
    <div style={{ height: '600px' }} className="bg-slate-900/70 rounded-lg border border-slate-700/50 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) => onSelectArtifact(node.id)}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        nodesDraggable
        nodesConnectable={false}
      >
        <Background color="#293548" gap={24} />
        <Controls showInteractive={false} />
        <MiniMap
            nodeColor={node => nodeColor((node.data as GraphNodeData | undefined)?.type ?? ArtifactType.Story)}
            nodeStrokeWidth={3} 
            zoomable 
            pannable 
            style={{ background: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155' }}
        />
      </ReactFlow>
    </div>
  );
};

export default GraphView;
