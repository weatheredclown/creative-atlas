import type { DocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import { compliancePolicies } from './policies.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type ComplianceViolationType = 'retention' | 'moderation' | 'privacy';

export class ComplianceError extends Error {
  constructor(
    message: string,
    public readonly violation: ComplianceViolationType,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ComplianceError';
  }
}

const normalizeDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof (value as Timestamp)?.toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return null;
};

export const getShareLinkCutoff = (now: Date = new Date()): Date =>
  new Date(now.getTime() - compliancePolicies.dataRetention.shareLinkRetentionDays * DAY_IN_MS);

export const enforceShareLinkRetention = async (
  snapshot: DocumentSnapshot,
  onExpired?: () => void | Promise<void>,
): Promise<void> => {
  const updatedAt = normalizeDate(snapshot.get('updatedAt')) ?? normalizeDate(snapshot.get('createdAt'));
  const cutoff = getShareLinkCutoff();

  if (!updatedAt || updatedAt.getTime() >= cutoff.getTime()) {
    return;
  }

  if (onExpired) {
    await onExpired();
  }

  throw new ComplianceError('Share link has expired due to retention policy.', 'retention', {
    shareId: snapshot.id,
    updatedAt: updatedAt.toISOString(),
    cutoff: cutoff.toISOString(),
  });
};

const bannedMatchers = compliancePolicies.moderation.bannedPhrases.map((phrase) =>
  new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
);

const assertMetadataLength = (value: string, context: Record<string, unknown>) => {
  if (value.length > compliancePolicies.moderation.maxMetadataLength) {
    throw new ComplianceError('Submitted content exceeds the maximum allowed length.', 'moderation', context);
  }
};

const assertModeratedText = (value: unknown, context: Record<string, unknown>) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return;
  }

  assertMetadataLength(value, context);

  for (const matcher of bannedMatchers) {
    if (matcher.test(value)) {
      throw new ComplianceError('Submitted content violates the moderation policy.', 'moderation', {
        ...context,
        phrase: matcher.source,
      });
    }
  }
};

const assertModeratedTags = (tags: unknown, context: Record<string, unknown>) => {
  if (!Array.isArray(tags)) {
    return;
  }

  if (tags.length > compliancePolicies.moderation.maxTagCount) {
    throw new ComplianceError('Too many tags provided for this resource.', 'moderation', context);
  }

  tags.forEach((tag, index) => {
    assertModeratedText(tag, { ...context, tagIndex: index });
  });
};

export const assertProjectContentCompliance = (
  project: { title?: unknown; summary?: unknown; tags?: unknown },
  context: Record<string, unknown>,
): void => {
  assertModeratedText(project.title, { ...context, field: 'title' });
  assertModeratedText(project.summary, { ...context, field: 'summary' });
  assertModeratedTags(project.tags, { ...context, field: 'tags' });
};

export const assertArtifactContentCompliance = (
  artifact: { title?: unknown; summary?: unknown; tags?: unknown; type?: unknown },
  context: Record<string, unknown>,
): void => {
  assertModeratedText(artifact.title, { ...context, field: 'title' });
  assertModeratedText(artifact.summary, { ...context, field: 'summary' });
  assertModeratedText(artifact.type, { ...context, field: 'type' });
  assertModeratedTags(artifact.tags, { ...context, field: 'tags' });
};

export const sanitizeForExternalShare = <T extends object>(resource: T): T => {
  const sanitized = { ...(resource as Record<string, unknown>) };
  for (const field of compliancePolicies.privacy.redactedFieldsForShares) {
    if (!(field in sanitized)) {
      continue;
    }
    if (field in compliancePolicies.privacy.replacements) {
      sanitized[field] = compliancePolicies.privacy.replacements[field];
    } else {
      delete sanitized[field];
    }
  }
  return sanitized as T;
};
