import React, { useMemo, useState } from 'react';

import { ProjectTemplate, TemplateCategory, TemplateEntry } from '../types';
import { SparklesIcon, TableCellsIcon, ViewColumnsIcon } from './Icons';
import Modal from './Modal';
import ProjectTemplatePicker from './ProjectTemplatePicker';
import TemplateGallery from './TemplateGallery';

interface TemplateWorkspaceProps {
  projectTitle: string;
  projectTemplates: ProjectTemplate[];
  templateCategories: TemplateCategory[];
  onApplyTemplate: (template: ProjectTemplate) => void;
  onSelectTemplate: (template: TemplateEntry) => void;
}

const TemplateWorkspace: React.FC<TemplateWorkspaceProps> = ({
  projectTitle,
  projectTemplates,
  templateCategories,
  onApplyTemplate,
  onSelectTemplate,
}) => {
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const templateStats = useMemo(() => {
    const categoryCount = templateCategories.length;
    const blueprintCount = templateCategories.reduce((total, category) => total + category.templates.length, 0);

    return { categoryCount, blueprintCount };
  }, [templateCategories]);

  return (
    <section id="templates" className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
          <ViewColumnsIcon className="h-4 w-4" />
          Templates &amp; blueprints
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-slate-100">Jumpstart your project with curated kits</h3>
            <p className="text-sm text-slate-400">
              Explore multi-artifact project kits or pick individual artifact blueprints tailored to {projectTitle}.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700/60 bg-slate-800/80 px-3 py-1 font-semibold uppercase tracking-wide">
              {projectTemplates.length} project kits
            </span>
            <span className="rounded-full border border-slate-700/60 bg-slate-800/80 px-3 py-1 font-semibold uppercase tracking-wide">
              {templateStats.blueprintCount} blueprints · {templateStats.categoryCount} categories
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-200">
              <SparklesIcon className="h-5 w-5" />
              Project template kits
            </div>
            <p className="text-sm text-slate-300">
              Apply a themed kit to weave in dashboards, quests, and fully linked artifacts without overwriting your custom work.
            </p>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>• Recommended picks adapt to your world&apos;s title.</li>
              <li>• Preview contents before committing to a kit.</li>
              <li>• Re-run a kit later to fill in missing coverage.</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setIsKitModalOpen(true)}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/50 bg-cyan-600/80 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-cyan-50 transition-colors hover:bg-cyan-500"
          >
            Explore project kits
          </button>
        </article>

        <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-200">
              <TableCellsIcon className="h-5 w-5" />
              Artifact template library
            </div>
            <p className="text-sm text-slate-300">
              Browse modular blueprints across lore, characters, quests, and more. Mix and match to expand the project a la carte.
            </p>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>• Filter by category, tags, or search keywords.</li>
              <li>• Collapse categories to focus on what matters.</li>
              <li>• See which project kits bundle each blueprint.</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setIsLibraryModalOpen(true)}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border border-slate-600/70 bg-slate-800/80 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-100 transition-colors hover:bg-slate-700"
          >
            Browse template library
          </button>
        </article>
      </div>

      <Modal
        isOpen={isKitModalOpen}
        onClose={() => setIsKitModalOpen(false)}
        title="Explore project template kits"
        maxWidthClassName="max-w-5xl"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <ProjectTemplatePicker
            templates={projectTemplates}
            categories={templateCategories}
            activeProjectTitle={projectTitle}
            onApplyTemplate={onApplyTemplate}
            isApplyDisabled={false}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        title="Browse template library"
        maxWidthClassName="max-w-5xl"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <TemplateGallery
            categories={templateCategories}
            projectTemplates={projectTemplates}
            activeProjectTitle={projectTitle}
            onSelectTemplate={onSelectTemplate}
          />
        </div>
      </Modal>
    </section>
  );
};

export default TemplateWorkspace;

