import type { Artifact } from '../types';
import { ArtifactType } from '../types';

export const QUICK_FACT_TAG = 'fact';
export const QUICK_FACT_TITLE_PATTERN = /fact\s+#\d+/i;

export const deriveQuickFactTitle = (fact: string, fallbackTitle: string): string => {
  const sanitized = fact.replace(/\s+/g, ' ').trim();
  if (!sanitized) {
    return fallbackTitle;
  }

  const sentenceMatch = sanitized.match(/^[^.!?\n]+[.!?]?/);
  const firstSentence = (sentenceMatch?.[0] ?? sanitized).trim();
  if (firstSentence.length <= 60) {
    return firstSentence;
  }

  const truncated = firstSentence.slice(0, 57).trimEnd();
  return `${truncated}\u2026`;
};

export const createQuickFactSummary = (fact: string, detail?: string): string => {
  const trimmedFact = fact.trim();
  const trimmedDetail = detail?.trim();
  const combined = trimmedDetail && trimmedDetail.length > 0 ? `${trimmedFact} — ${trimmedDetail}` : trimmedFact;

  if (combined.length <= 160) {
    return combined;
  }

  return `${combined.slice(0, 157).trimEnd()}\u2026`;
};

export const createQuickFactContent = (title: string, fact: string, detail?: string): string => {
  const trimmedFact = fact.trim();
  const trimmedDetail = detail?.trim();
  const segments = [`# ${title}`, '', trimmedFact];
  if (trimmedDetail && trimmedDetail.length > 0) {
    segments.push('', trimmedDetail);
  }

  const content = segments.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  return content.endsWith('\n') ? content : `${content}\n`;
};

export const cloneArtifactData = (data: Artifact['data']) => {
  if (data === undefined) {
    return undefined;
  }

  const structuredCloneFn = (globalThis as { structuredClone?: <T>(value: T) => T }).structuredClone;
  if (typeof structuredCloneFn === 'function') {
    try {
      return structuredCloneFn(data) as Artifact['data'];
    } catch (error) {
      console.warn('Structured clone failed for artifact data, falling back to JSON clone.', error);
    }
  }

  try {
    return JSON.parse(JSON.stringify(data)) as Artifact['data'];
  } catch (error) {
    console.warn('JSON clone failed for artifact data, returning shallow copy instead.', error);
    if (Array.isArray(data)) {
      return data.map((item) => (typeof item === 'object' && item !== null ? { ...item } : item)) as Artifact['data'];
    }
    if (typeof data === 'object' && data !== null) {
      return { ...data } as Artifact['data'];
    }
    return data;
  }
};

export const isQuickFactArtifact = (artifact: Artifact): boolean => {
  if (artifact.type !== ArtifactType.Wiki) {
    return false;
  }
  if (artifact.tags.some((tag) => tag.toLowerCase() === QUICK_FACT_TAG)) {
    return true;
  }
  return QUICK_FACT_TITLE_PATTERN.test(artifact.title);
};

export const extractQuickFactNumber = (artifact: Artifact): number | null => {
  const match = artifact.title.match(/#(\d+)/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1] ?? '', 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const sortQuickFactsByRecency = (a: Artifact, b: Artifact): number => {
  const aNumber = extractQuickFactNumber(a);
  const bNumber = extractQuickFactNumber(b);
  if (aNumber !== null && bNumber !== null && aNumber !== bNumber) {
    return bNumber - aNumber;
  }
  if (aNumber !== null && bNumber === null) {
    return -1;
  }
  if (aNumber === null && bNumber !== null) {
    return 1;
  }
  return b.title.localeCompare(a.title);
};
