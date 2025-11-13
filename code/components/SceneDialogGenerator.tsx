import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Artifact,
  ArtifactType,
  type CharacterData,
  Project,
  SceneArtifactData,
  SceneDialogueLine,
} from '../types';
import { IntelligenceLogo, SparklesIcon, Spinner } from './Icons';
import { generateText } from '../services/aiService';
import {
  createSceneDialogueLineId,
  formatSceneDialogue,
  sanitizeSceneArtifactData,
} from '../utils/sceneArtifacts';

interface SceneDialogGeneratorProps {
  project: Project;
  artifact: Artifact;
  projectArtifacts: Artifact[];
  onUpdateArtifactData: (artifactId: string, data: SceneArtifactData) => void;
  addXp: (xp: number) => Promise<void> | void;
}

interface CharacterOption {
  id: string;
  name: string;
  summary: string;
  bio: string;
  traits: string[];
}

const MAX_TRAIT_SAMPLES = 3;
const XP_REWARD = 9; // XP Source: Dialogue Forge assist (+9)

const SceneDialogGenerator: React.FC<SceneDialogGeneratorProps> = ({
  project,
  artifact,
  projectArtifacts,
  onUpdateArtifactData,
  addXp,
}) => {
  const sanitizeTimestampRef = useRef<number>(Date.now());
  useEffect(() => {
    sanitizeTimestampRef.current = Date.now();
  }, [artifact.id]);

  const normalizedData = useMemo(
    () => sanitizeSceneArtifactData(artifact.data, sanitizeTimestampRef.current),
    [artifact.data],
  );

  const [prompt, setPrompt] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [beats, setBeats] = useState<string[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [dialogue, setDialogue] = useState<SceneDialogueLine[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    setPrompt(normalizedData.prompt.trim().length > 0 ? normalizedData.prompt : artifact.summary ?? '');
    setSynopsis(normalizedData.synopsis);
    setBeats(normalizedData.beats);
    setSelectedCharacterIds(normalizedData.characterIds);
    setDialogue(normalizedData.dialogue);
    setGeneratedAt(normalizedData.generatedAt ?? null);
  }, [normalizedData, artifact.summary]);

  useEffect(() => {
    setCopyStatus('idle');
  }, [dialogue]);

  const characterOptions = useMemo<CharacterOption[]>(() => {
    return projectArtifacts
      .filter(
        (candidate) =>
          candidate.projectId === artifact.projectId && candidate.type === ArtifactType.Character,
      )
      .map((candidate) => {
        const data = candidate.data as CharacterData | undefined;
        const traits = Array.isArray(data?.traits)
          ? data.traits
              .slice(0, MAX_TRAIT_SAMPLES)
              .map((trait) => `${trait.key}: ${trait.value}`)
          : [];
        const bioSnippet = (data?.bio ?? '').split('\n')[0]?.trim() ?? '';
        return {
          id: candidate.id,
          name: candidate.title,
          summary: candidate.summary?.trim() || bioSnippet,
          bio: data?.bio ?? '',
          traits,
        } satisfies CharacterOption;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [artifact.projectId, projectArtifacts]);

  const buildSceneData = useCallback(
    (overrides: Partial<SceneArtifactData> = {}): SceneArtifactData => ({
      prompt: overrides.prompt ?? prompt,
      synopsis: overrides.synopsis ?? synopsis,
      beats: overrides.beats ?? beats,
      characterIds: overrides.characterIds ?? selectedCharacterIds,
      generatedAt: overrides.generatedAt ?? (generatedAt ?? undefined),
      dialogue: overrides.dialogue ?? dialogue,
    }),
    [prompt, synopsis, beats, selectedCharacterIds, generatedAt, dialogue],
  );

  const persistSceneData = useCallback(
    (overrides: Partial<SceneArtifactData> = {}) => {
      const next = buildSceneData(overrides);
      onUpdateArtifactData(artifact.id, next);
    },
    [artifact.id, buildSceneData, onUpdateArtifactData],
  );

  useEffect(() => {
    const validIds = new Set(characterOptions.map((option) => option.id));
    setSelectedCharacterIds((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      if (filtered.length === prev.length) {
        return prev;
      }
      persistSceneData({ characterIds: filtered });
      return filtered;
    });
  }, [characterOptions, persistSceneData]);

  const selectedProfiles = useMemo(
    () =>
      selectedCharacterIds
        .map((id) => characterOptions.find((option) => option.id === id) ?? null)
        .filter((option): option is CharacterOption => option !== null),
    [characterOptions, selectedCharacterIds],
  );

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
    setError(null);
  };

  const handlePromptBlur = () => {
    const trimmed = prompt.trim();
    setPrompt(trimmed);
    persistSceneData({ prompt: trimmed });
  };

  const handleSynopsisChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSynopsis(event.target.value);
  };

  const handleSynopsisBlur = () => {
    const trimmed = synopsis.trim();
    setSynopsis(trimmed);
    persistSceneData({ synopsis: trimmed });
  };

  const handleCharacterToggle = (characterId: string) => {
    setError(null);
    setSelectedCharacterIds((prev) => {
      const exists = prev.includes(characterId);
      const next = exists ? prev.filter((value) => value !== characterId) : [...prev, characterId];
      persistSceneData({ characterIds: next });
      return next;
    });
  };

  const generatedAtLabel = useMemo(() => {
    if (!generatedAt) {
      return null;
    }
    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleString();
  }, [generatedAt]);

  const canGenerate = prompt.trim().length > 0 && selectedCharacterIds.length >= 2 && !isGenerating;

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      setError('Enter a scene prompt before generating dialogue.');
      return;
    }
    if (selectedCharacterIds.length < 2) {
      setError('Select at least two characters so Atlas Intelligence can stage a conversation.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCopyStatus('idle');

    try {
      const castProfiles = selectedProfiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        summary: profile.summary,
        bio: profile.bio,
        traits: profile.traits,
      }));

      const sceneSummaryContext = synopsis.trim().length > 0 ? synopsis : artifact.summary ?? '';

      const characterProfiles = castProfiles
        .map(
          (profile) =>
            `### ${profile.name}\n\n${[profile.summary, profile.bio, ...profile.traits]
              .filter((field) => field && field.trim().length > 0)
              .join('\n\n')}`,
        )
        .join('\n\n');

      const systemPrompt = [
        `You are an expert screenwriter for ${project.title}.`,
        `Your task is to write dialogue for a scene titled "${artifact.title}".`,
        sceneSummaryContext ? `Scene summary: ${sceneSummaryContext}` : '',
        `The scene involves the following characters:\n${characterProfiles}`,
        beats.length > 0 ? `The dialogue should follow these beats:\n${beats.join('\n')}` : '',
        'Generate a JSON object with the keys "synopsis", "beats", and "dialogue".',
        'The "dialogue" key should be an array of objects, each with "speaker", "line", and "direction" keys.',
        'The speaker value must exactly match one of the character names provided.',
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await generateText(
        `System prompt:\n${systemPrompt}\n\nScene prompt:\n${trimmedPrompt}`,
        {
          responseMimeType: 'application/json',
        },
      );

      const timestamp = Date.now();
      const speakerLookup = new Map(
        selectedProfiles.map((profile) => [profile.name.toLowerCase(), profile.id]),
      );

      const parsedResult = JSON.parse(result) as {
        synopsis?: unknown;
        beats?: unknown;
        dialogue?: unknown;
      };

      const generatedDialogue: SceneDialogueLine[] = (
        (Array.isArray(parsedResult.dialogue) ? parsedResult.dialogue : []) as Array<{
          speaker?: unknown;
          line?: unknown;
          direction?: unknown;
        }>
      )
        .map((line, index) => {
          const rawSpeaker = (typeof line.speaker === 'string' ? line.speaker : '').trim();
          const normalizedSpeaker = rawSpeaker.toLowerCase();
          const matchedId = speakerLookup.get(normalizedSpeaker);
          const direction = typeof line.direction === 'string' ? line.direction.trim() : '';
          const content = typeof line.line === 'string' ? line.line.trim() : '';
          if (content.length === 0) {
            return null;
          }
          const resolvedName = rawSpeaker.length > 0
            ? rawSpeaker
            : matchedId
            ? selectedProfiles.find((profile) => profile.id === matchedId)?.name ?? `Speaker ${index + 1}`
            : `Speaker ${index + 1}`;
          return {
            id: createSceneDialogueLineId(timestamp, index),
            speakerId: matchedId,
            speakerName: resolvedName,
            line: content,
            direction: direction.length > 0 ? direction : undefined,
          } satisfies SceneDialogueLine;
        })
        .filter((line): line is SceneDialogueLine => line !== null);

      if (generatedDialogue.length === 0) {
        throw new Error('Atlas Intelligence returned an empty script. Try tweaking the prompt or cast.');
      }

      const generatedBeats = Array.isArray(parsedResult.beats)
        ? parsedResult.beats
            .map((beat) => (typeof beat === 'string' ? beat.trim() : ''))
            .filter((beat) => beat.length > 0)
        : [];

      const aiSynopsis = typeof parsedResult.synopsis === 'string' ? parsedResult.synopsis.trim() : '';
      const nextSynopsis = aiSynopsis.length > 0 ? aiSynopsis : (sceneSummaryContext ?? '');
      const generatedAtIso = new Date(timestamp).toISOString();

      setPrompt(trimmedPrompt);
      setSynopsis(nextSynopsis);
      setBeats(generatedBeats);
      setDialogue(generatedDialogue);
      setGeneratedAt(generatedAtIso);

      persistSceneData({
        prompt: trimmedPrompt,
        synopsis: nextSynopsis,
        beats: generatedBeats,
        characterIds: selectedCharacterIds,
        dialogue: generatedDialogue,
        generatedAt: generatedAtIso,
      });

      await Promise.resolve(addXp(XP_REWARD));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate dialogue.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [
    addXp,
    artifact.summary,
    artifact.title,
    beats,
    persistSceneData,
    project.title,
    prompt,
    selectedCharacterIds,
    selectedProfiles,
    synopsis,
  ]);

  const handleCopyDialogue = async () => {
    if (dialogue.length === 0) {
      return;
    }
    try {
      const text = formatSceneDialogue(dialogue);
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyStatus('copied');
        window.setTimeout(() => setCopyStatus('idle'), 2500);
      }
    } catch (err) {
      console.warn('Failed to copy dialogue to clipboard', err);
      setError('Unable to copy the dialogue right now.');
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/50 bg-emerald-500/10">
            <IntelligenceLogo className="h-5 w-5 text-emerald-300" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
              Atlas Intelligence
            </p>
            <h3 className="text-lg font-semibold text-slate-100">Dialogue Forge</h3>
            <p className="text-sm text-slate-400">
              Feed a prompt and cast list to spin up stage directions and conversational beats for this scene.
            </p>
          </div>
        </div>
        {generatedAtLabel ? (
          <p className="text-xs text-slate-500">Last generated {generatedAtLabel}</p>
        ) : null}
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Scene prompt
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            onBlur={handlePromptBlur}
            rows={5}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Rival champions confront each other on the rain-slick rooftops."
          />
        </label>
        <div className="flex flex-col gap-2 text-sm text-slate-300">
          Cast focus
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border border-slate-700/60 bg-slate-900/40 p-3">
            {characterOptions.length > 0 ? (
              characterOptions.map((option) => {
                const isSelected = selectedCharacterIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                      isSelected
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                        : 'border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-slate-500/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCharacterToggle(option.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-400 focus:ring-emerald-500"
                    />
                    <div className="space-y-1">
                      <p className="font-semibold leading-tight">{option.name}</p>
                      {option.summary ? (
                        <p className="text-xs text-slate-400 leading-snug">{option.summary}</p>
                      ) : null}
                      {option.traits.length > 0 ? (
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Traits: {option.traits.join(', ')}
                        </p>
                      ) : null}
                    </div>
                  </label>
                );
              })
            ) : (
              <p className="rounded-lg border border-dashed border-slate-700/60 bg-slate-900/60 px-3 py-2 text-xs text-slate-500">
                Create character artifacts in this project to start generating dialogue pairings.
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Pick at least two characters so Atlas Intelligence can volley lines between them.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Synopsis (optional)
          <textarea
            value={synopsis}
            onChange={handleSynopsisChange}
            onBlur={handleSynopsisBlur}
            rows={4}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Summarise the emotional goal or fallout you want from this exchange."
          />
        </label>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-200">Suggested beats</h4>
          {beats.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
              {beats.map((beat, index) => (
                <li key={`${beat}-${index}`}>
                  <span className="font-semibold text-emerald-200">{index + 1}.</span> {beat}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-700/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-500">
              Beat suggestions will appear after generation so you can expand or reorder the scene.
            </p>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            canGenerate
              ? 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          {isGenerating ? <Spinner className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />}
          {isGenerating ? 'Forging dialogue…' : 'Forge dialogue'}
        </button>
        <button
          type="button"
          onClick={handleCopyDialogue}
          disabled={dialogue.length === 0 || isGenerating}
          className={`rounded-md border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            dialogue.length === 0 || isGenerating
              ? 'border-slate-700 text-slate-500'
              : 'border-slate-600 text-slate-200 hover:border-emerald-400/60 hover:text-emerald-100'
          }`}
        >
          {copyStatus === 'copied' ? 'Copied!' : 'Copy script'}
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-200">Dialogue preview</h4>
        {dialogue.length > 0 ? (
          <div className="space-y-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
            {dialogue.map((line) => (
              <article key={line.id} className="space-y-1">
                <p className="text-sm font-semibold text-slate-100">{line.speakerName}</p>
                {line.direction ? (
                  <p className="text-xs italic text-slate-400">{line.direction}</p>
                ) : null}
                <p className="text-sm text-slate-300 leading-relaxed">{line.line}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-700/60 bg-slate-900/60 px-3 py-4 text-sm text-slate-500">
            Generate dialogue to see Atlas Intelligence alternate lines and stage directions for your cast.
          </p>
        )}
      </div>
    </section>
  );
};

export default SceneDialogGenerator;

