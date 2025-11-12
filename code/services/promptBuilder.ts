import { Artifact, Project, AIAssistant } from '../types';
import { milestoneRoadmap } from '../src/data/milestones';
import { parsePromptStructure } from '../utils/promptStructure';
import { describeArtifact, formatArtifactType } from '../utils/artifactFormatting';

interface BuildAtlasPromptInput {
  assistant: AIAssistant;
  rawPrompt: string;
  projects: Project[];
  artifacts: Artifact[];
}

interface PromptBuilderContext {
  projects: Project[];
  artifacts: Artifact[];
}

interface PromptSections {
  context: string[];
  directive: string;
  styleHint?: string;
}

type PromptBuilder = (args: string[], context: PromptBuilderContext) => PromptSections | null;

const DEFAULT_STYLE_HINT =
  'Respond in Markdown with clear headings, short paragraphs, and bullet lists where they help the creator act on the ideas.';

const PLACEHOLDER_ARGUMENTS = new Set([
  'projectId',
  'artifactId',
  'focusArtifactId',
  'conlangId',
  'milestoneId',
  'characterId',
  'timelineId',
  'sceneId',
  'planId',
  'cardIds',
  'tone',
  'constraints',
  'phonotactics',
  'needed_pos',
  'partOfSpeech',
  'register',
  'genre',
  'wordcount',
  'repo',
  'tag_range',
  'audience',
  'duration',
  'desired_mood',
  'setting',
  'emotion',
  'constraint',
  'urgency',
  'beats',
]);

const clean = (value?: string): string => value?.replace(/\s+/g, ' ').trim() ?? '';

