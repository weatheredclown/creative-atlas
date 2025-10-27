/// <reference lib="webworker" />

import type { Artifact, Project } from '../types';
import { importArtifactsFromCSV } from '../utils/import';
import { buildStaticSiteArchive, createCsvFilename, serializeArtifactsToCsv, slugify } from '../utils/export';

interface ImportCsvPayload {
  csv: string;
  projectId: string;
  ownerId: string;
}

interface ExportCsvPayload {
  artifacts: Artifact[];
  projectName: string;
}

interface BuildSitePayload {
  project: Project;
  artifacts: Artifact[];
}

interface WorkerRequest {
  id: string;
  type: 'import-csv' | 'export-csv' | 'build-site';
  payload: ImportCsvPayload | ExportCsvPayload | BuildSitePayload;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  error?: string;
  result?: unknown;
}

declare const self: DedicatedWorkerGlobalScope;

const postSuccess = (id: string, result: unknown) => {
  const message: WorkerResponse = { id, success: true, result };
  self.postMessage(message);
};

const postError = (id: string, error: unknown) => {
  const message: WorkerResponse = {
    id,
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
  self.postMessage(message);
};

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;
  try {
    if (type === 'import-csv') {
      const { csv, projectId, ownerId } = payload as ImportCsvPayload;
      const artifacts = importArtifactsFromCSV(csv, projectId, ownerId);
      postSuccess(id, artifacts);
      return;
    }

    if (type === 'export-csv') {
      const { artifacts, projectName } = payload as ExportCsvPayload;
      const csv = serializeArtifactsToCsv(artifacts);
      postSuccess(id, {
        filename: createCsvFilename(projectName),
        content: csv,
      });
      return;
    }

    if (type === 'build-site') {
      const { project, artifacts } = payload as BuildSitePayload;
      const blob = await buildStaticSiteArchive(project, artifacts);
      const buffer = await blob.arrayBuffer();
      const filename = `${slugify(project.title || 'project') || 'project'}_static_site.zip`;
      const response: WorkerResponse = { id, success: true, result: { filename, buffer } };
      self.postMessage(response, [buffer]);
      return;
    }

    throw new Error(`Unknown worker request type: ${type}`);
  } catch (error) {
    postError(id, error);
  }
});
