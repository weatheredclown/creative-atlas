import { z } from 'zod';
import { ArtifactType, ProjectStatus } from '../types';

export const timestampSchema = z.string().refine(value => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid timestamp format',
});

export const projectSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional().default(''),
  status: z.nativeEnum(ProjectStatus),
  tags: z.array(z.string()),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const relationSchema = z.object({
  toId: z.string().min(1),
  kind: z.string().min(1),
});

export const artifactSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  projectId: z.string().min(1),
  type: z.nativeEnum(ArtifactType),
  title: z.string().min(1),
  summary: z.string().optional().default(''),
  status: z.string().min(1),
  tags: z.array(z.string()),
  relations: z.array(relationSchema),
  data: z.any(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const userAccountSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  passwordHash: z.string().min(16),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const sessionSchema = z.object({
  token: z.string().min(24),
  userId: z.string().min(1),
  issuedAt: timestampSchema,
  expiresAt: timestampSchema,
});

export const settingsSchema = z.object({
  userId: z.string().min(1),
  xp: z.number().min(0),
  achievementIds: z.array(z.string()),
  lastQuestReset: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type ProjectPayload = z.infer<typeof projectSchema>;
export type ArtifactPayload = z.infer<typeof artifactSchema>;
export type UserAccountPayload = z.infer<typeof userAccountSchema>;
export type SessionPayload = z.infer<typeof sessionSchema>;
export type SettingsPayload = z.infer<typeof settingsSchema>;
