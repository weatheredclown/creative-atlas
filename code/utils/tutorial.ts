import { TutorialStep } from '../types';

export const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Creative Atlas!',
    explanation:
      "This guided tour will help you spin up your first world, link its lore, and publish it for collaborators.",
    action: 'Open the create project menu',
    target: '#create-new-project-button',
    showNextButton: true,
  },
  {
    title: 'Name your world',
    explanation:
      "Give your world a title and summary. We prefilled the Aethelgard example so you can review the fields before submitting.",
    action: 'Review and create the project',
    target: '#create-project-form',
    advanceEvent: 'submit',
    prefill: {
      '#project-title': 'Aethelgard',
      '#project-summary':
        'Aethelgard is a realm where fading magic collides with clockwork ingenuity. Use this tutorial project as your sandbox.',
    },
  },
  {
    title: 'Tour the world hub',
    explanation:
      "The hero panel summarizes tags, XP, and quick stats. Use these badges to understand the health of your world at a glance.",
    action: 'Explore the hero stats below',
    target: '#project-hero-panel',
    showNextButton: true,
  },
  {
    title: 'Seed your first artifact',
    explanation:
      "Artifacts store the stories, locations, mechanics, and relationships that define your world. Start by adding a wiki seed.",
    action: 'Open the new artifact modal',
    target: '#add-new-artifact-button',
  },
  {
    title: 'Draft the wiki entry',
    explanation:
      "Every artifact can include summaries, tags, and structured data. Create the starter wiki entry to hold Aethelgard’s lore.",
    action: 'Create the wiki seed',
    target: '#create-artifact-form',
    advanceEvent: 'submit',
    prefill: {
      '#artifact-title': 'Aethelgard Wiki',
      '#artifact-summary':
        'Collect major factions, legendary locations, and timelines that chart the realm’s shift from arcane power to clockwork.',
      '#artifact-type': 'Wiki',
    },
  },
  {
    title: 'Link your lore',
    explanation:
      "Relations connect artifacts so timelines, characters, and mechanics reinforce one another. Use Add Relation to weave links.",
    action: 'Open the relation tools and connect an artifact',
    target: '#artifact-relations-panel',
    showNextButton: true,
  },
  {
    title: 'Track momentum with milestones',
    explanation:
      "The milestone tracker measures readiness using objectives like graph coverage, exports, and publishing. Watch completion rise as you work.",
    action: 'Review the milestone tracker',
    target: '#milestone-tracker',
    showNextButton: true,
  },
  {
    title: 'Publish your atlas',
    explanation:
      "When you are ready to share progress, publish the atlas for collaborators or connect GitHub to deploy a static site.",
    action: 'Trigger a publish when you are ready',
    target: '#publish-world-button',
    showNextButton: true,
  },
  {
    title: 'Study your analytics',
    explanation:
      "Insights highlight linked artifact coverage, quest completion, and lexicon depth so you can see where to focus next.",
    action: 'Scan the analytics cards',
    target: '#project-insights-panel',
    showNextButton: true,
  },
  {
    title: 'Congratulations! You built your first world.',
    explanation:
      "Keep adding lore, linking artifacts, and publishing updates. Restart this tutorial anytime from the header if you need a refresher.",
    action: 'Finish',
    target: '#project-hero-panel',
    showNextButton: true,
  },
];
