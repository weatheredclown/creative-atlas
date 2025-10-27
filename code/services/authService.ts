import { atlasDb } from './atlasDatabase';
import { AuthSession, UserAccount } from '../types';
import { sessionSchema, userAccountSchema } from './validation';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const hashPassword = async (password: string): Promise<string> => {
  const data = encoder.encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
};

const createToken = (): string => {
  const random = crypto.getRandomValues(new Uint8Array(32));
  return toHex(random.buffer);
};

export const registerUser = async (email: string, password: string, displayName: string): Promise<UserAccount> => {
  const existing = await atlasDb.users.where('email').equals(email.toLowerCase()).first();
  if (existing) {
    throw new Error('An account with this email already exists.');
  }
  const now = new Date().toISOString();
  const record = userAccountSchema.parse({
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    displayName,
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  });
  await atlasDb.users.put(record);
  return record;
};

export const authenticateUser = async (email: string, password: string): Promise<{ user: UserAccount; session: AuthSession }> => {
  const user = await atlasDb.users.where('email').equals(email.toLowerCase()).first();
  if (!user) {
    throw new Error('Invalid email or password.');
  }
  const expectedHash = await hashPassword(password);
  if (expectedHash !== user.passwordHash) {
    throw new Error('Invalid email or password.');
  }
  const session = await createSession(user.id);
  return { user, session };
};

export const createSession = async (userId: string): Promise<AuthSession> => {
  const now = Date.now();
  const payload = sessionSchema.parse({
    token: createToken(),
    userId,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  });
  await atlasDb.sessions.put(payload);
  return payload;
};

export const getSession = async (token: string): Promise<AuthSession | null> => {
  const session = await atlasDb.sessions.get(token);
  if (!session) {
    return null;
  }
  if (Date.parse(session.expiresAt) < Date.now()) {
    await atlasDb.sessions.delete(token);
    return null;
  }
  return session;
};

export const invalidateSession = async (token: string): Promise<void> => {
  await atlasDb.sessions.delete(token);
};

export const getUserById = async (id: string): Promise<UserAccount | undefined> => {
  return atlasDb.users.get(id);
};

export const getUserBySessionToken = async (token: string): Promise<UserAccount | null> => {
  const session = await getSession(token);
  if (!session) {
    return null;
  }
  const user = await getUserById(session.userId);
  return user ?? null;
};

export const bootstrapDemoAccount = async (): Promise<UserAccount> => {
  const existing = await atlasDb.users.where('email').equals('demo@creative-atlas.app').first();
  if (existing) {
    return existing;
  }
  const demoPassword = 'demo-pass-1234';
  const now = new Date().toISOString();
  const record = userAccountSchema.parse({
    id: 'demo-user',
    email: 'demo@creative-atlas.app',
    displayName: 'Demo Creator',
    passwordHash: await hashPassword(demoPassword),
    createdAt: now,
    updatedAt: now,
  });
  await atlasDb.users.put(record);
  return record;
};
