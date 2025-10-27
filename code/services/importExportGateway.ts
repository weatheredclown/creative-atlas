import type { Artifact, Project } from '../types';

interface WorkerResponse<T = unknown> {
  id: string;
  success: boolean;
  error?: string;
  result?: T;
}

type WorkerRequestType = 'import-csv' | 'export-csv' | 'build-site';

type WorkerResultMap = {
  'import-csv': Artifact[];
  'export-csv': { filename: string; content: string };
  'build-site': { filename: string; buffer: ArrayBuffer };
};

type WorkerPayloadMap = {
  'import-csv': { csv: string; projectId: string; ownerId: string };
  'export-csv': { artifacts: Artifact[]; projectName: string };
  'build-site': { project: Project; artifacts: Artifact[] };
};

const worker = new Worker(new URL('../workers/importExportWorker.ts', import.meta.url), { type: 'module' });

const callWorker = <TType extends WorkerRequestType>(
  type: TType,
  payload: WorkerPayloadMap[TType],
): Promise<WorkerResultMap[TType]> => {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent<WorkerResponse<WorkerResultMap[TType]>>) => {
      if (event.data.id !== id) {
        return;
      }
      worker.removeEventListener('message', handler);
      if (event.data.success) {
        resolve(event.data.result as WorkerResultMap[TType]);
      } else {
        reject(new Error(event.data.error ?? 'Worker operation failed'));
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({ id, type, payload });
  });
};

export const importArtifactsViaWorker = (
  csv: string,
  projectId: string,
  ownerId: string,
): Promise<Artifact[]> => callWorker('import-csv', { csv, projectId, ownerId });

export const exportArtifactsViaWorker = (
  artifacts: Artifact[],
  projectName: string,
): Promise<{ filename: string; content: string }> => callWorker('export-csv', { artifacts, projectName });

export const buildStaticSiteViaWorker = (
  project: Project,
  artifacts: Artifact[],
): Promise<{ filename: string; buffer: ArrayBuffer }> => callWorker('build-site', { project, artifacts });
