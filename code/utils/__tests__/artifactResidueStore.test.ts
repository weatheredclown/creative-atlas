import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ArtifactResidue } from '../artifactNormalization';
import { createArtifactResidueStore } from '../artifactResidueStore';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createArtifactResidueStore', () => {
  it('logs warnings and preserves raw values when mismatched residue is recorded', () => {
    const logger = vi.fn();
    const store = createArtifactResidueStore(logger);
    const residue: ArtifactResidue = {
      tags: ['valid', 123],
      relations: [{ toId: 'a', kind: 'RELATES_TO' }, { toId: 42 }],
    } as unknown as ArtifactResidue;

    store.record('artifact-1', residue);

    expect(logger).toHaveBeenCalledWith(
      'Artifact payload contained mismatched fields and was preserved separately.',
      { artifactId: 'artifact-1', field: 'tags' },
    );
    expect(logger).toHaveBeenCalledWith(
      'Artifact payload contained mismatched fields and was preserved separately.',
      { artifactId: 'artifact-1', field: 'relations' },
    );

    expect(store.read('artifact-1')).toEqual(residue);
  });

  it('clears residue entries when sanitized updates arrive', () => {
    const logger = vi.fn();
    const store = createArtifactResidueStore(logger);
    const residue: ArtifactResidue = { tags: ['draft'] };

    store.record('artifact-2', residue);
    expect(store.read('artifact-2')).toEqual(residue);

    store.record('artifact-2', { tags: undefined });

    expect(store.read('artifact-2')).toBeUndefined();
    expect(logger).toHaveBeenCalledTimes(1);
  });

  it('supports deleting and resetting the cache', () => {
    const store = createArtifactResidueStore();

    store.record('artifact-3', { tags: ['alpha'] });
    store.record('artifact-4', { relations: [{ toId: 'b', kind: 'RELATES_TO' }] });

    expect(store.read('artifact-3')).toBeDefined();
    expect(store.read('artifact-4')).toBeDefined();

    store.delete('artifact-3');
    expect(store.read('artifact-3')).toBeUndefined();

    store.reset();
    expect(store.read('artifact-4')).toBeUndefined();
  });
});
