import type { IssueData, ReleaseData, RepositoryData } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  default_branch: string;
  language: string | null;
  open_issues_count: number;
}

interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  user: { login: string };
  labels: { name?: string }[];
  comments: number;
  pull_request?: unknown;
}

interface GitHubReleaseResponse {
  id: number;
  name: string | null;
  tag_name: string;
  body: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  author: { login: string };
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${details || response.statusText}`);
  }

  return response.json() as Promise<T>;
};

export const fetchRepository = async (owner: string, repo: string): Promise<RepositoryData & { id: number; name: string; description: string | null; htmlUrl: string; }> => {
  const data = await fetchJson<GitHubRepoResponse>(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    htmlUrl: data.html_url,
    url: data.html_url,
    stars: data.stargazers_count,
    forks: data.forks_count,
    watchers: data.watchers_count,
    defaultBranch: data.default_branch,
    language: data.language ?? undefined,
    openIssues: data.open_issues_count,
  };
};

export const fetchIssues = async (owner: string, repo: string, perPage = 10): Promise<(IssueData & { id: number; title: string; summary: string })[]> => {
  const issues = await fetchJson<GitHubIssueResponse[]>(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=${perPage}`);
  return issues
    .filter(issue => !('pull_request' in issue))
    .map(issue => ({
      id: issue.id,
      title: issue.title,
      summary: issue.body ?? '',
      number: issue.number,
      url: issue.html_url,
      state: issue.state,
      author: issue.user?.login ?? 'unknown',
      labels: issue.labels?.map(label => label.name ?? '').filter(Boolean) ?? [],
      comments: issue.comments,
    }));
};

export const fetchReleases = async (owner: string, repo: string, perPage = 5): Promise<(ReleaseData & { id: number; title: string; summary: string })[]> => {
  const releases = await fetchJson<GitHubReleaseResponse[]>(`${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=${perPage}`);
  return releases.map(release => ({
    id: release.id,
    title: release.name ?? release.tag_name,
    summary: release.body ?? '',
    tagName: release.tag_name,
    url: release.html_url,
    publishedAt: release.published_at ?? undefined,
    author: release.author?.login ?? 'unknown',
    draft: release.draft,
    prerelease: release.prerelease,
  }));
};
