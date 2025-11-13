export interface SupportFaqEntry {
  id: string;
  question: string;
  answer: string;
  relatedFeatures: string[];
  recommendedNextSteps: string[];
  tags: string[];
}

export const supportFaqEntries: SupportFaqEntry[] = [
  {
    id: 'faq-stage-filter',
    question: 'How do I focus the graph on characters in a specific arc stage?',
    answer:
      'Open the Arc Stage Spotlight panel above the relationship graph and choose the stage you want to study. Characters in that phase stay vivid while every other node dims so you can trace the supporting lore.',
    relatedFeatures: ['GraphView', 'Character progression', 'Arc stage spotlight'],
    recommendedNextSteps: [
      'Use the relation menu on a highlighted character to connect allies, rivals, or key locations.',
      'Capture new arc checkpoints from the character detail panel so the stage spotlight stays up to date.',
    ],
    tags: ['graph', 'story-structure', 'progression'],
  },
  {
    id: 'faq-collaboration',
    question: 'What happens when multiple editors work on the same artifact?',
    answer:
      'Creative Atlas queues edits through the collaboration gateway so everyone sees the latest version. Presence cursors help teammates avoid conflicting changes while patches are applied in order.',
    relatedFeatures: ['Collaboration gateway', 'Realtime presence'],
    recommendedNextSteps: [
      'Invite collaborators from the project header and open the same artifact.',
      'Watch for colored cursors that show where teammates are editing in real time.',
    ],
    tags: ['collaboration', 'realtime'],
  },
  {
    id: 'faq-dialogue-forge',
    question: 'How can I control Dialogue Forge prompts so they stay on brief?',
    answer:
      'Keep prompts concise and use the cast selector to supply character bios. Dialogue Forge automatically trims bios, prompts, and beat descriptions before sending them to Gemini.',
    relatedFeatures: ['Dialogue Forge', 'Atlas Intelligence'],
    recommendedNextSteps: [
      'Select only the characters appearing in the scene to keep prompts focused.',
      'Review the generated beat suggestions and copy the ones you want into your scene template.',
    ],
    tags: ['ai', 'dialogue'],
  },
  {
    id: 'faq-publish-status',
    question: 'Where can I check the status of a GitHub publish job?',
    answer:
      'After triggering a publish, copy the job identifier returned by the API and poll the `/api/github/publish/status/:jobId` endpoint. It reports whether the job is queued, running, finished, or failed.',
    relatedFeatures: ['GitHub publish', 'Operational dashboards'],
    recommendedNextSteps: [
      'Display publish job progress inside the workspace header.',
      'Surface the last successful publish timestamp for each project.',
    ],
    tags: ['operations', 'publishing'],
  },
  {
    id: 'faq-offline-drafts',
    question: 'Can I keep drafting when my connection drops?',
    answer:
      'Yes. Enable offline caching in settings so Creative Atlas saves your open artifacts locally. When the network returns, your drafts sync back to the server without losing edits.',
    relatedFeatures: ['Offline caching', 'Draft sync'],
    recommendedNextSteps: [
      'Toggle offline caching in the workspace settings panel.',
      'Check the sync queue indicator in the header to monitor pending updates.',
    ],
    tags: ['offline', 'reliability'],
  },
];
