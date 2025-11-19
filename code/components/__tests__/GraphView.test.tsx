import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import GraphView from '../GraphView';
import { ARC_STAGE_CONFIG, type CharacterArcEvaluation } from '../../utils/characterProgression';
import { ArtifactType, type ArcStageId, type Artifact } from '../../types';

vi.mock('reactflow', () => {
  const ReactFlowMock = ({ nodes, children }: { nodes: unknown[]; children?: React.ReactNode }) => {
    const simplifiedNodes = Array.isArray(nodes)
      ? nodes.map((node) => ({ id: (node as { id: string }).id, style: (node as { style?: unknown }).style }))
      : [];

    return (
      <div data-testid="react-flow">
        <div data-testid="nodes-json">{JSON.stringify(simplifiedNodes)}</div>
        {children}
      </div>
    );
  };

  return {
    __esModule: true,
    default: ReactFlowMock,
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    ReactFlow: ReactFlowMock,
    useNodesState: (initialNodes: unknown[]) => {
      const [nodes, setNodes] = React.useState(initialNodes);
      const onNodesChange = () => {};
      return [nodes, setNodes, onNodesChange] as const;
    },
    useEdgesState: (initialEdges: unknown[]) => {
      const [edges, setEdges] = React.useState(initialEdges);
      const onEdgesChange = () => {};
      return [edges, setEdges, onEdgesChange] as const;
    },
  };
});

const buildEvaluation = (stageId: ArcStageId, nextStageId: ArcStageId | null): CharacterArcEvaluation => {
  const stage = ARC_STAGE_CONFIG.find((config) => config.id === stageId)!;
  const nextStage = nextStageId ? ARC_STAGE_CONFIG.find((config) => config.id === nextStageId)! : null;

  return {
    stage,
    nextStage,
    progressRatio: 0.5,
    progressPercent: 50,
    traitCount: 2,
    bioWordCount: 80,
    summaryWordCount: 60,
    narrativeLinks: [],
    timelineLinks: [],
    questLinks: [],
    suggestions: [],
    score: stage.minScore,
    progression: {
      stageId: stage.id,
      status: 'inciting',
      updatedAt: '2025-01-01',
      checkpoints: [],
    },
  };
};

const buildCharacter = (id: string, title: string, projectId: string): Artifact => ({
  id,
  ownerId: 'user-1',
  projectId,
  type: ArtifactType.Character,
  title,
  summary: `${title} summary`,
  status: 'draft',
  tags: [],
  relations: [],
  data: { bio: '', traits: [] },
});

const getNodesFromDom = () => {
  const nodesJson = screen.getByTestId('nodes-json').textContent ?? '[]';
  return JSON.parse(nodesJson) as Array<{ id: string; style?: { opacity?: number; filter?: string } }>;
};

describe('GraphView stage filter persistence', () => {
  const artifacts = [buildCharacter('hero-1', 'Hero One', 'project-1'), buildCharacter('hero-2', 'Hero Two', 'project-1')];
  const progressionMap = new Map<string, CharacterArcEvaluation>([
    ['hero-1', buildEvaluation('spark', 'rising')],
    ['hero-2', buildEvaluation('crisis', 'transformation')],
  ]);

  beforeEach(() => {
    localStorage.clear();
  });

  it('restores persisted stage filters per project and saves updates', async () => {
    const user = userEvent.setup();
    localStorage.setItem('creative-atlas:arc-stage-filter:project-1', 'crisis');

    render(
      <GraphView
        artifacts={artifacts}
        onSelectArtifact={() => {}}
        selectedArtifactId={null}
        projectId="project-1"
        characterProgressionMap={progressionMap}
      />,
    );

    const stageSelect = screen.getByLabelText(/Stage filter/i);
    expect(stageSelect).toHaveValue('crisis');

    await user.selectOptions(stageSelect, 'spark');

    await waitFor(() => {
      expect(localStorage.getItem('creative-atlas:arc-stage-filter:project-1')).toBe('spark');
    });
  });

  it('dims nodes when a specific arc stage is spotlighted', async () => {
    const user = userEvent.setup();

    render(
      <GraphView
        artifacts={artifacts}
        onSelectArtifact={() => {}}
        selectedArtifactId={null}
        projectId="project-2"
        characterProgressionMap={progressionMap}
      />,
    );

    const stageSelect = screen.getByLabelText(/Stage filter/i);
    await user.selectOptions(stageSelect, 'spark');

    await waitFor(() => {
      const nodes = getNodesFromDom();
      const sparkNode = nodes.find((node) => node.id === 'hero-1');
      const crisisNode = nodes.find((node) => node.id === 'hero-2');

      expect(sparkNode?.style?.opacity).toBe(1);
      expect(sparkNode?.style?.filter).toBeUndefined();
      expect(crisisNode?.style?.opacity).toBeCloseTo(0.28);
      expect(crisisNode?.style?.filter).toContain('grayscale');
    });
  });
});
