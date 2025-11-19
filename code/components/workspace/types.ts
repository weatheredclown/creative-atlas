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

export interface QuickFactModalOptions {
  sourceArtifactId?: string | null;
}

export type InfoModalState = {
  title: string;
  message: string;
} | null;

export interface WorkspaceFeatureGroup {
  title: string;
  description: string;
}

export interface ArtifactNavigationController {
  focusType: (type: ArtifactType) => void;
  clearFilters: () => void;
  openArtifact: (artifactId: string) => void;
}

export type WorkspaceView = 'codex' | 'board' | 'laboratory' | 'studio';
