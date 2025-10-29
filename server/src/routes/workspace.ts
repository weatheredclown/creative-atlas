import { Router } from 'express';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { firestore } from '../firebaseAdmin.js';
import type { AuthenticatedRequest } from '../middleware/authenticate.js';
import { authenticate } from '../middleware/authenticate.js';
import { z } from 'zod';
import {
  exportArtifactsToDelimited,
  exportArtifactsToMarkdown,
  exportLexemesToCsv,
  exportLexemesToMarkdown,
  importArtifactsFromCsv,
  parseConlangLexemesFromCsv,
  parseConlangLexemesFromMarkdown,
  timestampToIso,
} from '../utils/importExport.js';
import type { Artifact, ConlangLexeme, Project } from '../types.js';

const router = Router();

router.use(authenticate);

const projectSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  summary: z.string().default(''),
  status: z.string().default('active'),
  tags: z.array(z.string()).default([]),
});

const projectUpdateSchema = projectSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided for update.',
});

const relationSchema = z.object({
  toId: z.string().min(1),
  kind: z.string().min(1),
});

const artifactSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().default(''),
  status: z.string().default('idea'),
  tags: z.array(z.string()).default([]),
  relations: z.array(relationSchema).default([]),
  data: z.unknown().optional(),
});

const artifactUpdateSchema = artifactSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided for update.',
});

const encodePageToken = (title: string, id: string) =>
  Buffer.from(JSON.stringify({ title, id }), 'utf8').toString('base64url');

