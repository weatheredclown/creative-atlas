import { describe, expect, it } from 'vitest';

import {
  type ArtifactPayload,
  normalizeArtifact,
  normalizeArtifacts,
} from '../artifactNormalization';
import { ArtifactType } from '../../types';

const createPayload = (overrides: Partial<ArtifactPayload> = {}): ArtifactPayload => ({
  id: 'art-1',
  ownerId: 'owner-1',
  projectId: 'proj-1',
  type: ArtifactType.Story,
  title: 'Sample Artifact',
  summary: 'Summary',
  status: 'draft',
  tags: ['lore', 'draft'],
  relations: [],
  data: {},
  ...overrides,
});

describe('normalizeArtifact', () => {
  it('filters invalid tags and relations while preserving the raw residue', () => {
    const mismatchedTags = ['valid', 123, null];
    const mismatchedRelations = [
      { toId: 'a', kind: 'RELATES_TO' },
      { toId: 123, kind: 'RELATES_TO' },
      null,
    ];

    const result = normalizeArtifact(
      createPayload({ tags: mismatchedTags as unknown, relations: mismatchedRelations as unknown }),
      'fallback-owner',
    );

    expect(result.sanitized.tags).toEqual(['valid']);
    expect(result.sanitized.relations).toEqual([{ toId: 'a', kind: 'RELATES_TO' }]);
    expect(result.residue).toEqual({
      tags: mismatchedTags,
      relations: mismatchedRelations,
    });
  });

  it('fills in the ownerId when the payload omits it', () => {
    const result = normalizeArtifact(createPayload({ ownerId: undefined }), 'new-owner');

    expect(result.sanitized.ownerId).toBe('new-owner');
    expect(result.residue).toBeUndefined();
  });

  it('returns no residue when the payload is already valid', () => {
    const result = normalizeArtifact(createPayload(), 'owner-1');

    expect(result.sanitized.tags).toEqual(['lore', 'draft']);
    expect(result.sanitized.relations).toEqual([]);
    expect(result.residue).toBeUndefined();
  });
});

describe('normalizeArtifacts', () => {
  it('normalizes a list of payloads', () => {
    const payloads: ArtifactPayload[] = [
      createPayload({ tags: ['alpha', undefined] as unknown }),
      createPayload({ id: 'art-2', relations: [{ toId: 'x', kind: 'RELATES_TO' }] }),
    ];

    const normalized = normalizeArtifacts(payloads, 'fallback-owner');

    expect(normalized).toHaveLength(2);
    expect(normalized[0].tags).toEqual(['alpha']);
    expect(normalized[1].relations).toEqual([{ toId: 'x', kind: 'RELATES_TO' }]);
  });
});
