import React, { useCallback, useMemo, useState } from 'react';
import { ProjectTemplate, TemplateCategory, TemplateEntry } from '../types';
import { ChevronDownIcon, MagnifyingGlassIcon, SparklesIcon } from './Icons';
import Zippy from './Zippy';

interface TemplateGalleryProps {
  categories: TemplateCategory[];
  projectTemplates: ProjectTemplate[];
  activeProjectTitle?: string;
  onSelectTemplate: (template: TemplateEntry) => void;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  categories,
  projectTemplates,
  activeProjectTitle,
  onSelectTemplate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);

  const projectTemplateIndex = useMemo(() => {
    const index = new Map<string, ProjectTemplate>();
    projectTemplates.forEach((template) => {
      index.set(template.id, template);
    });
    return index;
  }, [projectTemplates]);

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

  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => new Set());

  const toggleCategoryExpansion = useCallback((categoryId: string) => {
    setExpandedCategoryIds((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const renderCategoryCard = (category: TemplateCategory, isRecommended: boolean) => {
    const linkedProjectTemplates = (category.relatedProjectTemplateIds ?? [])
      .map((templateId) => projectTemplateIndex.get(templateId))
      .filter((template): template is ProjectTemplate => Boolean(template));

    const isExpanded = expandedCategoryIds.has(category.id);
    const contentId = `template-category-${category.id}`;
    const templateCount = category.templates.length;

    return (
      <div
        key={category.id}
        className="flex h-full flex-col justify-between space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 transition-colors hover:border-cyan-500/60"
      >
        <button
          type="button"
          onClick={() => toggleCategoryExpansion(category.id)}
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={isExpanded}
          aria-controls={contentId}
        >
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              {isRecommended && <SparklesIcon className="w-4 h-4 text-cyan-400" />}
              {category.title}
            </h4>
            <p className="text-sm text-slate-400 mt-1">{category.description}</p>
            <p className="text-xs text-slate-500 mt-2">
              {templateCount} {templateCount === 1 ? 'template' : 'templates'} available
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isRecommended && (
              <span className="text-xs font-semibold uppercase tracking-wide text-cyan-300 bg-cyan-900/50 border border-cyan-700/40 rounded-full px-2 py-1">
                Recommended
              </span>
            )}
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {isExpanded ? 'Hide templates' : 'Show templates'}
              <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </span>
          </div>
        </button>
        <Zippy isOpen={isExpanded} id={contentId} className="w-full">
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {category.templates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-left w-full hover:bg-slate-700/50 transition-colors"
                >
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
                </button>
              ))}
            </div>
            {linkedProjectTemplates.length > 0 && (
              <div className="pt-3 border-t border-slate-800/60">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Bundled in project templates</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {linkedProjectTemplates.map((template) => (
                    <span
                      key={template.id}
                      className="text-[10px] uppercase tracking-wide text-cyan-200 bg-cyan-900/40 border border-cyan-700/40 rounded-full px-2 py-0.5"
                    >
                      {template.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Zippy>
      </div>
    );
  };

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wide">
            <SparklesIcon className="w-5 h-5 text-cyan-400" />
            Template Library
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200 bg-amber-900/30 border border-amber-700/50 rounded-full px-3 py-1">
              Artifact blueprints
            </span>
            <button
              type="button"
              onClick={() => setIsLibraryOpen((previous) => !previous)}
              className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300"
              aria-expanded={isLibraryOpen}
              aria-controls="template-library-content"
            >
              {isLibraryOpen ? 'Hide library' : 'Show library'}
              <ChevronDownIcon
                className={`w-4 h-4 text-slate-400 transition-transform ${isLibraryOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          Drop in single artifacts to expand a project a la carte. Each blueprint mirrors the categories above but won&apos;t touch dashboards or quests.
        </p>
        <p className="text-xs text-slate-500">
          Want a whole world scaffolded at once? Use the Project Templates kits before dipping into the library.
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

      <Zippy isOpen={isLibraryOpen} id="template-library-content" className="space-y-6">
        {recommended.length > 0 && (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">Tailored for {activeProjectTitle}</div>
            <div className="grid gap-4 lg:grid-cols-2">
              {recommended.map((category) => renderCategoryCard(category, true))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {recommended.length > 0 && (
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">More creative kits</div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {others.map((category) => renderCategoryCard(category, false))}
            {recommended.length === 0 && others.length === 0 && (
              <p className="col-span-full text-sm text-slate-500">
                No templates match that search just yet. Try a different keyword.
              </p>
            )}
          </div>
        </div>
      </Zippy>
    </section>
  );
};

export default TemplateGallery;