const decodePageToken = (token: string): { title: string; id: string } | null => {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (typeof parsed?.title === 'string' && typeof parsed?.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const mapProject = (doc: QueryDocumentSnapshot | DocumentSnapshot, ownerId: string): Project => {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    ownerId,
    title: typeof data.title === 'string' ? data.title : 'Untitled Project',
    summary: typeof data.summary === 'string' ? data.summary : '',
    status: typeof data.status === 'string' ? data.status : 'active',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
};

const mapArtifact = (doc: QueryDocumentSnapshot | DocumentSnapshot, ownerId: string): Artifact => {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    ownerId,
    projectId: typeof data.projectId === 'string' ? data.projectId : '',
    type: typeof data.type === 'string' ? data.type : 'Unknown',
    title: typeof data.title === 'string' ? data.title : 'Untitled Artifact',
    summary: typeof data.summary === 'string' ? data.summary : '',
    status: typeof data.status === 'string' ? data.status : 'idea',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    relations: Array.isArray(data.relations) ? (data.relations as Artifact['relations']) : [],
    data: data.data ?? {},
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
};

router.get('/projects', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const pageSize = Math.min(Math.max(Number.parseInt(String(req.query.pageSize ?? '25'), 10) || 25, 1), 100);
  const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;

  let query = firestore
    .collection('projects')
    .where('ownerId', '==', uid)
    .orderBy('title')
    .orderBy(FieldPath.documentId())
    .limit(pageSize + 1);

  if (pageToken) {
    const cursor = decodePageToken(pageToken);
    if (cursor) {
      query = query.startAfter(cursor.title, cursor.id);
    }
  }

  const snapshot = await query.get();
  const projects = snapshot.docs.slice(0, pageSize).map((doc) => mapProject(doc, uid));
  const nextDoc = snapshot.docs[pageSize];
  const nextPageToken = nextDoc ? encodePageToken(String(nextDoc.get('title') ?? ''), nextDoc.id) : undefined;

  res.json({ projects, nextPageToken });
});

router.post('/projects', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const parsed = projectSchema.parse(req.body);
  const docRef = parsed.id
    ? firestore.collection('projects').doc(parsed.id)
    : firestore.collection('projects').doc();

  const payload = {
    ownerId: uid,
    title: parsed.title,
    summary: parsed.summary ?? '',
    status: parsed.status ?? 'active',
    tags: parsed.tags ?? [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(payload, { merge: false });
  const snapshot = await docRef.get();
  res.status(201).json(mapProject(snapshot, uid));
});

router.patch('/projects/:id', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const parsed = projectUpdateSchema.parse(req.body);
  const docRef = firestore.collection('projects').doc(req.params.id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (snapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (parsed.title !== undefined) update.title = parsed.title;
  if (parsed.summary !== undefined) update.summary = parsed.summary;
  if (parsed.status !== undefined) update.status = parsed.status;
  if (parsed.tags !== undefined) update.tags = parsed.tags;

  await docRef.set(update, { merge: true });
  const updated = await docRef.get();
  res.json(mapProject(updated, uid));
});

router.delete('/projects/:id', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const docRef = firestore.collection('projects').doc(req.params.id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (snapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await docRef.delete();
  res.status(204).send();
});

router.get('/projects/:projectId/artifacts', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { projectId } = req.params;
  const pageSize = Math.min(Math.max(Number.parseInt(String(req.query.pageSize ?? '50'), 10) || 50, 1), 200);
  const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;

  let query = firestore
    .collection('artifacts')
    .where('ownerId', '==', uid)
    .where('projectId', '==', projectId)
    .orderBy('title')
    .orderBy(FieldPath.documentId())
    .limit(pageSize + 1);

  if (pageToken) {
    const cursor = decodePageToken(pageToken);
    if (cursor) {
      query = query.startAfter(cursor.title, cursor.id);
    }
  }

  const snapshot = await query.get();
  const artifacts = snapshot.docs.slice(0, pageSize).map((doc) => mapArtifact(doc, uid));
  const nextDoc = snapshot.docs[pageSize];
  const nextPageToken = nextDoc ? encodePageToken(String(nextDoc.get('title') ?? ''), nextDoc.id) : undefined;

  res.json({ artifacts, nextPageToken });
});

router.post('/projects/:projectId/artifacts', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { projectId } = req.params;
  const bodySchema = z.object({ artifacts: z.array(artifactSchema) });
  const parsed = bodySchema.parse(req.body);

  const created: Artifact[] = [];

  await firestore.runTransaction(async (transaction) => {
    parsed.artifacts.forEach((artifactInput, index) => {
      const docRef = artifactInput.id
        ? firestore.collection('artifacts').doc(artifactInput.id)
        : firestore.collection('artifacts').doc();

      const artifact: Artifact = {
        id: docRef.id,
        ownerId: uid,
        projectId,
        type: artifactInput.type,
        title: artifactInput.title,
        summary: artifactInput.summary ?? '',
        status: artifactInput.status ?? 'idea',
        tags: artifactInput.tags ?? [],
        relations: artifactInput.relations ?? [],
        data: artifactInput.data ?? {},
      };

      transaction.set(docRef, {
        ownerId: uid,
        projectId,
        type: artifact.type,
        title: artifact.title,
        summary: artifact.summary,
        status: artifact.status,
        tags: artifact.tags,
        relations: artifact.relations,
        data: artifact.data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      created.push({ ...artifact });
    });
  });

  res.status(201).json({ artifacts: created });
});

router.patch('/artifacts/:artifactId', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const parsed = artifactUpdateSchema.parse(req.body);
  const docRef = firestore.collection('artifacts').doc(req.params.artifactId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'Artifact not found' });
  }
  if (snapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (parsed.title !== undefined) update.title = parsed.title;
  if (parsed.summary !== undefined) update.summary = parsed.summary;
  if (parsed.status !== undefined) update.status = parsed.status;
  if (parsed.tags !== undefined) update.tags = parsed.tags;
  if (parsed.relations !== undefined) update.relations = parsed.relations;
  if (parsed.data !== undefined) update.data = parsed.data;

  await docRef.set(update, { merge: true });
  const updated = await docRef.get();
  res.json(mapArtifact(updated, uid));
});

router.delete('/artifacts/:artifactId', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const docRef = firestore.collection('artifacts').doc(req.params.artifactId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'Artifact not found' });
  }
  if (snapshot.get('ownerId') !== uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await docRef.delete();
  res.status(204).send();
});

