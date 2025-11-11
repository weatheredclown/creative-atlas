import { ArtifactType } from '../../types';

export interface CreateArtifactInput {
  title: string;
  type: ArtifactType;
  summary: string;
  sourceArtifactId?: string | null;
}

export interface QuickFactInput {
  fact: string;
  detail?: string;
}

export type InfoModalState = {
  title: string;
  message: string;
} | null;
