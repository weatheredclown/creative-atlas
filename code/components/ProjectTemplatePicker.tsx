import React, { useCallback, useMemo, useState } from 'react';
import { ProjectTemplate, TemplateApplicationSummary, TemplateCategory } from '../types';
import { FolderPlusIcon, SparklesIcon } from './Icons';

interface ProjectTemplatePickerProps {
  templates: ProjectTemplate[];
  categories: TemplateCategory[];
  activeProjectTitle?: string;
  onApplyTemplate: (template: ProjectTemplate) => Promise<TemplateApplicationSummary>;
  isApplyDisabled?: boolean;
}

const ProjectTemplatePicker: React.FC<ProjectTemplatePickerProps> = ({
  templates,
  categories,
  activeProjectTitle,
  onApplyTemplate,
  isApplyDisabled = false,
}) => {
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    | {
        summary: TemplateApplicationSummary;
        kind: 'success' | 'info' | 'error';
        message: string;
      }
    | null
  >(null);

  const categoryIndex = useMemo(() => {
    const index = new Map<string, TemplateCategory>();
    categories.forEach((category) => {
      index.set(category.id, category);
    });
    return index;
  }, [categories]);

  const describeSummary = useCallback(
    (template: ProjectTemplate, summary: TemplateApplicationSummary) => {
      const createdCount = summary.createdTitles.length;
      const skippedCount = summary.skippedTitles.length;

      const parts: string[] = [];
      if (createdCount > 0) {
        parts.push(`${createdCount} ${createdCount === 1 ? 'artifact' : 'artifacts'} created`);
      }
      if (skippedCount > 0) {
        parts.push(`${skippedCount} duplicate${skippedCount === 1 ? '' : 's'} skipped`);
      }

      const xpSnippet = summary.xpAwarded > 0 ? `+${summary.xpAwarded} XP awarded` : 'No XP awarded';
      const activity = parts.length > 0 ? parts.join(' • ') : 'No new artifacts were created';
      return `${template.name}: ${activity} (${xpSnippet})`;
    },
    []
  );

  const handleTemplateApply = useCallback(
    async (template: ProjectTemplate) => {
      if (isApplyDisabled) {
        return;
      }

      setPendingTemplateId(template.id);
      try {
        const summary = await onApplyTemplate(template);
        const kind: 'success' | 'info' = summary.createdTitles.length > 0 ? 'success' : 'info';
        setStatus({
          summary,
          kind,
          message: describeSummary(template, summary),
        });
      } catch (error) {
        console.error('Failed to apply template kit', error);
        setStatus({
          summary: {
            templateId: template.id,
            createdTitles: [],
            skippedTitles: [],
            xpAwarded: 0,
          },
          kind: 'error',
          message: `${template.name}: Something went wrong while applying this kit. Please try again.`,
        });
      } finally {
        setPendingTemplateId(null);
      }
    },
    [describeSummary, isApplyDisabled, onApplyTemplate]
  );

  const { recommended, others } = useMemo(() => {
    if (!activeProjectTitle) {
      return { recommended: [], others: templates };
    }

    const recommendedTemplates = templates.filter((template) =>
      template.recommendedFor?.some((name) => name.toLowerCase() === activeProjectTitle.toLowerCase())
    );
    const recommendedIds = new Set(recommendedTemplates.map((template) => template.id));
    const otherTemplates = templates.filter((template) => !recommendedIds.has(template.id));

    return { recommended: recommendedTemplates, others: otherTemplates };
  }, [templates, activeProjectTitle]);

  const renderTemplateCard = (template: ProjectTemplate, isRecommended: boolean) => {
    const linkedCategories = (template.relatedCategoryIds ?? [])
      .map((categoryId) => categoryIndex.get(categoryId))
      .filter((category): category is TemplateCategory => Boolean(category));
    const isPending = pendingTemplateId === template.id;
    const disabled = isApplyDisabled || isPending;
    const statusForTemplate = status?.summary.templateId === template.id ? status : null;
    const buttonLabel = disabled
      ? isApplyDisabled
        ? 'Select a project to apply'
        : 'Seeding...'
      : `Apply to ${activeProjectTitle ?? 'project'}`;

    return (
      <div
        key={template.id}
        className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 space-y-4 hover:border-cyan-500/50 transition-colors"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div>
              <h4 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                {isRecommended && <SparklesIcon className="w-4 h-4 text-cyan-400" />}
                {template.name}
              </h4>
              <p className="text-sm text-slate-400 mt-1">{template.description}</p>
            </div>
            {linkedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {linkedCategories.map((category) => (
                  <span
                    key={category.id}
                    className="text-[10px] uppercase tracking-wide text-cyan-200 bg-cyan-900/40 border border-cyan-700/40 rounded-full px-2 py-0.5"
                  >
                    {category.title}
                  </span>
                ))}
              </div>
            )}
          </div>
          {template.projectTags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {template.projectTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-900/70 border border-slate-700 rounded-full px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {template.dashboardHints && template.dashboardHints.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Dashboard hints</div>
            <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-slate-300">
              {template.dashboardHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {template.artifacts.map((artifact) => (
            <div key={artifact.title} className="bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2">
              <div className="text-sm font-semibold text-slate-200">{artifact.title}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">{artifact.type}</div>
              <p className="text-xs text-slate-400 mt-1">{artifact.summary}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
          <span>
            Kit XP: {template.xpReward ?? 0} • Artifact XP: {template.artifactXpReward ?? 5}
          </span>
          {isPending && <span className="text-cyan-300 animate-pulse">Seeding…</span>}
        </div>
        <button
          type="button"
          onClick={() => handleTemplateApply(template)}
          disabled={disabled}
          className={`flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors border
          ${disabled
            ? 'cursor-not-allowed text-slate-500 bg-slate-800/80 border-slate-700'
            : 'text-cyan-100 bg-cyan-600/80 hover:bg-cyan-500 border-cyan-500/60'
          }`}
        >
          <FolderPlusIcon className="w-4 h-4" />
          {buttonLabel}
        </button>
        {statusForTemplate && (
          <div
            className={`rounded-lg border px-3 py-3 text-xs space-y-2 ${
              statusForTemplate.kind === 'error'
                ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                : 'border-cyan-500/40 bg-cyan-900/30 text-cyan-100'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide">
              {statusForTemplate.kind === 'error' ? 'Hydration failed' : 'Hydration summary'}
            </div>
            <p className="text-xs leading-relaxed">{statusForTemplate.message}</p>
            {statusForTemplate.summary.createdTitles.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Created</div>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-200">
                  {statusForTemplate.summary.createdTitles.map((title) => (
                    <li key={`created-${title}`}>• {title}</li>
                  ))}
                </ul>
              </div>
            )}
            {statusForTemplate.summary.skippedTitles.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Skipped</div>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                  {statusForTemplate.summary.skippedTitles.map((title) => (
                    <li key={`skipped-${title}`}>• {title}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              XP Awarded: {statusForTemplate.summary.xpAwarded}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wide">
            <SparklesIcon className="w-5 h-5 text-cyan-400" />
            Project Templates
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200 bg-cyan-900/40 border border-cyan-700/50 rounded-full px-3 py-1">
            Multi-artifact kit
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Hydrate an entire project with dashboards, quests, and starter artifacts in one click. Apply a kit to fill gaps without overwriting the custom work you have already done.
        </p>
        <p className="text-xs text-slate-500">
          Looking for single artifacts to mix and match? Browse the Template Library next door.
        </p>
      </header>

      {recommended.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">Tailored for {activeProjectTitle}</div>
          <div className="space-y-4">
            {recommended.map((template) => renderTemplateCard(template, true))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {recommended.length > 0 && (
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">More kits</div>
        )}
        <div className="space-y-4">
          {others.map((template) => renderTemplateCard(template, false))}
        </div>
      </div>
    </section>
  );
};

export default ProjectTemplatePicker;
