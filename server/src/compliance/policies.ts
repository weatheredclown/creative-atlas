import { z } from 'zod';

export interface DataRetentionPolicy {
  /** Number of days before share links expire. */
  shareLinkRetentionDays: number;
  /** Default retention for soft-deleted user data; helps future automation hooks. */
  userContentRetentionDays: number;
}

export interface ModerationPolicy {
  /** Phrases that should never appear in user generated text fields. */
  bannedPhrases: string[];
  /** Maximum character length for text metadata fields. */
  maxMetadataLength: number;
  /** Maximum number of tags allowed per artifact/project. */
  maxTagCount: number;
}

export interface PrivacyPolicy {
  /** Fields removed when responding to unauthenticated share requests. */
  redactedFieldsForShares: string[];
  /** Replacement values for redacted fields when we want deterministic placeholders. */
  replacements: Record<string, unknown>;
}

const parseIntegerEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const dataRetentionPolicy: DataRetentionPolicy = {
  shareLinkRetentionDays: parseIntegerEnv(process.env.SHARE_LINK_RETENTION_DAYS, 90),
  userContentRetentionDays: parseIntegerEnv(process.env.USER_CONTENT_RETENTION_DAYS, 365),
};

const bannedPhraseSchema = z.array(z.string().min(1)).default([
  'hate speech',
  'terrorist propaganda',
  'graphic violence',
  'non-consensual intimate imagery',
  'self-harm instructions',
]);

const moderationPolicy: ModerationPolicy = {
  bannedPhrases: bannedPhraseSchema.parse(
    process.env.MODERATION_BANNED_PHRASES
      ? process.env.MODERATION_BANNED_PHRASES.split(',').map((value) => value.trim()).filter(Boolean)
      : undefined,
  ),
  maxMetadataLength: 5_000,
  maxTagCount: 32,
};

const privacyPolicy: PrivacyPolicy = {
  redactedFieldsForShares: ['ownerId', 'internalNotes', 'email', 'settings'],
  replacements: {
    email: 'redacted@creative-atlas.app',
  },
};

export const compliancePolicies = {
  dataRetention: dataRetentionPolicy,
  moderation: moderationPolicy,
  privacy: privacyPolicy,
  version: '2024-06-10',
} as const;

export type CompliancePolicies = typeof compliancePolicies;
