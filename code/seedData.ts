import { Artifact, ArtifactType, ConlangLexeme, LocationData, Project, ProjectStatus, TaskData, TaskState, CharacterData, WikiData, TimelineData } from './types';

export interface SeedWorkspace {
  projects: Project[];
  artifacts: Artifact[];
  xp: number;
}

export const createSeedWorkspace = (ownerId: string): SeedWorkspace => {
  const projects: Project[] = [
    { id: 'proj-1', ownerId, title: 'Tamenzut', summary: 'A series of high-fantasy novels.', status: ProjectStatus.Active, tags: ['novel', 'fantasy'] },
    { id: 'proj-2', ownerId, title: 'Steamweave', summary: 'A coal-punk world of gears and magic.', status: ProjectStatus.Idea, tags: ['coal-punk', 'rpg'] },
    { id: 'proj-3', ownerId, title: 'Sacred Truth', summary: 'A supernatural investigation saga.', status: ProjectStatus.Active, tags: ['vampires', 'mystery'] },
    { id: 'proj-4', ownerId, title: 'Dustland', summary: 'A retro CRT RPG framework.', status: ProjectStatus.Active, tags: ['rpg', 'crt-aesthetic'] },
    { id: 'proj-5', ownerId, title: 'Aputi', summary: 'A timeline of the Aputi people.', status: ProjectStatus.Idea, tags: ['timeline', 'history'] },
  ];

  const artifacts: Artifact[] = [
    {
      id: 'art-1',
      ownerId,
      projectId: 'proj-1',
      type: ArtifactType.Conlang,
      title: 'Darv',
      summary: 'The ancient language of the Darv people.',
      status: 'draft',
      tags: ['language'],
      relations: [],
      data: [
        { id: 'lex-1', lemma: 'brubber', pos: 'adj', gloss: 'strange; unusual', etymology: 'From Old Darv "brub", meaning "other".' },
      ] as ConlangLexeme[],
    },
    {
      id: 'art-2',
      ownerId,
      projectId: 'proj-1',
      type: ArtifactType.Character,
      title: 'Kaelen',
      summary: 'A rogue with a mysterious past.',
      status: 'draft',
      tags: ['protagonist'],
      relations: [{ toId: 'art-1', kind: 'SPEAKS' }],
      data: { bio: 'Kaelen grew up on the streets of the Gilded City, learning to live by his wits.', traits: [{ id: 't1', key: 'Age', value: '27' }] } as CharacterData,
    },
    {
      id: 'art-3',
      ownerId,
      projectId: 'proj-2',
      type: ArtifactType.Story,
      title: 'Shroud and Gears',
      summary: 'An introductory short story.',
      status: 'idea',
      tags: ['short-story'],
      relations: [],
      data: [],
    },
    {
      id: 'art-4',
      ownerId,
      projectId: 'proj-2',
      type: ArtifactType.Task,
      title: 'Design main character',
      summary: 'Flesh out the protagonist for Shroud and Gears.',
      status: 'in-progress',
      tags: ['design'],
      relations: [],
      data: { state: TaskState.InProgress } as TaskData,
    },
    {
      id: 'art-5',
      ownerId,
      projectId: 'proj-2',
      type: ArtifactType.Task,
      title: 'Outline Chapter 1',
      summary: 'Create beat sheet for the first chapter.',
      status: 'todo',
      tags: ['writing'],
      relations: [],
      data: { state: TaskState.Todo } as TaskData,
    },
    {
      id: 'art-6',
      ownerId,
      projectId: 'proj-1',
      type: ArtifactType.Wiki,
      title: 'World Anvil',
      summary: 'Main wiki for the Tamenzut universe.',
      status: 'draft',
      tags: ['world-building'],
      relations: [],
      data: { content: '# Welcome to Tamenzut' } as WikiData,
    },
    {
      id: 'art-7',
      ownerId,
      projectId: 'proj-1',
      type: ArtifactType.Location,
      title: 'The Gilded City',
      summary: 'A bustling desert metropolis.',
      status: 'draft',
      tags: ['city'],
      relations: [],
      data: {
        description: 'A city built on an oasis, known for its vibrant trade and towering spires of sandstone and gold.',
        features: [{ id: 'f1', name: 'The Sunstone Market', description: 'A sprawling bazaar.' }],
      } as LocationData,
    },
    {
      id: 'art-8',
      ownerId,
      projectId: 'proj-5',
      type: ArtifactType.Timeline,
      title: 'Aputi People Timeline',
      summary: 'A historical timeline of the Aputi people.',
      status: 'draft',
      tags: ['history', 'timeline'],
      relations: [],
      data: {
        events: [
          { id: 'ev-1', date: '-1000', title: 'First Settlers', description: 'The first Aputi settlers arrive in the valley.' },
          { id: 'ev-2', date: '-500', title: 'The Great Flood', description: 'A great flood reshapes the landscape.' },
        ],
      } as TimelineData,
    },
  ];

  return {
    projects,
    artifacts,
    xp: 25,
  };
};

