import React, { useMemo, useState } from 'react';
import { Artifact, ArtifactType } from '../types';
import { fetchIssues, fetchReleases, fetchRepository } from '../services/githubService';
import { LinkIcon, Spinner } from './Icons';

interface GitHubImportPanelProps {
  projectId: string;
  ownerId: string;
  existingArtifacts: Artifact[];
  onArtifactsImported: (artifacts: Artifact[]) => Promise<void> | void;
  addXp: (amount: number) => void;
}

interface RepoCoordinates {
  owner: string;
  repo: string;
}

const parseRepoInput = (input: string): RepoCoordinates | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const sanitized = trimmed
    .replace(/^https?:\/\/github.com\//i, '')
    .replace(/\.git$/, '')
    .trim();

  const [owner, repo, ...rest] = sanitized.split('/').filter(Boolean);
  if (!owner || !repo || rest.length > 0) {
    return null;
  }

  return { owner, repo };
};

const GitHubImportPanel: React.FC<GitHubImportPanelProps> = ({ projectId, ownerId, existingArtifacts, onArtifactsImported, addXp }) => {
  const [repoInput, setRepoInput] = useState('');
  const [includeIssues, setIncludeIssues] = useState(true);
  const [includeReleases, setIncludeReleases] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const existingIds = useMemo(() => new Set(existingArtifacts.map(artifact => artifact.id)), [existingArtifacts]);

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setImportSummary(null);

    const coords = parseRepoInput(repoInput);
    if (!coords) {
      setError('Enter a repository in the form "owner/name" or paste a GitHub URL.');
      return;
    }

    setIsLoading(true);
    try {
      const repoData = await fetchRepository(coords.owner, coords.repo);

      const repoArtifactId = `github-repo-${repoData.id}`;
      const newArtifacts: Artifact[] = [];

      if (!existingIds.has(repoArtifactId)) {
        newArtifacts.push({
          id: repoArtifactId,
          ownerId,
          projectId,
          type: ArtifactType.Repository,
          title: repoData.name,
          summary: repoData.description ?? 'Imported from GitHub.',
          status: 'active',
          tags: ['github', 'repository'],
          relations: [],
          data: {
            url: repoData.url,
            stars: repoData.stars,
            forks: repoData.forks,
            watchers: repoData.watchers,
            defaultBranch: repoData.defaultBranch,
            language: repoData.language,
            openIssues: repoData.openIssues,
          },
        });
      }

      if (includeIssues) {
        const issues = await fetchIssues(coords.owner, coords.repo, 15);
        issues.forEach(issue => {
          const issueId = `github-issue-${issue.id}`;
          if (existingIds.has(issueId)) {
            return;
          }
          newArtifacts.push({
            id: issueId,
            ownerId,
            projectId,
            type: ArtifactType.Issue,
            title: issue.title,
            summary: issue.summary,
            status: issue.state === 'open' ? 'active' : issue.state,
            tags: ['github', 'issue'],
            relations: [{ kind: 'RELATES_TO', toId: repoArtifactId }],
            data: {
              number: issue.number,
              url: issue.url,
              state: issue.state,
              author: issue.author,
              labels: issue.labels,
              comments: issue.comments,
            },
          });
        });
      }

      if (includeReleases) {
        const releases = await fetchReleases(coords.owner, coords.repo, 10);
        releases.forEach(release => {
          const releaseId = `github-release-${release.id}`;
          if (existingIds.has(releaseId)) {
            return;
          }
          newArtifacts.push({
            id: releaseId,
            ownerId,
            projectId,
            type: ArtifactType.Release,
            title: release.title,
            summary: release.summary,
            status: 'shipped',
            tags: ['github', 'release'],
            relations: [{ kind: 'RELATES_TO', toId: repoArtifactId }],
            data: {
              tagName: release.tagName,
              url: release.url,
              publishedAt: release.publishedAt,
              author: release.author,
              draft: release.draft,
              prerelease: release.prerelease,
            },
          });
        });
      }

      if (newArtifacts.length === 0) {
        setImportSummary('No new GitHub artifacts were added. Everything appears to be up to date.');
        return;
      }

      await onArtifactsImported(newArtifacts);
      const xpAward = Math.min(25, Math.max(8, newArtifacts.length * 3));
      addXp(xpAward);
      setImportSummary(`Imported ${newArtifacts.length} artifact${newArtifacts.length === 1 ? '' : 's'} from GitHub (+${xpAward} XP).`);
      setRepoInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-slate-200">
        <LinkIcon className="w-5 h-5 text-cyan-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">GitHub Import</h3>
      </div>
      <p className="text-sm text-slate-400">
        Sync repository metadata, open issues, and recent releases into your project workspace.
      </p>
      <form onSubmit={handleImport} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="github-repo" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Repository
          </label>
          <input
            id="github-repo"
            type="text"
            value={repoInput}
            onChange={(event) => setRepoInput(event.target.value)}
            placeholder="owner/repo or https://github.com/owner/repo"
            className="w-full rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              checked={includeIssues}
              onChange={(event) => setIncludeIssues(event.target.checked)}
            />
            Issues
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              checked={includeReleases}
              onChange={(event) => setIncludeReleases(event.target.checked)}
            />
            Releases
          </label>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {importSummary && <p className="text-sm text-emerald-300">{importSummary}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-75"
        >
          {isLoading ? <Spinner className="w-4 h-4" /> : null}
          {isLoading ? 'Importing…' : 'Import from GitHub'}
        </button>
      </form>
    </div>
  );
};

export default GitHubImportPanel;
