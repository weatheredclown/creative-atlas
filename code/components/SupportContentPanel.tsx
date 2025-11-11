import React from 'react';
import { getSupportContent } from '../utils/supportContent';
import { TutorialLanguage } from '../types';

interface SupportContentPanelProps {
  language: TutorialLanguage;
  onStartTutorial: () => void;
}

const SupportContentPanel: React.FC<SupportContentPanelProps> = ({ language, onStartTutorial }) => {
  const supportContent = getSupportContent(language);

  return (
    <section className="space-y-4 rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
          {supportContent.documentationHub.title}
        </p>
        <p className="text-sm text-slate-300">{supportContent.documentationHub.description}</p>
      </header>
      <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide">
        <a
          href={supportContent.documentationHub.ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-500/20 hover:text-white"
        >
          {supportContent.documentationHub.ctaLabel}
          <span aria-hidden="true">↗</span>
        </a>
        <button
          type="button"
          onClick={onStartTutorial}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
        >
          {supportContent.documentationHub.restartTutorialLabel}
        </button>
      </div>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {supportContent.faqSectionTitle}
        </h3>
        <div className="space-y-2">
          {supportContent.faqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-md border border-slate-700/60 bg-slate-900/60 p-3 text-sm text-slate-200"
            >
              <summary className="cursor-pointer list-none font-semibold text-slate-100 transition group-open:text-cyan-200">
                {faq.question}
              </summary>
              <p className="mt-2 text-xs text-slate-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SupportContentPanel;

