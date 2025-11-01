import { TutorialStep } from '../types';

export const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Creative Atlas!',
    explanation:
      "This tutorial will guide you through creating your first project. Let's start by creating a new project.",
    action: 'Create a New Project',
    target: '#create-new-project-button',
    showNextButton: true,
  },
  {
    title: 'Creating Your Project',
    explanation:
      "Every great story starts with a project. Give your project a name and a brief description. For our tutorial, we'll use the world of Aethelgard.",
    action: 'Fill in project details',
    target: '#create-project-form',
    prefill: {
      '#project-title': 'Aethelgard',
      '#project-summary': 'A world of magic and adventure.',
    },
  },
  {
    title: 'Your Project Dashboard',
    explanation:
      "This is your project dashboard, where you can manage all your artifacts. Let's add your first artifact: a world-building wiki.",
    action: 'Add a New Artifact',
    target: '#add-new-artifact-button',
  },
  {
    title: 'Adding a Wiki',
    explanation:
      "A wiki is a great way to organize your world's lore. Give your wiki a title and a short description.",
    action: 'Fill in wiki details',
    target: '#create-artifact-form',
    prefill: {
      '#artifact-title': 'Aethelgard Wiki',
      '#artifact-summary': 'The official wiki for the world of Aethelgard.',
    },
  },
  {
    title: 'Adding Content to Your Wiki',
    explanation:
      "Now, let's add your first wiki entry. You can create articles for characters, locations, and historical events.",
    action: 'Create a new wiki article',
    target: '#create-new-wiki-article-button',
  },
  {
    title: 'Connecting Projects',
    explanation:
      "Creative Atlas allows you to connect your projects. Let's add a web comic and link it to your wiki.",
    action: 'Add a new web comic project and link it to a wiki article',
    target: '#add-web-comic-button',
  },
  {
    title: 'Setting Milestones',
    explanation:
      "Milestones help you track your progress. Let's set a milestone for completing the first chapter of your web comic.",
    action: 'Create a new milestone',
    target: '#create-milestone-button',
  },
  {
    title: 'Publishing Your World',
    explanation:
      "Ready to share your world? You can publish it to the Creative Atlas community. Let's publish your world.",
    action: 'Publish your world',
    target: '#publish-world-button',
  },
  {
    title: 'Congratulations!',
    explanation:
      "Congratulations! You've created and published your first world. You can continue to build your world and share your progress with the community.",
    action: 'Finish',
    target: '#finish-tutorial-button',
  },
];
