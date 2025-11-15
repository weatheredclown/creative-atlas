import type { Achievement } from '../../types';
import { ArtifactType } from '../../types';

export const achievements: Achievement[] = [
  {
    id: 'ach-1',
    title: 'World Builder',
    description: 'Create your first project.',
    isUnlocked: (_, projects) => projects.length >= 1,
  },
  {
    id: 'ach-2',
    title: 'Polyglot',
    description: 'Create a Conlang artifact.',
    isUnlocked: (artifacts) => artifacts.some((artifact) => artifact.type === ArtifactType.Conlang),
  },
  {
    id: 'ach-3',
    title: 'Cartographer',
    description: 'Create a Location artifact.',
    isUnlocked: (artifacts) => artifacts.some((artifact) => artifact.type === ArtifactType.Location),
  },
  {
    id: 'ach-4',
    title: 'Connector',
    description: 'Link 3 artifacts together.',
    isUnlocked: (artifacts) => artifacts.reduce((total, artifact) => total + artifact.relations.length, 0) >= 3,
  },
];
