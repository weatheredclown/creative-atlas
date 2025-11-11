import React, { useEffect, useMemo, useState } from 'react';

interface WorkspaceSectionIndexProps {
  sections: Array<{ id: string; label: string }>;
}

const WorkspaceSectionIndex: React.FC<WorkspaceSectionIndexProps> = ({ sections }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  useEffect(() => {
    if (sectionIds.length === 0) {
      return;
    }

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setActiveSection((previous) => previous ?? sectionIds[0]);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (visibleSection?.target?.id) {
          setActiveSection(visibleSection.target.id);
        }
      },
      {
        rootMargin: '-40% 0px -50% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sectionIds]);

  useEffect(() => {
    if (sections.length === 0) {
      setActiveSection(null);
      return;
    }

    if (!sections.some((section) => section.id === activeSection)) {
      setActiveSection(sections[0]?.id ?? null);
    }
  }, [sections, activeSection]);

  if (sections.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Workspace sections" className="sticky top-20 z-20 mb-6">
      <div className="overflow-x-auto rounded-full border border-slate-700/60 bg-slate-900/80 px-4 py-2 shadow-lg shadow-slate-950/30 backdrop-blur">
        <ul className="flex flex-nowrap items-center gap-2 text-sm text-slate-300">
          {sections.map((section) => {
            const isActive = section.id === activeSection;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    isActive
                      ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100 shadow-inner shadow-cyan-500/10'
                      : 'border-transparent text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{section.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default WorkspaceSectionIndex;