router.post('/projects/:projectId/import-artifacts', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { projectId } = req.params;
  const bodySchema = z.object({ content: z.string().min(1) });
  const { content } = bodySchema.parse(req.body);

  const artifacts = importArtifactsFromCsv(content, projectId, uid);
  const persisted: Artifact[] = [];

  await firestore.runTransaction(async (transaction) => {
    artifacts.forEach((artifact) => {
      const docRef = firestore.collection('artifacts').doc(artifact.id);
      transaction.set(docRef, {
        ownerId: uid,
        projectId: artifact.projectId,
        type: artifact.type,
        title: artifact.title,
        summary: artifact.summary,
        status: artifact.status,
        tags: artifact.tags,
        relations: artifact.relations,
        data: artifact.data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      persisted.push({ ...artifact });
    });
  });

  res.json({ artifacts: persisted });
});

router.get('/projects/:projectId/export', async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { projectId } = req.params;
  const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'csv';

  const projectSnap = await firestore.collection('projects').doc(projectId).get();
  if (!projectSnap.exists || projectSnap.get('ownerId') !== uid) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const artifactsSnapshot = await firestore
    .collection('artifacts')
    .where('ownerId', '==', uid)
    .where('projectId', '==', projectId)
    .get();

  const project = mapProject(projectSnap, uid);
  const artifacts = artifactsSnapshot.docs.map((doc) => mapArtifact(doc, uid));

  if (format === 'markdown') {
    const markdown = exportArtifactsToMarkdown(project, artifacts);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/\s+/g, '_')}.md"`);
    return res.send(markdown);
  }

  const delimiter = format === 'tsv' ? '\t' : ',';
  const file = exportArtifactsToDelimited(artifacts, delimiter as ',' | '\t');
  res.setHeader('Content-Type', format === 'tsv' ? 'text/tab-separated-values; charset=utf-8' : 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/\s+/g, '_')}.${format === 'tsv' ? 'tsv' : 'csv'}"`);
  res.send(file);
});

router.post('/lexicon/import/csv', async (req: AuthenticatedRequest, res) => {
  const bodySchema = z.object({ content: z.string().min(1) });
  const { content } = bodySchema.parse(req.body);
  const lexemes = parseConlangLexemesFromCsv(content);
  res.json({ lexemes });
});

router.post('/lexicon/import/markdown', async (req: AuthenticatedRequest, res) => {
  const bodySchema = z.object({ content: z.string().min(1) });
  const { content } = bodySchema.parse(req.body);
  const lexemes = parseConlangLexemesFromMarkdown(content);
  res.json({ lexemes });
});

router.post('/lexicon/export', async (req: AuthenticatedRequest, res) => {
  const bodySchema = z.object({ lexemes: z.array(z.object({
    id: z.string().optional(),
    lemma: z.string(),
    pos: z.string().default(''),
    gloss: z.string().default(''),
    etymology: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })), format: z.enum(['csv', 'markdown']).default('csv') });

  const { lexemes, format } = bodySchema.parse(req.body);
  const mapped: ConlangLexeme[] = lexemes.map((lexeme, index) => ({
    id: lexeme.id ?? `lex-${index}`,
    lemma: lexeme.lemma,
    pos: lexeme.pos ?? '',
    gloss: lexeme.gloss ?? '',
    etymology: lexeme.etymology,
    tags: lexeme.tags ?? [],
  }));

  if (format === 'markdown') {
    const markdown = exportLexemesToMarkdown(mapped);
    return res
      .setHeader('Content-Type', 'text/markdown; charset=utf-8')
      .send(markdown);
  }

  const csv = exportLexemesToCsv(mapped);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(csv);
});

export default router;
