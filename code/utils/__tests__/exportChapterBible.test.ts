import { describe, expect, it } from 'vitest';
import {
  Artifact,
  ArtifactType,
  CharacterData,
  ConlangLexeme,
  LocationData,
  Project,
  ProjectStatus,
  Scene,
  TimelineData,
  WikiData,
} from '../../types';
import { buildChapterBibleContent, createLoreJsonPayload } from '../export';

describe('chapter bible exports', () => {
  const project: Project = {
    id: 'proj-test',
    ownerId: 'user-1',
    title: 'Skybound Atlas',
    summary: 'A compendium of aerial adventures.',
    status: ProjectStatus.Active,
    tags: ['dustland', 'campaign'],
  };

  const storyScenes: Scene[] = [
    { id: 'scene-1', title: 'Opening Gambit', summary: 'Dawn over the floating docks.' },
    { id: 'scene-2', title: 'Stormcall', summary: 'The crew invites the tempest spirits.' },
  ];

  const lexemes: ConlangLexeme[] = [
    { id: 'lex-1', lemma: 'aerith', pos: 'noun', gloss: 'sky current', etymology: 'Old Darv aer + ith' },
  ];

  const locationData: LocationData = {
    description: 'A citadel suspended above the desert.',
    features: [{ id: 'feat-1', name: 'Sky Harbor', description: 'Launch point for wind skiffs.' }],
  };

  const characterData: CharacterData = {
    bio: 'Navigator of the airship Aetherwing.',
    traits: [{ id: 'trait-1', key: 'Role', value: 'Navigator' }],
  };

  const timelineData: TimelineData = {
    events: [
      { id: 'ev-1', date: 'Year 0', title: 'Ascension', description: 'Skybound Atlas takes flight.' },
    ],
  };

  const wikiData: WikiData = {
    content: '## Aether Guild\n\nCustodians of sky routes.',
  };

  const artifacts: Artifact[] = [
    {
      id: 'story-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.Novel,
      title: 'Echo Drift',
      summary: 'A saga of skyfarers.',
      status: 'draft',
      tags: ['story'],
      relations: [{ toId: 'module-1', kind: 'INSPIRES' }],
      data: storyScenes,
    },
    {
      id: 'chapter-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.Chapter,
      title: 'Chapter 1: Windrise',
      summary: 'Introduces the crew and their mission.',
      status: 'draft',
      tags: ['chapter'],
      relations: [{ toId: 'location-1', kind: 'SET_IN' }],
      data: [],
    },
    {
      id: 'character-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.Character,
      title: 'Captain Lysa',
      summary: 'Veteran pilot of the fleet.',
      status: 'draft',
      tags: ['protagonist'],
      relations: [{ toId: 'location-1', kind: 'STATIONED_AT' }],
      data: characterData,
    },
    {
      id: 'location-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.Location,
      title: 'Aether Spire',
      summary: 'Primary base suspended above the dust seas.',
      status: 'draft',
      tags: ['hub'],
      relations: [],
      data: locationData,
    },
    {
      id: 'conlang-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.Conlang,
      title: 'Aetherine',
      summary: 'Language of the sky guild.',
      status: 'draft',
      tags: ['language'],
      relations: [],
      data: lexemes,
    },
    {
      id: 'timeline-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.Timeline,
      title: 'Skybound Timeline',
      summary: 'Major events of the fleet.',
      status: 'draft',
      tags: ['history'],
      relations: [],
      data: timelineData,
    },
    {
      id: 'term-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.Terminology,
      title: 'Windcallers',
      summary: 'Mages who broker weather pacts.',
      status: 'draft',
      tags: ['magic'],
      relations: [{ toId: 'character-1', kind: 'DEFINED_FOR' }],
      data: {},
    },
    {
      id: 'wiki-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.Wiki,
      title: 'Guild Primer',
      summary: 'Overview of the guild hierarchy.',
      status: 'draft',
      tags: ['reference'],
      relations: [],
      data: wikiData,
    },
    {
      id: 'module-1',
      ownerId: 'user-1',
      projectId: project.id,
      type: ArtifactType.GameModule,
      title: 'Echo Drift Module',
      summary: 'Dustland ACK hook for the crew.',
      status: 'draft',
      tags: ['module'],
      relations: [
        { toId: 'character-1', kind: 'FEATURES' },
        { toId: 'location-1', kind: 'LOCATED_AT' },
      ],
      data: [],
    },
  ];

  it('builds a structured chapter bible from project artifacts', () => {
    const content = buildChapterBibleContent(project, artifacts);

    expect(content.project.title).toBe('Skybound Atlas');
    expect(content.storylines).toHaveLength(1);
    expect(content.storylines[0].scenes.map((scene) => scene.title)).toEqual([
      'Opening Gambit',
      'Stormcall',
    ]);
    expect(content.storylines[0].relations[0].targetTitle).toBe('Echo Drift Module');

    expect(content.chapters[0].relations[0].targetTitle).toBe('Aether Spire');
    expect(content.characters[0].traits[0]).toMatchObject({ key: 'Role', value: 'Navigator' });
    expect(content.characters[0].relations[0].targetTitle).toBe('Aether Spire');

    expect(content.lexicon[0]).toMatchObject({ language: 'Aetherine', lemma: 'aerith' });
    expect(content.timelineEntries[0].events[0].title).toBe('Ascension');
    expect(content.gameModules[0].relations).toHaveLength(2);
  });

  it('produces lore JSON shaped for game integrations', () => {
    const content = buildChapterBibleContent(project, artifacts);
    const payload = createLoreJsonPayload(content);

    expect(payload.metadata.projectTitle).toBe('Skybound Atlas');
    expect(payload.narrative.storylines[0].scenes[1].order).toBe(2);
    expect(payload.lore.characters[0].relations[0].targetTitle).toBe('Aether Spire');
    expect(payload.ackModule.modules[0].relations.map((relation) => relation.targetType)).toContain(
      ArtifactType.Location,
    );
  });
});
