import { type Scene, type SceneArtifactData, type SceneDialogueLine } from '../types';

const coerceString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
};

export const createSceneDialogueLineId = (timestamp: number, index: number): string =>
  `dialogue-${timestamp.toString(36)}-${index.toString(36)}`;

export const createEmptySceneArtifactData = (): SceneArtifactData => ({
  prompt: '',
  synopsis: '',
  beats: [],
  characterIds: [],
  generatedAt: undefined,
  dialogue: [],
});

const summarizeLegacyScene = (scene: Partial<Scene>): string | null => {
  const title = coerceString(scene.title).trim();
  const summary = coerceString(scene.summary).trim();
  if (title.length === 0 && summary.length === 0) {
    return null;
  }
  if (title.length === 0) {
    return summary;
  }
  if (summary.length === 0) {
    return title;
  }
  return `${title}: ${summary}`;
};

export const sanitizeSceneArtifactData = (
  value: unknown,
  timestamp: number,
): SceneArtifactData => {
  const fallback = createEmptySceneArtifactData();

  if (Array.isArray(value)) {
    const beats = value
      .map((entry) => (entry && typeof entry === 'object' ? summarizeLegacyScene(entry as Partial<Scene>) : null))
      .filter((beat): beat is string => Boolean(beat));
    if (beats.length > 0) {
      return {
        ...fallback,
        beats,
      };
    }
    return fallback;
  }

  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const raw = value as Partial<SceneArtifactData> & Record<string, unknown>;

  const prompt = coerceString(raw.prompt);
  const synopsis = coerceString(raw.synopsis);

  const beatsSource = Array.isArray(raw.beats) ? raw.beats : [];
  const beats = Array.from(
    new Set(
      beatsSource
        .map((beat) => coerceString(beat).trim())
        .filter((beat) => beat.length > 0),
    ),
  );

  const characterSource = Array.isArray(raw.characterIds) ? raw.characterIds : [];
  const characterIds = Array.from(
    new Set(
      characterSource
        .map((id) => coerceString(id).trim())
        .filter((id) => id.length > 0),
    ),
  );

  const generatedAtValue = coerceString(raw.generatedAt).trim();
  const generatedAt = generatedAtValue.length > 0 ? generatedAtValue : undefined;

  const dialogueSource = Array.isArray(raw.dialogue) ? raw.dialogue : [];
  const dialogue = dialogueSource
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const rawLine = entry as Partial<SceneDialogueLine> & Record<string, unknown>;
      const lineText = coerceString(rawLine.line).trim();
      if (lineText.length === 0) {
        return null;
      }

      const speakerName = coerceString(rawLine.speakerName).trim();
      const speakerId = coerceString(rawLine.speakerId).trim();
      const directionText = coerceString(rawLine.direction).trim();
      const rawId = coerceString(rawLine.id).trim();

      return {
        id: rawId.length > 0 ? rawId : createSceneDialogueLineId(timestamp, index),
        speakerId: speakerId.length > 0 ? speakerId : undefined,
        speakerName:
          speakerName.length > 0
            ? speakerName
            : speakerId.length > 0
            ? speakerId
            : `Speaker ${index + 1}`,
        line: lineText,
        direction: directionText.length > 0 ? directionText : undefined,
      } satisfies SceneDialogueLine;
    })
    .filter((line): line is SceneDialogueLine => line !== null);

  return {
    prompt,
    synopsis,
    beats,
    characterIds,
    generatedAt,
    dialogue,
  };
};

export const formatSceneDialogue = (lines: SceneDialogueLine[]): string =>
  lines
    .map((line) => {
      const direction = line.direction?.trim();
      const directionBlock = direction ? `\n  (${direction})` : '';
      return `${line.speakerName}:\n  ${line.line}${directionBlock}`;
    })
    .join('\n\n');

