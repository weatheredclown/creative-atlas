import React, { useMemo } from 'react';
import { ProjectTemplate, TemplateCategory } from '../types';
import { FolderPlusIcon, SparklesIcon } from './Icons';

interface ProjectTemplatePickerProps {
  templates: ProjectTemplate[];
  categories: TemplateCategory[];
  activeProjectTitle?: string;
  onApplyTemplate: (template: ProjectTemplate) => void;
  isApplyDisabled?: boolean;
}

const ProjectTemplatePicker: React.FC<ProjectTemplatePickerProps> = ({
  templates,
  categories,
  activeProjectTitle,
  onApplyTemplate,
  isApplyDisabled = false,
}) => {
  const categoryIndex = useMemo(() => {
    const index = new Map<string, TemplateCategory>();
    categories.forEach((category) => {
      index.set(category.id, category);
    });
    return index;
  }, [categories]);

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

        <div className="space-y-3">
          {template.artifacts.map((artifact) => (
            <div key={artifact.title} className="bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2">
              <div className="text-sm font-semibold text-slate-200">{artifact.title}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">{artifact.type}</div>
              <p className="text-xs text-slate-400 mt-1">{artifact.summary}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onApplyTemplate(template)}
          disabled={isApplyDisabled}
          className={`flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors border
          ${isApplyDisabled
            ? 'cursor-not-allowed text-slate-500 bg-slate-800/80 border-slate-700'
            : 'text-cyan-100 bg-cyan-600/80 hover:bg-cyan-500 border-cyan-500/60'
          }`}
        >
          <FolderPlusIcon className="w-4 h-4" />
          {isApplyDisabled ? 'Select a project to apply' : `Apply to ${activeProjectTitle ?? 'project'}`}
        </button>
      </div>
    );
  };

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wide">
          <SparklesIcon className="w-5 h-5 text-cyan-400" />
          Project Templates
        </div>
        <p className="text-sm text-slate-400">
          Drop in curated starter artifacts to hydrate dashboards instantly. Existing entries are preserved—new templates only add what&apos;s missing.
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
