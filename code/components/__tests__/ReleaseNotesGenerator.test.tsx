import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReleaseNotesGenerator from '../ReleaseNotesGenerator';
import { Artifact, ArtifactType, TASK_STATE } from '../../types';
import { generateReleaseNotes } from '../../services/geminiService';

vi.mock('../../services/geminiService', () => ({
  generateReleaseNotes: vi.fn(),
}));

const mockedGenerateReleaseNotes = vi.mocked(generateReleaseNotes);

const baseArtifacts: Artifact[] = [
  {
    id: 'task-1',
    ownerId: 'user-1',
    projectId: 'proj-1',
    type: ArtifactType.Task,
    title: 'Polish storyboard',
    summary: 'Tighten pacing for the opener.',
    status: 'done',
    tags: ['story'],
    relations: [],
    data: { state: TASK_STATE.Done },
  },
  {
    id: 'story-1',
    ownerId: 'user-1',
    projectId: 'proj-1',
    type: ArtifactType.Story,
    title: 'Chapter One',
    summary: 'Draft ready for review.',
    status: 'released',
    tags: ['story'],
    relations: [],
    data: [],
  },
  {
    id: 'conlang-1',
    ownerId: 'user-1',
    projectId: 'proj-1',
    type: ArtifactType.Conlang,
    title: 'Darv Lexicon',
    summary: 'Growing word list.',
    status: 'draft',
    tags: ['language'],
    relations: [],
    data: [
      { id: 'lex-1', lemma: 'brubber', pos: 'adj', gloss: 'strange', etymology: '' },
      { id: 'lex-2', lemma: 'kael', pos: 'n', gloss: 'light', etymology: '' },
    ],
  },
];

describe('ReleaseNotesGenerator', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prefills highlights from artifact activity', async () => {
    const addXp = vi.fn();
    render(
      <ReleaseNotesGenerator
        projectId="project-tamenzut"
        projectTitle="Tamenzut"
        artifacts={baseArtifacts}
        addXp={addXp}
      />,
    );

    const highlightsField = screen.getByLabelText(/Highlights to share/i) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(highlightsField.value).toContain('Completed quests:');
    });
    expect(highlightsField.value).toContain('Shipped artifacts:');
    expect(highlightsField.value).toContain('Lexicon now holds');
  });

  it('generates release notes and rewards XP', async () => {
    const user = userEvent.setup();
    const addXp = vi.fn();
    const onDraftGenerated = vi.fn();
    mockedGenerateReleaseNotes.mockResolvedValue('Here are the new release notes!');

    render(
      <ReleaseNotesGenerator
        projectId="project-tamenzut"
        projectTitle="Tamenzut"
        artifacts={baseArtifacts}
        addXp={addXp}
        onDraftGenerated={onDraftGenerated}
      />,
    );

    const highlightsField = screen.getByLabelText(/Highlights to share/i) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(highlightsField.value).toContain('Completed quests:');
    });
    const generateButton = screen.getByRole('button', { name: /Generate release notes/i });

    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Here are the new release notes/i)).toBeInTheDocument();
    });

    expect(mockedGenerateReleaseNotes).toHaveBeenCalledTimes(1);
    expect(mockedGenerateReleaseNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        projectTitle: 'Tamenzut',
        tone: 'playful',
        audience: 'collaborators',
        highlights: highlightsField.value.trim(),
      }),
    );
    expect(addXp).toHaveBeenCalledWith(7);
    expect(onDraftGenerated).toHaveBeenCalledTimes(1);
  });

  it('clears generated notes when switching projects', async () => {
    const user = userEvent.setup();
    const addXp = vi.fn();
    mockedGenerateReleaseNotes.mockResolvedValue('Here are the new release notes!');

    const { rerender } = render(
      <ReleaseNotesGenerator
        projectId="project-tamenzut"
        projectTitle="Tamenzut"
        artifacts={baseArtifacts}
        addXp={addXp}
      />,
    );

    const highlightsField = screen.getByLabelText(/Highlights to share/i) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(highlightsField.value).toContain('Completed quests:');
    });
    const generateButton = screen.getByRole('button', { name: /Generate release notes/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Here are the new release notes/i)).toBeInTheDocument();
    });

    rerender(
      <ReleaseNotesGenerator
        projectId="project-steamweave"
        projectTitle="Steamweave"
        artifacts={baseArtifacts}
        addXp={addXp}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Here are the new release notes/i)).not.toBeInTheDocument();
    });

    const newHighlightsField = screen.getByLabelText(/Highlights to share/i) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(newHighlightsField.value).toContain('Completed quests:');
    });
  });

  it('resets configuration when switching projects', async () => {
    const user = userEvent.setup();
    const addXp = vi.fn();

    const { rerender } = render(
      <ReleaseNotesGenerator
        projectId="project-tamenzut"
        projectTitle="Tamenzut"
        artifacts={baseArtifacts}
        addXp={addXp}
      />, 
    );

    const toneSelect = screen.getByLabelText(/Tone/i) as HTMLSelectElement;
    const audienceSelect = screen.getByLabelText(/Audience/i) as HTMLSelectElement;
    const notesField = screen.getByLabelText(/Optional calls-to-action/i) as HTMLTextAreaElement;

    await user.selectOptions(toneSelect, 'formal');
    await user.selectOptions(audienceSelect, 'players');
    await user.type(notesField, 'Join us for the next launch!');

    expect(toneSelect.value).toBe('formal');
    expect(audienceSelect.value).toBe('players');
    expect(notesField.value).toContain('Join us for the next launch!');

    rerender(
      <ReleaseNotesGenerator
        projectId="project-steamweave"
        projectTitle="Steamweave"
        artifacts={baseArtifacts}
        addXp={addXp}
      />, 
    );

    await waitFor(() => {
      expect((screen.getByLabelText(/Tone/i) as HTMLSelectElement).value).toBe('playful');
    });
    expect((screen.getByLabelText(/Audience/i) as HTMLSelectElement).value).toBe('collaborators');
    expect((screen.getByLabelText(/Optional calls-to-action/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('retains manual edits when new artifact data arrives', async () => {
    const user = userEvent.setup();
    const addXp = vi.fn();
    const { rerender } = render(
      <ReleaseNotesGenerator
        projectId="project-tamenzut"
        projectTitle="Tamenzut"
        artifacts={baseArtifacts}
        addXp={addXp}
      />,
    );

    const highlightsField = screen.getByLabelText(/Highlights to share/i) as HTMLTextAreaElement;
    await user.clear(highlightsField);
    await user.type(highlightsField, '- Custom highlight');

    rerender(
      <ReleaseNotesGenerator
        projectId="project-tamenzut"
        projectTitle="Tamenzut"
        artifacts={[...baseArtifacts, { ...baseArtifacts[1], id: 'story-2', title: 'Chapter Two' }]}
        addXp={addXp}
      />,
    );

    expect(highlightsField.value).toContain('Custom highlight');
  });
});
