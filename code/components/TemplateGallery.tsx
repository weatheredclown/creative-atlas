import React, { useMemo, useState } from 'react';
import { ProjectTemplate, TemplateCategory } from '../types';
import { MagnifyingGlassIcon, SparklesIcon, FolderPlusIcon } from './Icons';

interface TemplateGalleryProps {
  categories: TemplateCategory[];
  projectTemplates: ProjectTemplate[];
  activeProjectTitle?: string;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ categories, projectTemplates, activeProjectTitle }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const templateLookup = useMemo(() => {
    const lookup = new Map<string, ProjectTemplate>();
    projectTemplates.forEach((template) => lookup.set(template.id, template));
    return lookup;
  }, [projectTemplates]);

  const { recommended, others } = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const filtered = categories.filter((category) => {
      if (!normalizedQuery) return true;
      const haystack = [
        category.title,
        category.description,
        ...(category.projectTemplateIds ?? [])
          .map((templateId) => templateLookup.get(templateId)?.name ?? '')
          .filter(Boolean),
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
  }, [categories, searchTerm, activeProjectTitle, templateLookup]);

  const renderCategoryCard = (category: TemplateCategory, isRecommended: boolean) => {
    const relatedProjectTemplates = (category.projectTemplateIds ?? [])
      .map((templateId) => templateLookup.get(templateId))
      .filter((template): template is ProjectTemplate => Boolean(template));

    return (
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
        </div>
        {isRecommended && (
          <span className="text-xs font-semibold uppercase tracking-wide text-cyan-300 bg-cyan-900/50 border border-cyan-700/40 rounded-full px-2 py-1">
            Recommended
          </span>
        )}
      </div>
      {relatedProjectTemplates.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-2">
            <FolderPlusIcon className="w-4 h-4 text-cyan-300" />
            Project Kits Using This Library
          </div>
          <div className="flex flex-wrap gap-2">
            {relatedProjectTemplates.map((template) => (
              <span
                key={template.id}
                className="text-xs font-semibold text-cyan-100 bg-cyan-500/20 border border-cyan-500/40 rounded-full px-2 py-0.5"
              >
                {template.name}
              </span>
            ))}
          </div>
        </div>
      )}
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
    </div>
  );
  };

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
