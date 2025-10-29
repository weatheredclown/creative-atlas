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
