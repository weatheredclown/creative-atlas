import Dexie, { Table } from 'dexie';
import { Artifact, Project, UserAccount, UserSettings } from '../types';

export interface ProjectRecord extends Project {}
export interface ArtifactRecord extends Artifact {}
export interface UserRecord extends UserAccount {}
export interface SettingsRecord extends UserSettings {}

class AtlasDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>;
  artifacts!: Table<ArtifactRecord, string>;
  users!: Table<UserRecord, string>;
  sessions!: Table<{ token: string; userId: string; expiresAt: string; issuedAt: string }, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super('creative-atlas');
    this.version(1).stores({
      projects: 'id, ownerId, updatedAt',
      artifacts: 'id, projectId, ownerId, type, updatedAt',
      users: 'id, email',
      sessions: 'token, userId, expiresAt',
      settings: 'userId',
    });
  }
}

export const atlasDb = new AtlasDatabase();
