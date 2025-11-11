import { type ArtifactResidue } from './artifactNormalization';

type ResidueField = keyof ArtifactResidue;

type ResidueLogger = (message: string, context: { artifactId: string; field: ResidueField }) => void;

const defaultLogger: ResidueLogger = (message, context) => {
  console.warn(message, context);
};

export interface ArtifactResidueStore {
  record: (artifactId: string, residue?: ArtifactResidue) => void;
  setField: (artifactId: string, field: ResidueField, value: unknown) => void;
  clearField: (artifactId: string, field: ResidueField) => void;
  delete: (artifactId: string) => void;
  read: (artifactId: string) => ArtifactResidue | undefined;
  reset: () => void;
}

export const createArtifactResidueStore = (
  logger: ResidueLogger = defaultLogger,
): ArtifactResidueStore => {
  const store = new Map<string, ArtifactResidue>();

  const setField = (artifactId: string, field: ResidueField, value: unknown) => {
    if (value === undefined) {
      return;
    }

    const current = store.get(artifactId) ?? {};
    const next = { ...current, [field]: value };
    store.set(artifactId, next);
    logger('Artifact payload contained mismatched fields and was preserved separately.', {
      artifactId,
      field,
    });
  };

  const clearField = (artifactId: string, field: ResidueField) => {
    const current = store.get(artifactId);
    if (!current || !Object.prototype.hasOwnProperty.call(current, field)) {
      return;
    }

    const next = { ...current };
    delete next[field];
    if (Object.keys(next).length === 0) {
      store.delete(artifactId);
    } else {
      store.set(artifactId, next);
    }
  };

  const record = (artifactId: string, residue?: ArtifactResidue) => {
    (['tags', 'relations'] as const).forEach((field) => {
      if (residue && Object.prototype.hasOwnProperty.call(residue, field)) {
        const value = residue[field];
        if (value !== undefined) {
          setField(artifactId, field, value);
        } else {
          clearField(artifactId, field);
        }
      } else {
        clearField(artifactId, field);
      }
    });
  };

  const removeArtifact = (artifactId: string) => {
    store.delete(artifactId);
  };

  const read = (artifactId: string) => store.get(artifactId);

  const reset = () => {
    store.clear();
  };

  return {
    record,
    setField,
    clearField,
    delete: removeArtifact,
    read,
    reset,
  };
};
