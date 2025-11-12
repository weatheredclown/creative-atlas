
export enum ProjectStatus {
  Idea = 'idea',
  Active = 'active',
  Paused = 'paused',
  Archived = 'archived',
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  tags: string[];
}

export interface ProjectShareStatus {
  enabled: boolean;
  shareId?: string;
}

export interface SharedProjectPayload {
  project: Project;
  artifacts: Artifact[];
}

export interface StaticSiteFile {
  path: string;
  contents: string;
}

export enum ArtifactType {
  Story = 'Story',
  Novel = 'Novel',
  ShortStory = 'ShortStory',
  WebComic = 'WebComic',
  Audiobook = 'Audiobook',
  Character = 'Character',
  Location = 'Location',
  Conlang = 'Conlang',
  Game = 'Game',
  Wiki = 'Wiki',
  Scene = 'Scene',
  Chapter = 'Chapter',
  Faction = 'Faction',
  MagicSystem = 'MagicSystem',
  Timeline = 'Timeline',
  Terminology = 'Terminology',
  GameModule = 'GameModule',
  Task = 'Task',
  Repository = 'Repository',
  Issue = 'Issue',
  Release = 'Release',
}

export const NARRATIVE_ARTIFACT_TYPES: readonly ArtifactType[] = [
  ArtifactType.Story,
  ArtifactType.Novel,
  ArtifactType.ShortStory,
  ArtifactType.WebComic,
  ArtifactType.Audiobook,
];

export const isNarrativeArtifactType = (type: ArtifactType): boolean =>
  NARRATIVE_ARTIFACT_TYPES.includes(type);

export type ArcStageId = 'spark' | 'rising' | 'crisis' | 'transformation' | 'legacy';

export type CharacterProgressionStatus =
  | 'untracked'
  | 'inciting'
  | 'escalating'
  | 'confrontation'
  | 'resolution'
  | 'legacy';

export interface CharacterProgressionCheckpoint {
  stageId: ArcStageId;
  status: CharacterProgressionStatus;
  notedAt: string;
  summary?: string;
  recordedBy?: string;
}

export interface CharacterProgressionState {
  stageId: ArcStageId;
  status: CharacterProgressionStatus;
  updatedAt: string;
  lastAdvancedAt?: string;
  checkpoints: CharacterProgressionCheckpoint[];
}

export const TASK_STATE = {
    Todo: 'Todo',
    InProgress: 'In Progress',
    Done: 'Done',
} as const;

export type TaskState = typeof TASK_STATE[keyof typeof TASK_STATE];

export const TASK_STATE_VALUES = Object.values(TASK_STATE) as TaskState[];

export interface Relation {
    toId: string;
    kind: string; // e.g., 'RELATES_TO', 'APPEARS_IN'
}

export interface Scene {
    id: string;
    title: string;
    summary: string;
}

export interface TaskData {
    state: TaskState;
    assignee?: string;
    due?: string;
}

export interface CharacterTrait {
    id: string;
    key: string;
    value: string;
}

export interface CharacterData {
    bio: string;
    traits: CharacterTrait[];
    progression?: CharacterProgressionState;
}

export interface WikiData {
    content: string;
}

export interface LocationFeature {
    id: string;
    name: string;
    description: string;
}

export interface LocationData {
    description: string;
    features: LocationFeature[];
}

export type MagicStability = 'stable' | 'volatile' | 'forbidden';

export interface MagicSystemPrinciple {
    id: string;
    title: string;
    focus: string;
    description: string;
    stability: MagicStability;
}

export interface MagicSystemSource {
    id: string;
    name: string;
    resonance: string;
    capacity: string;
    tells: string;
}

export interface MagicSystemRitual {
    id: string;
    name: string;
    tier: string;
    cost: string;
    effect: string;
    failure: string;
}

export interface MagicSystemTaboo {
    id: string;
    rule: string;
    consequence: string;
    restoration?: string;
}

export interface MagicSystemData {
    codexName: string;
    summary: string;
    principles: MagicSystemPrinciple[];
    sources: MagicSystemSource[];
    rituals: MagicSystemRitual[];
    taboos: MagicSystemTaboo[];
    fieldNotes: string[];
}

export interface RepositoryData {
    url: string;
    stars: number;
    forks: number;
    watchers: number;
    defaultBranch: string;
    language?: string;
    openIssues: number;
}

export interface IssueData {
    number: number;
    url: string;
    state: string;
    author: string;
    labels: string[];
    comments: number;
}

export interface ReleaseData {
    tagName: string;
    url: string;
    publishedAt?: string;
    author: string;
    draft: boolean;
    prerelease: boolean;
}

export interface Artifact {
  id: string;
  ownerId: string;
  projectId: string;
  type: ArtifactType;
  title:string;
  summary: string;
  status: string; // e.g., 'draft', 'complete'
  tags: string[];
  relations: Relation[];
  // A flexible field for type-specific data
  data:
    | ConlangLexeme[]
    | Scene[]
    | TaskData
    | CharacterData
    | WikiData
    | LocationData
    | RepositoryData
    | IssueData
    | ReleaseData
    | TimelineData
    | MagicSystemData
    | Record<string, unknown>;
}

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description: string;
}

export interface TimelineData {
    events: TimelineEvent[];
}

export interface ConlangLexeme {
  id: string;
  lemma: string;
  pos: string; // part of speech
  gloss: string;
  etymology?: string;
  tags?: string[];
}

export interface Quest {
    id:string;
    title: string;
    description: string;
    isCompleted: (artifacts: Artifact[], projects: Project[]) => boolean;
    xp: number;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    isUnlocked: (artifacts: Artifact[], projects: Project[]) => boolean;
}