const truncate = (value: string, max = 180): string => {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1).trimEnd()}…`;
};

const isPlaceholder = (value?: string): boolean => {
  if (!value) {
    return true;
  }

  return PLACEHOLDER_ARGUMENTS.has(value.trim());
};

const resolveFreeformArg = (value: string | undefined, placeholder: string): string | undefined => {
  const trimmed = clean(value);
  if (!trimmed || trimmed === placeholder) {
    return undefined;
  }
  return trimmed;
};

const findProject = (projects: Project[], identifier?: string): Project | undefined => {
  const trimmed = clean(identifier);
  if (!trimmed || isPlaceholder(trimmed)) {
    return undefined;
  }

  return (
    projects.find((project) => project.id === trimmed) ||
    projects.find((project) => project.title.toLowerCase() === trimmed.toLowerCase())
  );
};

const findArtifact = (artifacts: Artifact[], identifier?: string): Artifact | undefined => {
  const trimmed = clean(identifier);
  if (!trimmed || isPlaceholder(trimmed)) {
    return undefined;
  }

  return (
    artifacts.find((artifact) => artifact.id === trimmed) ||
    artifacts.find((artifact) => artifact.title.toLowerCase() === trimmed.toLowerCase())
  );
};

const formatProjectContext = (project: Project): string => {
  const summary = clean(project.summary);
  const tags = project.tags?.length ? `\n- Tags: ${project.tags.join(', ')}` : '';
  return `Project context:\n- Title: ${project.title}\n- Summary: ${truncate(summary, 220)}${tags}`;
};

const formatArtifactContext = (artifact: Artifact, projects: Project[]): string => {
  const parentProject = projects.find((project) => project.id === artifact.projectId);
  const summary = clean(artifact.summary);
  const status = artifact.status ? `\n- Status: ${artifact.status}` : '';
  const projectLine = parentProject ? `\n- From project: ${parentProject.title}` : '';
  const summaryLine = summary ? `\n- Summary: ${truncate(summary, 220)}` : '';
  return `Artifact context:\n- Title: ${artifact.title} (${formatArtifactType(artifact.type)})${projectLine}${status}${summaryLine}`;
};

const formatArtifactList = (artifacts: Artifact[], projects: Project[], heading: string): string | undefined => {
  if (artifacts.length === 0) {
    return undefined;
  }

  const lines = artifacts.slice(0, 6).map((artifact) => {
    const project = projects.find((entry) => entry.id === artifact.projectId);
    return `- ${describeArtifact(artifact, project)}`;
  });

  return `${heading}:\n${lines.join('\n')}`;
};

const describeMilestone = (milestoneId?: string): string | undefined => {
  const trimmed = clean(milestoneId);
  if (!trimmed || isPlaceholder(trimmed)) {
    return undefined;
  }

  const milestone = milestoneRoadmap.find((entry) => entry.id === trimmed);
  if (!milestone) {
    return undefined;
  }

  const objectives = milestone.objectives
    .slice(0, 5)
    .map((objective) => `- ${objective.description}`)
    .join('\n');

  return `Milestone focus:\n- Title: ${milestone.title}\n- Timeline: ${milestone.timeline}\n- Focus: ${milestone.focus}\n- Objectives:\n${objectives}`;
};

const describeCards = (input?: string): string | undefined => {
  const trimmed = clean(input);
  if (!trimmed || isPlaceholder(trimmed)) {
    return undefined;
  }

  const ids = trimmed
    .split(/[|,]/)
    .map((value) => clean(value))
    .filter((value) => value.length > 0);

  if (ids.length === 0) {
    return undefined;
  }

  const bullets = ids.map((id) => `- ${id}`);
  return `Selected inspiration cards:\n${bullets.join('\n')}`;
};

const buildSynthOutline: PromptBuilder = (args, context) => {
  const [projectArg, artifactArg, toneArg, constraintsArg] = args;
  const project = findProject(context.projects, projectArg);
  const artifact = findArtifact(context.artifacts, artifactArg);
  const tone = resolveFreeformArg(toneArg, 'tone');
  const constraints = resolveFreeformArg(constraintsArg, 'constraints');

  const contextSections: string[] = [];
  if (project) {
    contextSections.push(formatProjectContext(project));
  }

  if (artifact) {
    contextSections.push(formatArtifactContext(artifact, context.projects));
  }

  if (project) {
    const related = context.artifacts.filter(
      (entry) => entry.projectId === project.id && entry.id !== artifact?.id,
    );
    const relatedList = formatArtifactList(related, context.projects, 'Nearby artifacts to thread against');
    if (relatedList) {
      contextSections.push(relatedList);
    }
  }

  const directive = [
    artifact
      ? `Develop a connective tissue outline for "${artifact.title}" that reinforces how it fits inside ${project?.title ?? 'the broader project universe'}.`
      : 'Develop a connective tissue outline for the highlighted artifact, showing how the new beats mesh with existing lore.',
    'Present 3–5 beats with short summaries. Under each beat, note callbacks, foreshadowing, or relationship threads to surface.',
    tone ? `Maintain this tone or vibe: ${tone}.` : null,
    constraints ? `Respect these constraints or special requests: ${constraints}.` : null,
    'Close with two follow-up experiments or open questions the creator could explore next.',
  ]
    .filter(Boolean)
    .join('\n');

  return { context: contextSections, directive };
};

const buildLinkMatrix: PromptBuilder = (args, context) => {
  const [projectArg, focusArtifactArg] = args;
  const project = findProject(context.projects, projectArg);
  const focusArtifact = findArtifact(context.artifacts, focusArtifactArg);

  const contextSections: string[] = [];
  if (project) {
    contextSections.push(formatProjectContext(project));
  }
  if (focusArtifact) {
    contextSections.push(formatArtifactContext(focusArtifact, context.projects));
  }
  if (project) {
    const others = context.artifacts.filter(
      (entry) => entry.projectId === project.id && entry.id !== focusArtifact?.id,
    );
    const list = formatArtifactList(others, context.projects, 'Candidate partner artifacts');
    if (list) {
      contextSections.push(list);
    }
  }

  const directive = [
    focusArtifact
      ? `Propose relationship leads that strengthen "${focusArtifact.title}" within ${project?.title ?? 'this world'}.`
      : 'Propose relationship leads that will strengthen the highlighted artifact within the project.',
    'For each suggestion, name the partner artifact, explain the link, and describe the narrative or thematic payoff.',
    'Include at least one unexpected or cross-domain connection that could surprise the reader.',
    'Finish with a recommendation on which link to prototype first and why.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Return a Markdown table with columns Partner Artifact, Relationship Hook, and Creative Payoff, followed by a short recommendation paragraph.',
  };
};

const buildConflictWeb: PromptBuilder = (args, context) => {
  const [projectArg] = args;
  const project = findProject(context.projects, projectArg);
  const contextSections: string[] = [];

  if (project) {
    contextSections.push(formatProjectContext(project));
    const factions = context.artifacts.filter((artifact) => artifact.projectId === project.id);
    const list = formatArtifactList(factions, context.projects, 'Artifacts influencing this conflict space');
    if (list) {
      contextSections.push(list);
    }
  }

  const directive = [
    'Map the conflict web shaping this story space, highlighting the opposing forces, resources in contention, and escalation paths.',
    'Group insights into Factions/Forces, Flashpoints, Escalations, and Fallout, noting why each tension matters to the creator.',
    'End with one wildcard tension or twist the creator could introduce to deepen the conflict.',
  ].join('\n');

  return { context: contextSections, directive, styleHint: 'Organize the response with Markdown subheadings for Factions/Forces, Flashpoints, Escalations, Fallout, and Wildcard.' };
};

const buildLexemeSeed: PromptBuilder = (args, context) => {
  const [conlangArg, phonotacticsArg, posArg] = args;
  const conlang = findArtifact(context.artifacts, conlangArg);
  const phonotactics = resolveFreeformArg(phonotacticsArg, 'phonotactics');
  const neededPos = resolveFreeformArg(posArg, 'needed_pos');

  const contextSections: string[] = [];
  if (conlang) {
    contextSections.push(formatArtifactContext(conlang, context.projects));
  }
  if (phonotactics) {
    contextSections.push(`Phonotactic cues: ${phonotactics}`);
  }
  if (neededPos) {
    contextSections.push(`Requested parts of speech: ${neededPos}`);
  }

  const directive = [
    'Invent a small lexeme batch that fits the phonotactic guidance and enriches the conlang.',
    'For each entry, include the word, gloss, part of speech, sample usage, and any cultural note or derivation hook.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Return a Markdown table with columns Word, Gloss, Part of Speech, Usage, and Notes, plus a short paragraph suggesting how to extend the lexicon.',
  };
};

const buildParadigmTable: PromptBuilder = (args, context) => {
  const [conlangArg, posArg] = args;
  const conlang = findArtifact(context.artifacts, conlangArg);
  const partOfSpeech = resolveFreeformArg(posArg, 'partOfSpeech');

  const contextSections: string[] = [];
  if (conlang) {
    contextSections.push(formatArtifactContext(conlang, context.projects));
  }
  if (partOfSpeech) {
    contextSections.push(`Target part of speech: ${partOfSpeech}`);
  }

  const directive = [
    'Lay out a paradigm table covering the requested grammatical category, showing stems, affixes, and irregularities.',
    'After the table, explain noteworthy patterns, phonological shifts, and usage notes the creator should remember.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Return a Markdown table for the paradigm followed by a short analysis section.',
  };
};

const buildExampleSentences: PromptBuilder = (args, context) => {
  const [conlangArg, registerArg] = args;
  const conlang = findArtifact(context.artifacts, conlangArg);
  const register = resolveFreeformArg(registerArg, 'register');

  const contextSections: string[] = [];
  if (conlang) {
    contextSections.push(formatArtifactContext(conlang, context.projects));
  }
  if (register) {
    contextSections.push(`Desired register or vibe: ${register}`);
  }

  const directive = [
    'Craft 3–5 example sentences in the conlang. Provide interlinear glosses and translations.',
    'Call out idiomatic choices or cultural context when it adds flavor.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Format as a numbered list. For each sentence, include the original line, interlinear gloss, natural translation, and notes.',
  };
};

const buildBeatDiagnostic: PromptBuilder = (args, context) => {
  const [projectArg, artifactArg] = args;
  const project = findProject(context.projects, projectArg);
  const artifact = findArtifact(context.artifacts, artifactArg);

  const contextSections: string[] = [];
  if (project) {
    contextSections.push(formatProjectContext(project));
  }
  if (artifact) {
    contextSections.push(formatArtifactContext(artifact, context.projects));
  }

  const directive = [
    'Evaluate the story beats currently planned for this artifact.',
    'Identify what is working, where tension dips, and what risks or gaps might stall momentum.',
    'Suggest concrete tweaks or additional beats that realign the arc with the project goals.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Return a Markdown table with columns Beat, What Works, Risks, and Suggested Tweaks, followed by a short summary paragraph.',
  };
};

const buildTensionGraph: PromptBuilder = (args, context) => {
  const [projectArg, artifactArg] = args;
  const project = findProject(context.projects, projectArg);
  const artifact = findArtifact(context.artifacts, artifactArg);

  const contextSections: string[] = [];
  if (project) {
    contextSections.push(formatProjectContext(project));
  }
  if (artifact) {
    contextSections.push(formatArtifactContext(artifact, context.projects));
  }

  const directive = [
    'Sketch the tension curve for this artifact from opening to aftermath.',
    'Break it into phases (Setup, Rising Complications, Climax, Aftermath) and describe how intensity changes in each stage.',
    'Call out opportunities to add spikes, reversals, or breathers to modulate pacing.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Use Markdown subheadings for each phase and include bullet points showing intensity (e.g., use emojis or a 1–5 scale).',
  };
};

const buildCompTitles: PromptBuilder = (args) => {
  const [genreArg, wordcountArg] = args;
  const genre = resolveFreeformArg(genreArg, 'genre');
  const wordcount = resolveFreeformArg(wordcountArg, 'wordcount');

  const contextSections: string[] = [];
  if (genre) {
    contextSections.push(`Target genre or vibe: ${genre}`);
  }
  if (wordcount) {
    contextSections.push(`Approximate length: ${wordcount}`);
  }

  const directive = [
    'Recommend 5 comparable titles (books, games, shows, podcasts, etc.) that match the requested tone and scale.',
    'For each comp, note the medium, creator, and the specific element that aligns with the creator’s project.',
    'End with one stretch comp that pushes the concept in a daring direction and explain the benefit.',
  ].join('\n');

  return { context: contextSections, directive };
};

const buildPatchNotes: PromptBuilder = (args, context) => {
  const [repoArg, tagRangeArg, audienceArg] = args;
  const repoArtifact = findArtifact(context.artifacts, repoArg);
  const tagRange = resolveFreeformArg(tagRangeArg, 'tag_range');
  const audience = resolveFreeformArg(audienceArg, 'audience');

  const contextSections: string[] = [];
  if (repoArtifact) {
    contextSections.push(formatArtifactContext(repoArtifact, context.projects));
  }
  if (tagRange) {
    contextSections.push(`Tag or commit range to summarize: ${tagRange}`);
  }
  if (audience) {
    contextSections.push(`Intended audience: ${audience}`);
  }

  const directive = [
    'Transform the changes into narrative patch notes with a compelling headline, feature highlights, and callouts for community impact.',
    'Organize content into sections such as Headline, Major Upgrades, Quality of Life, and What to Explore Next.',
    'Maintain voice appropriate for the stated audience.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Structure the response with Markdown headings (Headline, Major Upgrades, Quality of Life, Player Impact, Next Experiments).',
  };
};

const buildReleaseStory: PromptBuilder = (args, context) => {
  const [projectArg, milestoneArg, toneArg] = args;
  const project = findProject(context.projects, projectArg);
  const milestone = describeMilestone(milestoneArg);
  const tone = resolveFreeformArg(toneArg, 'tone');

  const contextSections: string[] = [];
  if (project) {
    contextSections.push(formatProjectContext(project));
  }
  if (milestone) {
    contextSections.push(milestone);
  }
  if (tone) {
    contextSections.push(`Desired tone or voice: ${tone}`);
  }

  const directive = [
    'Write a short release story that recaps what changed, why it matters, and what comes next.',
    'Open with a hook, then narrate key upgrades through the lens of the milestone focus.',
    'Close with a teaser or invitation that keeps momentum high.',
  ].join('\n');

  return { context: contextSections, directive };
};

const buildTrailerScript: PromptBuilder = (args, context) => {
  const [projectArg, durationArg] = args;
  const project = findProject(context.projects, projectArg);
  const duration = resolveFreeformArg(durationArg, 'duration');

  const contextSections: string[] = [];
  if (project) {
    contextSections.push(formatProjectContext(project));
  }
  if (duration) {
    contextSections.push(`Approximate trailer duration: ${duration}`);
  }

  const directive = [
    'Script a launch trailer that blends narration, on-screen beats, and sensory cues.',
    'Break the script into timestamps with Voiceover, Visuals, and SFX/Music notes for each segment.',
    'End with a final button (call to action or memorable image).',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Format as a Markdown table or list with columns/labels Timestamp, Voiceover, Visuals, and Audio, followed by a closing CTA paragraph.',
  };
};

const buildBlendPrompts: PromptBuilder = (args) => {
  const [cardIdsArg, moodArg] = args;
  const cards = describeCards(cardIdsArg);
  const desiredMood = resolveFreeformArg(moodArg, 'desired_mood');

  const contextSections: string[] = [];
  if (cards) {
    contextSections.push(cards);
  }
  if (desiredMood) {
    contextSections.push(`Target mood or vibe: ${desiredMood}`);
  }

  const directive = [
    'Fuse the selected inspiration cards into fresh scene sparks.',
    'Provide 3 variations that state the core idea, the tonal twist, and production notes or sensory anchors.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Return a Markdown table with columns Prompt Blend, Tone Shift, and Production Notes.',
  };
};

const buildSensoryPalette: PromptBuilder = (args) => {
  const [settingArg, emotionArg] = args;
  const setting = resolveFreeformArg(settingArg, 'setting');
  const emotion = resolveFreeformArg(emotionArg, 'emotion');

  const contextSections: string[] = [];
  if (setting) {
    contextSections.push(`Setting or location focus: ${setting}`);
  }
  if (emotion) {
    contextSections.push(`Desired emotional undertone: ${emotion}`);
  }

  const directive = [
    'Construct a sensory palette that supports the target emotion.',
    'Group details by sense (Sight, Sound, Smell, Taste, Touch) and include at least one metaphor or texture per sense.',
    'Wrap with a short paragraph suggesting how to deploy the palette in the scene.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Use Markdown subheadings for each sense and bullet lists underneath. Finish with a short application paragraph.',
  };
};

const buildSurpriseTwist: PromptBuilder = (args, context) => {
  const [characterArg, constraintArg] = args;
  const character = findArtifact(context.artifacts, characterArg);
  const constraint = resolveFreeformArg(constraintArg, 'constraint');

  const contextSections: string[] = [];
  if (character) {
    contextSections.push(formatArtifactContext(character, context.projects));
  }
  if (constraint) {
    contextSections.push(`Constraints or promises to honor: ${constraint}`);
  }

  const directive = [
    'Propose a surprising twist for the character that remains true to established canon.',
    'Explain the reveal, the immediate fallout, and the longer-term opportunity it unlocks.',
    'Offer one alternate twist in case the primary idea conflicts with continuity.',
  ].join('\n');

  return { context: contextSections, directive };
};

const buildContinuityAudit: PromptBuilder = (args, context) => {
  const [projectArg] = args;
  const project = findProject(context.projects, projectArg);

  const contextSections: string[] = [];
  if (project) {
    contextSections.push(formatProjectContext(project));
    const related = context.artifacts.filter((artifact) => artifact.projectId === project.id);
    const list = formatArtifactList(related, context.projects, 'Key artifacts influencing canon');
    if (list) {
      contextSections.push(list);
    }
  }

  const directive = [
    'Audit the project for potential continuity risks or contradictions.',
    'List each risk with the affected artifacts and the nature of the conflict, then propose a fix or mitigation.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Return two sections titled Potential Contradictions and Suggested Fixes. Use bullet points under each.',
  };
};

const buildTimelineHarmonizer: PromptBuilder = (args, context) => {
  const [timelineArg] = args;
  const timeline = findArtifact(context.artifacts, timelineArg);

  const contextSections: string[] = [];
  if (timeline) {
    contextSections.push(formatArtifactContext(timeline, context.projects));
    const siblings = context.artifacts.filter(
      (artifact) => artifact.projectId === timeline.projectId && artifact.id !== timeline.id,
    );
    const list = formatArtifactList(siblings, context.projects, 'Other artifacts intersecting this timeline');
    if (list) {
      contextSections.push(list);
    }
  }

  const directive = [
    'Identify timeline clashes, missing connective events, and opportunities to realign arcs.',
    'Recommend concrete adjustments with the event, the change, and the downstream impact.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Return a chronological bullet list where each item names the event, issue, and proposed adjustment. Conclude with a short summary paragraph.',
  };
};

const buildCharacterReturnPlan: PromptBuilder = (args, context) => {
  const [characterArg, urgencyArg] = args;
  const character = findArtifact(context.artifacts, characterArg);
  const urgency = resolveFreeformArg(urgencyArg, 'urgency');

  const contextSections: string[] = [];
  if (character) {
    contextSections.push(formatArtifactContext(character, context.projects));
  }
  if (urgency) {
    contextSections.push(`Return urgency or timeline: ${urgency}`);
  }

  const directive = [
    'Design a plan to reintroduce the character, covering the rationale, setup scene, and aftermath hooks.',
    'Outline at least three phases (Preparation, Spotlight Moment, Follow-Through) with goals, tactics, and memory callbacks.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Format the plan as a Markdown table with columns Phase, Goal, Tactics, and Memory Hooks, followed by a closing note.',
  };
};

const buildArcOutline: PromptBuilder = (args, context) => {
  const [characterArg, beatsArg] = args;
  const character = findArtifact(context.artifacts, characterArg);
  const beats = resolveFreeformArg(beatsArg, 'beats');

  const contextSections: string[] = [];
  if (character) {
    contextSections.push(formatArtifactContext(character, context.projects));
  }
  if (beats) {
    contextSections.push(`Specified beats or goals to include: ${beats}`);
  }

  const directive = [
    'Draft a character arc outline showing emotional progression and key memory sync points.',
    'Organize by Act or Beat, noting the emotional state, external turn, and callback potential.',
    'Finish with suggestions for artifacts or scenes that should be updated to reflect the new arc.',
  ].join('\n');

  return { context: contextSections, directive };
};

const buildMemorySync: PromptBuilder = (args, context) => {
  const [planArg] = args;
  const plan = findArtifact(context.artifacts, planArg);

  const contextSections: string[] = [];
  if (plan) {
    contextSections.push(formatArtifactContext(plan, context.projects));
    const project = context.projects.find((entry) => entry.id === plan.projectId);
    if (project) {
      const related = context.artifacts.filter(
        (artifact) => artifact.projectId === project.id && artifact.id !== plan.id,
      );
      const list = formatArtifactList(related, context.projects, 'Artifacts likely impacted by this memory sync');
      if (list) {
        contextSections.push(list);
      }
    }
  }

  const directive = [
    'Assemble a memory sync checklist: what needs to be updated, why it matters, and ownership/status.',
    'Highlight dependencies or blockers that could slow the sync.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Return a Markdown table with columns Item, Update Needed, Owner/Status, and Notes, then summarize next steps.',
  };
};

const buildCallbackRecommendations: PromptBuilder = (args, context) => {
  const [sceneArg] = args;
  const scene = findArtifact(context.artifacts, sceneArg);

  const contextSections: string[] = [];
  if (scene) {
    contextSections.push(formatArtifactContext(scene, context.projects));
    const project = context.projects.find((entry) => entry.id === scene.projectId);
    if (project) {
      const related = context.artifacts.filter(
        (artifact) => artifact.projectId === project.id && artifact.id !== scene.id,
      );
      const list = formatArtifactList(related, context.projects, 'Potential callback sources');
      if (list) {
        contextSections.push(list);
      }
    }
  }

  const directive = [
    'Recommend callbacks the scene can echo to reinforce continuity and emotional payoff.',
    'For each callback, specify the source artifact, the callback detail, and the intended effect on readers.',
    'Add one suggestion for an entirely new callback or motif to capture now.',
  ].join('\n');

  return {
    context: contextSections,
    directive,
    styleHint: 'Provide the callbacks as bullet points with bolded source artifact names, then include a short closing paragraph.',
  };
};

const promptBuilders: Record<string, PromptBuilder> = {
  synth_outline: buildSynthOutline,
  link_matrix: buildLinkMatrix,
  conflict_web: buildConflictWeb,
  lexeme_seed: buildLexemeSeed,
  paradigm_table: buildParadigmTable,
  example_sentences: buildExampleSentences,
  beat_diagnostic: buildBeatDiagnostic,
  tension_graph: buildTensionGraph,
  comp_titles: buildCompTitles,
  patch_notes: buildPatchNotes,
  release_story: buildReleaseStory,
  trailer_script: buildTrailerScript,
  blend_prompts: buildBlendPrompts,
  sensory_palette: buildSensoryPalette,
  surprise_twist: buildSurpriseTwist,
  continuity_audit: buildContinuityAudit,
  timeline_harmonizer: buildTimelineHarmonizer,
  character_return_plan: buildCharacterReturnPlan,
  arc_outline: buildArcOutline,
  memory_sync: buildMemorySync,
  callback_recommendations: buildCallbackRecommendations,
};

export const buildAtlasIntelligencePrompt = (input: BuildAtlasPromptInput): string => {
  const trimmedPrompt = clean(input.rawPrompt);
  if (!trimmedPrompt) {
    return trimmedPrompt;
  }

  const baseIntro = `You are ${input.assistant.name}, an Atlas Intelligence guide. ${input.assistant.description}`;
  const focusLine = `Your focus: ${input.assistant.focus}. Provide concrete, imaginative output the creator can drop into their workspace.`;

  const structure = parsePromptStructure(trimmedPrompt);
  if (!structure) {
    return [baseIntro, focusLine, `Creator request:\n${trimmedPrompt}`].join('\n\n');
  }

  const builder = promptBuilders[structure.name];
  if (!builder) {
    return [baseIntro, focusLine, `Creator request:\n${trimmedPrompt}`].join('\n\n');
  }

  const sections = builder(structure.args, {
    artifacts: input.artifacts,
    projects: input.projects,
  });

  if (!sections) {
    return [baseIntro, focusLine, `Creator request:\n${trimmedPrompt}`].join('\n\n');
  }

  const parts = [baseIntro, focusLine, ...sections.context, sections.directive];
  const styleHint = sections.styleHint ?? DEFAULT_STYLE_HINT;
  if (styleHint) {
    parts.push(styleHint);
  }

  return parts.filter((part) => part && part.length > 0).join('\n\n');
};
