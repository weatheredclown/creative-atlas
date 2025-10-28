import React, { useMemo, useState } from 'react';
import { TemplateCategory } from '../types';
import { MagnifyingGlassIcon, SparklesIcon } from './Icons';

interface TemplateGalleryProps {
  categories: TemplateCategory[];
  activeProjectTitle?: string;
  onApplyTemplate?: (category: TemplateCategory) => TemplateApplyResult;
  canApply?: boolean;
}

interface TemplateApplyResult {
  createdCount: number;
  skippedCount: number;
  message: string;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ categories, activeProjectTitle, onApplyTemplate, canApply }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackByCategory, setFeedbackByCategory] = useState<Record<string, TemplateApplyResult>>({});

  const { recommended, others } = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const filtered = categories.filter((category) => {
      if (!normalizedQuery) return true;
      const haystack = [
        category.title,
        category.description,
        ...category.templates.map((template) => `${template.name} ${template.description} ${template.tags?.join(' ') ?? ''}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    if (!activeProjectTitle) {
      return {
        recommended: [],
        others: filtered,
      };
    }

    const recommendedCategories = filtered.filter((category) =>
      category.recommendedFor.some((name) => name.toLowerCase() === activeProjectTitle.toLowerCase())
    );
    const recommendedIds = new Set(recommendedCategories.map((category) => category.id));
    const otherCategories = filtered.filter((category) => !recommendedIds.has(category.id));

    return {
      recommended: recommendedCategories,
      others: otherCategories,
    };
  }, [categories, searchTerm, activeProjectTitle]);

  const handleApply = (category: TemplateCategory) => {
    if (!onApplyTemplate) return;
    const result = onApplyTemplate(category);
    setFeedbackByCategory((current) => ({ ...current, [category.id]: result }));
  };

  const renderCategoryCard = (category: TemplateCategory, isRecommended: boolean) => (
    <div
      key={category.id}
      className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 space-y-3 hover:border-cyan-500/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            {isRecommended && <SparklesIcon className="w-4 h-4 text-cyan-400" />}
            {category.title}
          </h4>
          <p className="text-sm text-slate-400 mt-1">{category.description}</p>
          {category.dashboardHints && category.dashboardHints.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {category.dashboardHints.map((hint) => (
                <span
                  key={hint}
                  className="text-[10px] uppercase tracking-wide text-cyan-200/80 bg-cyan-900/30 border border-cyan-700/30 rounded-full px-2 py-0.5"
                >
                  {hint}
                </span>
              ))}
            </div>
          )}
        </div>
        {isRecommended && (
          <span className="text-xs font-semibold uppercase tracking-wide text-cyan-300 bg-cyan-900/50 border border-cyan-700/40 rounded-full px-2 py-1">
            Recommended
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {category.templates.map((template) => (
          <div key={template.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
            <h5 className="text-sm font-semibold text-slate-200">{template.name}</h5>
            <p className="text-xs text-slate-400 mt-1">{template.description}</p>
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-900/60 border border-slate-700 rounded-full px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800/60 pt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Starter seeds</span>
          <button
            type="button"
            onClick={() => handleApply(category)}
            disabled={!canApply || !onApplyTemplate || category.starterArtifacts.length === 0}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-cyan-600/40 bg-cyan-600/10 text-cyan-200 hover:bg-cyan-600/20 hover:border-cyan-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={canApply ? undefined : 'Select a project to apply a template kit.'}
          >
            Apply kit
          </button>
        </div>
        <ul className="space-y-2">
          {category.starterArtifacts.map((seed) => (
            <li
              key={`${category.id}-${seed.title}`}
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{seed.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{seed.summary}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-900/60 border border-slate-700 rounded-full px-2 py-0.5">
                  {seed.type}
                </span>
              </div>
              {seed.tags && seed.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {seed.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-900/60 border border-slate-700 rounded-full px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
          {category.starterArtifacts.length === 0 && (
            <li className="text-xs text-slate-500">Template kit coming soon.</li>
          )}
        </ul>
        {feedbackByCategory[category.id] && (
          <div className="text-xs text-cyan-200 bg-cyan-900/30 border border-cyan-700/40 rounded-md px-3 py-2">
            {feedbackByCategory[category.id].message}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wide">
          <SparklesIcon className="w-5 h-5 text-cyan-400" />
          Template Library
        </div>
        <p className="text-sm text-slate-400">
          Jump-start new artifacts with ready-made scaffolds tuned for recurring universes and genres. Search or pick from the
          curated sets below.
        </p>
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search templates..."
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          />
        </div>
      </header>

      {recommended.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">Tailored for {activeProjectTitle}</div>
          <div className="space-y-4">
            {recommended.map((category) => renderCategoryCard(category, true))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {recommended.length > 0 && (
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">More creative kits</div>
        )}
        <div className="space-y-4">
          {others.map((category) => renderCategoryCard(category, false))}
          {recommended.length === 0 && others.length === 0 && (
            <p className="text-sm text-slate-500">No templates match that search just yet. Try a different keyword.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default TemplateGallery;