export interface QuestlineObjective {
    id: string;
    title: string;
    description: string;
    xpReward: number;
    isCompleted: (artifacts: Artifact[], projects: Project[], profile: UserProfile) => boolean;
}

export interface Questline {
    id: string;
    title: string;
    summary: string;
    unlockLevel: number;
    objectives: QuestlineObjective[];
}

export interface TemplateArtifactBlueprint {
    title: string;
    type: ArtifactType;
    summary: string;
    status?: string;
    tags?: string[];
    data?: Artifact['data'];
}

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    recommendedFor?: string[];
    relatedCategoryIds?: string[];
    projectTags: string[];
    artifacts: TemplateArtifactBlueprint[];
}

export interface TemplateEntry {
    id: string;
    name: string;
    type: ArtifactType;
    description: string;
    tags?: string[];
    blueprint?: TemplateArtifactBlueprint;
}

export interface TemplateCategory {
    id: string;
    title: string;
    description: string;
    recommendedFor: string[];
    relatedProjectTemplateIds?: string[];
    templates: TemplateEntry[];
}

export type MilestoneMetric =
    | 'graph-core'
    | 'view-engagement'
    | 'csv-flows'
    | 'github-import'
    | 'rich-editors'
    | 'progression-loops'
    | 'markdown-export'
    | 'static-site'
    | 'release-notes'
    | 'search-filters'
    | 'magic-systems'
    | 'world-age'
    | 'faction-conflicts'
    | 'npc-memory'
    | 'plugin-api'
    | 'theming-offline';

export interface MilestoneObjective {
    id: string;
    description: string;
    metric?: MilestoneMetric;
}

export interface Milestone {
    id: string;
    title: string;
    timeline: string;
    focus: string;
    objectives: MilestoneObjective[];
}

export interface AIAssistant {
    id: string;
    name: string;
    description: string;
    focus: string;
    promptSlots: string[];
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserSettings {
    theme: ThemePreference;
    aiTipsEnabled: boolean;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    xp: number;
    streakCount: number;
    bestStreak: number;
    lastActiveDate?: string;
    achievementsUnlocked: string[];
    questlinesClaimed: string[];
    settings: UserSettings;
}

export const PROJECT_COMPONENT_KEYS = [
  'projectHero',
  'projectOverview',
  'quickFactsPanel',
  'projectInsights',
  'aiCopilot',
  'narrativeHealth',
  'continuityMonitor',
  'worldSimulation',
  'inspirationDeck',
  'memorySync',
  'openTasks',
  'narrativePipeline',
  'characterArcTracker',
  'familyTreeTools',
  'milestoneTracker',
  'artifactExplorer',
  'githubImport',
  'templates',
  'releaseWorkflows',
] as const;

export type ProjectComponentKey = typeof PROJECT_COMPONENT_KEYS[number];

export type ProjectFeatureGroup = 'summary' | 'analytics' | 'tracking' | 'distribution';

export type ProjectVisibilitySettings = Record<ProjectComponentKey, boolean>;

export type TutorialLanguage = 'en' | 'es';

export interface TutorialLanguageOption {
  code: TutorialLanguage;
  label: string;
}

export interface TutorialStep {
  title: string;
  explanation: string;
  action: string;
  target: string;
  prefill?: { [key: string]: string };
  showNextButton?: boolean;
  advanceEvent?: 'click' | 'submit';
}

export type NarrativeNeedStatus = 'thriving' | 'steady' | 'cooling' | 'at-risk';

export interface NarrativeNeed {
  artifactId: string;
  artifactTitle: string;
  artifactType: ArtifactType;
  status: NarrativeNeedStatus;
  appearances: number;
  supportLinks: number;
  summaryLength: number;
  tagCount: number;
}

export type ContinuityWarningSeverity = 'info' | 'caution' | 'alert';

export interface ContinuityWarning {
  id: string;
  severity: ContinuityWarningSeverity;
  message: string;
  recommendation: string;
  relatedArtifactIds: string[];
}

export type InspirationCardSuit = 'Character' | 'Setting' | 'Conflict' | 'Lore' | 'Sensory';

export interface InspirationCard {
  id: string;
  suit: InspirationCardSuit;
  title: string;
  prompt: string;
  detail: string;
  tags: string[];
}

export type MemorySyncStatus = 'pending' | 'approved' | 'rejected';

export type MemorySyncScope = 'npc' | 'global';

export type CanonicalSensitivityLevel = 'low' | 'moderate' | 'high';

export interface MemorySyncSuggestion {
  id: string;
  statement: string;
  rationale: string;
  status: MemorySyncStatus;
  createdAt: string;
  updatedAt?: string;
  artifactId?: string;
  artifactTitle?: string;
  tags?: string[];
  canonicalSensitivity: CanonicalSensitivityLevel;
}

export type ConversationRole = 'creator' | 'gemini';

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  text: string;
  timestamp: string;
}

export interface MemorySyncConversation {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  scope: MemorySyncScope;
  updatedAt: string;
  lastSyncedAt?: string;
  transcript: ConversationMessage[];
  suggestions: MemorySyncSuggestion[];
}

export interface NpcMemoryRun {
  id: string;
  projectId: string;
  npcArtifactId: string;
  npcName: string;
  npcType: ArtifactType.Character | ArtifactType.Faction;
  scope: MemorySyncScope;
  pendingSuggestions: number;
  approvedSuggestions: number;
  highestCanonicalSensitivity: CanonicalSensitivityLevel;
  lastRunAt?: string;
  lastApprovedAt?: string;
}
