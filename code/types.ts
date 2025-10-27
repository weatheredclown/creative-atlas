
export enum ProjectStatus {
  Idea = 'idea',
  Active = 'active',
  Paused = 'paused',
  Archived = 'archived',
}

export interface TimestampedEntity {
  createdAt: string;
  updatedAt: string;
}

export interface OwnedEntity extends TimestampedEntity {
  ownerId: string;
}

export interface Project extends OwnedEntity {
  id: string;
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

export interface Artifact extends OwnedEntity {
  id: string;
  projectId: string;
  type: ArtifactType;
  title:string;
  summary: string;
  status: string; // e.g., 'draft', 'complete'
  tags: string[];
  relations: Relation[];
  // A flexible field for type-specific data
  data: ConlangLexeme[] | Scene[] | TaskData | CharacterData | WikiData | LocationData | Record<string, unknown>;
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

export interface TemplateEntry {
    id: string;
    name: string;
    description: string;
    tags?: string[];
}

export interface TemplateCategory {
    id: string;
    title: string;
    description: string;
    recommendedFor: string[];
    templates: TemplateEntry[];
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

export interface UserAccount extends TimestampedEntity {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
}

export interface UserSettings extends TimestampedEntity {
  userId: string;
  xp: number;
  achievementIds: string[];
  lastQuestReset: string;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}
