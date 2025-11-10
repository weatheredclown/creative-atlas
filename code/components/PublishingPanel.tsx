import React from 'react';

import { ProjectPublishRecord } from '../utils/publishHistory';
import { BuildingStorefrontIcon, GitHubIcon, GlobeAltIcon, MegaphoneIcon } from './Icons';

interface PublishingPanelProps {
  publishHistoryRecord: ProjectPublishRecord | null;
  lastPublishedAtLabel: string | null;
  canPublishToGitHub: boolean;
  onPublishProject: () => void;
  onStartGitHubPublish: () => Promise<void>;
}

const PublishingPanel: React.FC<PublishingPanelProps> = ({
  publishHistoryRecord,
  lastPublishedAtLabel,
  canPublishToGitHub,
  onPublishProject,
  onStartGitHubPublish,
}) => {
  return (
    <section
      id="publishing"
      className="space-y-5 rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-slate-950/90 via-slate-900 to-slate-950/90 p-6 shadow-xl shadow-cyan-900/20 xl:sticky xl:top-24"
    >
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
          <MegaphoneIcon className="h-4 w-4" />
          Release &amp; publish
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-50">Share Creative Atlas updates with confidence</h3>
          <p className="text-sm text-slate-300">
            Draft narrative release notes with Release Bard, then publish the latest build to your live site or GitHub Pages.
          </p>
        </div>
      </header>

      {publishHistoryRecord ? (
        <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <GlobeAltIcon className="h-5 w-5 flex-shrink-0 text-cyan-200" />
              <div className="space-y-1">
                <p className="font-semibold text-cyan-100">Latest live deployment</p>
                <p className="text-xs text-cyan-100/80">
                  {publishHistoryRecord.repository}
                  {publishHistoryRecord.publishDirectory ? ` · ${publishHistoryRecord.publishDirectory}` : ''}
                  {lastPublishedAtLabel ? ` · Published ${lastPublishedAtLabel}` : ''}
                </p>
                <a
                  href={publishHistoryRecord.pagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all text-xs font-medium text-cyan-50 underline"
                >
                  {publishHistoryRecord.pagesUrl}
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={publishHistoryRecord.pagesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-50 transition-colors hover:bg-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-200/60 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Visit live site
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deployment checklist</p>
        <ul className="space-y-2 text-xs text-slate-400">
          <li>• Use Release Bard to highlight what changed in this milestone.</li>
          <li>• Publish the static site for quick previews or demos.</li>
          <li>• Connect GitHub Pages to ship a persistent live atlas.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onPublishProject}
          className="flex items-center gap-2 rounded-md border border-slate-600/70 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
          type="button"
        >
          <BuildingStorefrontIcon className="h-5 w-5" />
          Publish Site
        </button>
        <button
          onClick={() => {
            void onStartGitHubPublish();
          }}
          className="flex items-center gap-2 rounded-md border border-slate-600/70 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={!canPublishToGitHub}
          title={
            canPublishToGitHub ? 'Publish to GitHub Pages' : 'Sign in and connect the data API to publish to GitHub.'
          }
        >
          <GitHubIcon className="h-5 w-5" />
          Publish to GitHub
        </button>
      </div>
    </section>
  );
};

export default PublishingPanel;

