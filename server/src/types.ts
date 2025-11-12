export interface Relation {
  toId: string;
  kind: string;
}

export interface Artifact {
  id: string;
  ownerId: string;
  projectId: string;
  type: string;
  title: string;
  summary: string;
  status: string;
  tags: string[];
  relations: Relation[];
  data: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  summary: string;
  status: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ConlangLexeme {
  id: string;
  lemma: string;
  pos: string;
  gloss: string;
  etymology?: string;
  tags?: string[];
}

export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
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
  createdAt?: string;
  updatedAt?: string;
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
  npcType: string;
  scope: MemorySyncScope;
  pendingSuggestions: number;
  approvedSuggestions: number;
  highestCanonicalSensitivity: CanonicalSensitivityLevel;
  lastRunAt?: string;
  lastApprovedAt?: string;
}
