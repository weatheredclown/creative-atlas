import React from 'react';
import { getSupportContent } from '../utils/supportContent';
import { TutorialLanguage } from '../types';

interface OnboardingBannerProps {
  language: TutorialLanguage;
  onDismiss?: () => void;
}

const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ language, onDismiss }) => {
  const { onboardingBanner } = getSupportContent(language);

  return (
    <section
      className="lg:col-span-12 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-4 sm:px-6 sm:py-5"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 text-sm text-cyan-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">{onboardingBanner.headline}</p>
            <h2 className="text-base font-semibold text-white sm:text-lg">{onboardingBanner.subheading}</h2>
          </div>
          <p className="text-sm text-cyan-100/90 sm:max-w-3xl">{onboardingBanner.description}</p>
          <a
            href={onboardingBanner.learnMoreHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-100 transition hover:border-cyan-300/70 hover:text-white"
          >
            {onboardingBanner.learnMoreLabel}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="self-start rounded-md border border-transparent px-2 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-500/10"
          >
            {onboardingBanner.dismissLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default OnboardingBanner;

