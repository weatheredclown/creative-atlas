
export enum ProjectStatus {
  Idea = 'idea',
  Active = 'active',
  Paused = 'paused',
  Archived = 'archived',
}

export interface Project {
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

export interface Artifact {
  id: string;
  projectId: string;
  type: ArtifactType;
  title:string;
  summary: string;
  status: string; // e.g., 'draft', 'complete'
  tags: string[];
  relations: Relation[];
  // A flexible field for type-specific data
  data: ConlangLexeme[] | Scene[] | TaskData | CharacterData | WikiData | LocationData | Record<string, any>;
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
