import type { AIAssistant } from '../../types';

export const aiAssistants: AIAssistant[] = [

    {
        id: 'lore-weaver',
        name: 'Lore Weaver',
        description: 'Expands summaries, suggests links, and weaves conflict matrices so the universe feels alive.',
        focus: 'Narrative expansion & connective tissue',
        promptSlots: [
            'synth_outline(projectId, artifactId, tone, constraints)',
            'link_matrix(projectId, focusArtifactId)',
            'conflict_web(projectId)',
        ],
    },
    {
        id: 'conlang-smith',
        name: 'Conlang Smith',
        description: 'Batches lexemes, paradigm tables, and example sentences to grow fictional languages fast.',
        focus: 'Language design & lexicon growth',
        promptSlots: [
            'lexeme_seed(conlangId, phonotactics, needed_pos)',
            'paradigm_table(conlangId, partOfSpeech)',
            'example_sentences(conlangId, register)',
        ],
    },
    {
        id: 'story-doctor',
        name: 'Story Doctor',
        description: 'Diagnoses beats, tension curves, and recommends comp titles for strong narrative pacing.',
        focus: 'Story health & pacing diagnostics',
        promptSlots: [
            'beat_diagnostic(projectId, artifactId)',
            'tension_graph(projectId, artifactId)',
            'comp_titles(genre, wordcount)',
        ],
    },
    {
        id: 'release-bard',
        name: 'Release Bard',
        description: 'Turns changelogs into narrative release notes and scripts launch trailers.',
        focus: 'Publishing voice & launch storytelling',
        promptSlots: [
            'patch_notes(repo, tag_range, audience)',
            'release_story(projectId, milestoneId, tone)',
            'trailer_script(projectId, duration)',
        ],
    },
    {
        id: 'muse-of-sparks',
        name: 'Muse of Sparks',
        description: 'Combines inspiration cards into scene starters, tone shifts, and sensory palettes on demand.',
        focus: 'Prompt alchemy & vibe modulation',
        promptSlots: [
            'blend_prompts(cardIds, desired_mood)',
            'sensory_palette(setting, emotion)',
            'surprise_twist(characterId, constraint)',
        ],
    },
    {
        id: 'canon-warden',
        name: 'Canon Warden',
        description: 'Cross-checks continuity monitor warnings and proposes fixes before contradictions land on the page.',
        focus: 'Continuity & canon defense',
        promptSlots: [
            'continuity_audit(projectId)',
            'timeline_harmonizer(timelineId)',
            'character_return_plan(characterId, urgency)',
        ],
    },
    {
        id: 'arc-archivist',
        name: 'Arc Archivist',
        description: 'Tracks character beats across scenes to recommend callbacks and memory sync checkpoints.',
        focus: 'Arc tracking & memory syncing',
        promptSlots: [
            'arc_outline(characterId, beats)',
            'memory_sync(planId)',
            'callback_recommendations(sceneId)',
        ],
    },
];
