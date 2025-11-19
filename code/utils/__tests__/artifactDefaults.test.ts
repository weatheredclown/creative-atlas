import { describe, expect, it } from 'vitest';

import { ArtifactType } from '../../types';
import { getDefaultDataForType } from '../artifactDefaults';

describe('getDefaultDataForType', () => {
  it('returns an empty location blueprint', () => {
    expect(getDefaultDataForType(ArtifactType.Location, 'Citadel of Glass')).toEqual({
      description: '',
      features: [],
    });
  });
});
