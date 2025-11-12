import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import SceneDialogGenerator from '../SceneDialogGenerator';
import { ArtifactType, ProjectStatus, type Artifact, type SceneArtifactData } from '../../types';
import { generateSceneDialogue } from '../../services/geminiService';

vi.mock('../../services/geminiService', () => ({
  generateSceneDialogue: vi.fn(),
}));

const mockGenerateSceneDialogue = generateSceneDialogue as unknown as Mock;

const createCharacterArtifact = (id: string, title: string, summary: string): Artifact => ({
  id,
  ownerId: 'user-1',
  projectId: 'project-1',
  type: ArtifactType.Character,
  title,
  summary,
  status: 'draft',
  tags: [],
  relations: [],
  data: {
    bio: `${title} bio`,
    traits: [
      { id: `${id}-trait-1`, key: 'Role', value: 'Rogue' },
      { id: `${id}-trait-2`, key: 'Flair', value: 'Dry wit' },
    ],
  },
});

describe('SceneDialogGenerator', () => {
  const project = {
    id: 'project-1',
    ownerId: 'user-1',
    title: 'Skyline Heist',
    summary: 'A daring rooftop saga.',
    status: ProjectStatus.Active,
    tags: ['heist'],
  };

  const baseScene: Artifact = {
    id: 'scene-1',
    ownerId: 'user-1',
    projectId: 'project-1',
    type: ArtifactType.Scene,
    title: 'Rooftop Negotiation',
    summary: 'A tense standoff above the city.',
    status: 'draft',
    tags: [],
    relations: [],
    data: {
      prompt: '',
      synopsis: '',
      beats: [],
      characterIds: [],
      dialogue: [],
    },
  };

  const characters = [
    createCharacterArtifact('char-avery', 'Avery', 'A cunning rogue.'),
    createCharacterArtifact('char-jules', 'Jules', 'A disciplined envoy.'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('calls Atlas Intelligence and persists generated dialogue', async () => {
    mockGenerateSceneDialogue.mockResolvedValue({
      synopsis: 'The rivals settle on a fragile truce.',
      beats: ['Set the terms', 'Reveal the hidden blade'],
      dialogue: [
        { speaker: 'Avery', line: 'We dance on these rooftops out of necessity.', direction: 'smirks' },
        { speaker: 'Jules', line: 'Then let us finish the waltz without blood.' },
      ],
    });

    const onUpdateArtifactData = vi.fn();
    const addXp = vi.fn();

    render(
      <SceneDialogGenerator
        project={project}
        artifact={baseScene}
        projectArtifacts={[baseScene, ...characters]}
        onUpdateArtifactData={onUpdateArtifactData}
        addXp={addXp}
      />,
    );

    fireEvent.change(screen.getByLabelText('Scene prompt'), {
      target: { value: 'Avery corners Jules on the glassy roofline.' },
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /Avery/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Jules/ }));

    fireEvent.click(screen.getByRole('button', { name: /forge dialogue/i }));

    await waitFor(() => {
      expect(generateSceneDialogue).toHaveBeenCalled();
    });

    expect(generateSceneDialogue).toHaveBeenCalledWith(
      expect.objectContaining({
        scenePrompt: 'Avery corners Jules on the glassy roofline.',
        characters: expect.arrayContaining([
          expect.objectContaining({ id: 'char-avery', name: 'Avery' }),
          expect.objectContaining({ id: 'char-jules', name: 'Jules' }),
        ]),
      }),
    );

    await waitFor(() => {
      expect(onUpdateArtifactData).toHaveBeenCalled();
    });

    const lastCallIndex = onUpdateArtifactData.mock.calls.length - 1;
    const [, savedData] = onUpdateArtifactData.mock.calls[lastCallIndex] as [string, SceneArtifactData];
    expect(savedData.prompt).toBe('Avery corners Jules on the glassy roofline.');
    expect(savedData.characterIds).toEqual(['char-avery', 'char-jules']);
    expect(savedData.dialogue).toHaveLength(2);
    expect(savedData.dialogue[0]).toMatchObject({
      speakerName: 'Avery',
      speakerId: 'char-avery',
      line: 'We dance on these rooftops out of necessity.',
      direction: 'smirks',
    });
    expect(savedData.dialogue[1]).toMatchObject({
      speakerName: 'Jules',
      speakerId: 'char-jules',
      line: 'Then let us finish the waltz without blood.',
    });
    expect(savedData.generatedAt).toBeTruthy();

    expect(addXp).toHaveBeenCalledWith(9);
    expect(
      screen.getByText('We dance on these rooftops out of necessity.'),
    ).toBeInTheDocument();
  });
});

