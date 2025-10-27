
import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Artifact, ArtifactType } from '../types';

interface GraphViewProps {
  artifacts: Artifact[];
  onNodeClick: (id: string) => void;
}

const nodeColor = (type: ArtifactType): string => {
  switch (type) {
    case ArtifactType.Story: return '#2dd4bf'; // teal-400
    case ArtifactType.Character: return '#60a5fa'; // blue-400
    case ArtifactType.Location: return '#a78bfa'; // violet-400
    case ArtifactType.Conlang: return '#f472b6'; // pink-400
    case ArtifactType.Game: return '#fb923c'; // orange-400
    default: return '#94a3b8'; // slate-400
  }
};

const GraphView: React.FC<GraphViewProps> = ({ artifacts, onNodeClick }) => {
  const { nodes, edges } = useMemo(() => {
    const initialNodes: Node[] = artifacts.map((artifact, i) => ({
      id: artifact.id,
      data: { label: artifact.title, type: artifact.type },
      position: { x: (i % 6) * 190 + Math.random() * 40, y: Math.floor(i / 6) * 140 + Math.random() * 40 },
      style: { 
          background: '#1e293b', // slate-800
          color: '#e2e8f0', // slate-200
          border: `1px solid ${nodeColor(artifact.type)}`,
          borderRadius: '0.5rem',
          width: 160,
          textAlign: 'center',
      }
    }));

    const initialEdges: Edge[] = [];
    artifacts.forEach(sourceArtifact => {
      sourceArtifact.relations.forEach(relation => {
        initialEdges.push({
          id: `e-${sourceArtifact.id}-${relation.toId}`,
          source: sourceArtifact.id,
          target: relation.toId,
          animated: true,
          label: relation.kind.replace(/_/g, ' ').toLowerCase(),
          style: { stroke: '#64748b', strokeWidth: 1.5 }, // slate-500
        });
      });
    });

    return { nodes: initialNodes, edges: initialEdges };
  }, [artifacts]);

  return (
    <div style={{ height: '600px' }} className="bg-slate-900/70 rounded-lg border border-slate-700/50 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        fitView
        nodesDraggable
        nodesConnectable={false}
      >
        <Background color="#293548" gap={24} />
        <Controls showInteractive={false} />
        <MiniMap 
            nodeColor={node => nodeColor(node.data.type)} 
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
