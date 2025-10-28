
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

export enum ArtifactType {
  Story = 'Story',
  Character = 'Character',
  Location = 'Location',
  Conlang = 'Conlang',
  Game = 'Game',
  Wiki = 'Wiki',
  Scene = 'Scene',
  Faction = 'Faction',
  MagicSystem = 'MagicSystem',
  Task = 'Task',
  Repository = 'Repository',
  Issue = 'Issue',
  Release = 'Release',
}

export enum TaskState {
    Todo = 'Todo',
    InProgress = 'In Progress',
    Done = 'Done',
}

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
    | Record<string, unknown>;
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
    projectTags: string[];
    libraryCategoryIds?: string[];
    artifacts: TemplateArtifactBlueprint[];
}

export interface TemplateEntry {
    id: string;
    name: string;
    description: string;
    tags?: string[];
    blueprint?: TemplateArtifactBlueprint;
}

export interface TemplateCategory {
    id: string;
    title: string;
    description: string;
    recommendedFor: string[];
    templates: TemplateEntry[];
    projectTemplateIds?: string[];
}

export interface Milestone {
    id: string;
    title: string;
    timeline: string;
    focus: string;
    objectives: string[];
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
    achievementsUnlocked: string[];
    settings: UserSettings;
}
