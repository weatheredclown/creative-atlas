import React from 'react';

const TermsOfService: React.FC = () => {
  const lastUpdated = 'May 28, 2024';

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-cyan-300">Creative Atlas Terms of Service</h1>
          <p className="text-sm text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Acceptance of terms</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            By accessing Creative Atlas you agree to these Terms of Service. If you do not agree with any part of the terms you
            must not use the service.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">2. Accounts and eligibility</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            You must be at least 13 years old to maintain an account. You are responsible for maintaining the confidentiality of
            your login credentials and for all activities that occur under your account.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">3. Data we collect and how we use it</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
            <li>
              <strong className="text-slate-100">Account details:</strong> When you create an account we store the email address,
              display name, and avatar you provide so we can authenticate you and personalize the experience.
            </li>
            <li>
              <strong className="text-slate-100">Workspace content:</strong> Your projects, artifacts, lexicon entries, and any
              other creative data you save in Creative Atlas are stored so that you can access, edit, and export them later.
            </li>
            <li>
              <strong className="text-slate-100">Service activity:</strong> We may collect non-identifying usage information such
              as timestamps and feature interactions to improve reliability and plan future updates.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-slate-300">
            We keep your information for as long as your account remains active. We do not sell your data. We only use the
            information you store to operate Creative Atlas features or when required by law.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">4. Data retention and deletion</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Your Creative Atlas information is retained until you delete your account. When you confirm deletion of your account
            inside the application we permanently remove your profile, all projects, artifacts, and any other stored content from
            our systems. This process cannot be reversed and you are solely responsible for exporting any data you want to keep
            beforehand.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">5. AI-assisted features</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Creative Atlas offers optional AI-assisted tools. When you use these features, the relevant content from your
            workspace may be sent to Google&apos;s Gemini models so the feature can generate suggestions. Use of the AI features is
            governed by the{' '}
            <a
              href="https://ai.google.dev/terms"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline decoration-dotted underline-offset-4 hover:text-cyan-200"
            >
              Gemini Terms of Service
            </a>
            , and by enabling the AI tools you consent to that processing and to those third-party terms.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">6. Acceptable use</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            You agree not to misuse Creative Atlas, including attempting to interfere with normal operation, reverse engineering
            protected portions of the service, or storing content that is unlawful or infringes on the rights of others. We may
            suspend or terminate accounts that violate these rules.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">7. Limitation of liability</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Creative Atlas is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted by law we are not
            liable for any indirect, incidental, or consequential damages arising from your use of the service.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">8. Changes to these terms</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            We may update these Terms of Service from time to time. We will post the revised terms in the application with an
            updated &ldquo;Last updated&rdquo; date. Your continued use of Creative Atlas after any change constitutes acceptance of the new
            terms.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40 space-y-4">
          <h2 className="text-xl font-semibold text-white">9. Contact</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            If you have questions about these terms or about how we handle your data, email us at{' '}
            <a
              href="mailto:tim.laubach@gmail.com"
              className="text-cyan-300 underline decoration-dotted underline-offset-4 hover:text-cyan-200"
            >
              tim.laubach@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
