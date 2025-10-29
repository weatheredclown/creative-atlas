import { Timestamp } from 'firebase-admin/firestore';
import type { Artifact, ConlangLexeme, Project, Relation } from '../types.js';

const TAB_DELIMITER = '\t';

const parseCsvRow = (row: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};

export const importArtifactsFromCsv = (
  csvString: string,
  currentProjectId: string,
  ownerId: string,
): Artifact[] => {
  const rows = csvString
    .split(/\r?\n/)
    .map((row) => row.trimEnd())
    .filter((row) => row.trim() !== '');

  if (rows.length < 2) {
    throw new Error('CSV file must have a header and at least one data row.');
  }

  const delimiter = rows[0].includes(TAB_DELIMITER) ? TAB_DELIMITER : ',';
  const header = parseCsvRow(rows[0], delimiter).map((cell) => cell.trim().toLowerCase());
  const requiredHeaders = ['id', 'type', 'title'];

  if (!requiredHeaders.every((h) => header.includes(h))) {
    throw new Error(`CSV header is missing required columns. Must include: ${requiredHeaders.join(', ')}`);
  }

  const artifacts: Artifact[] = [];

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw) continue;

    const values = parseCsvRow(raw, delimiter);
    const rowData: Record<string, string> = {};
    header.forEach((column, index) => {
      rowData[column] = values[index] ?? '';
    });

    const id = rowData.id?.trim() || `art-${Date.now()}-${i}`;
    const type = rowData.type?.trim();
    const title = rowData.title?.trim() ?? '';

    if (!type) {
      console.warn(`Skipping row ${i + 1}: missing artifact type.`);
      continue;
    }

    const tags = rowData.tags
      ? rowData.tags
          .split(';')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    const relations: Relation[] = (rowData.relations ?? '')
      .split(';')
      .map((entry) => entry.trim())
      .filter((entry) => entry.includes(':'))
      .map((entry) => {
        const [kind, toId] = entry.split(':');
        return { kind: kind.trim(), toId: toId.trim() };
      });

    let parsedData: unknown = {};
    const rawData = rowData.data?.trim();
    if (rawData) {
      try {
        parsedData = JSON.parse(rawData);
      } catch {
        console.warn(`Failed to parse data payload for artifact ${id}.`);
      }
    }

    artifacts.push({
      id,
      ownerId,
      projectId: rowData.projectid?.trim() || currentProjectId,
      type,
      title,
      summary: rowData.summary ?? '',
      status: rowData.status ?? 'idea',
      tags,
      relations,
      data: parsedData,
    });
  }

  return artifacts;
};

export const exportArtifactsToDelimited = (
  artifacts: Artifact[],
  delimiter: ',' | '\t',
): string => {
  const headers = ['id', 'type', 'projectId', 'title', 'summary', 'status', 'tags', 'relations', 'data'];
  const rows = [headers.join(delimiter)];

  const escapeCell = (value: unknown) => {
    const cell = String(value ?? '');
    if (cell.includes(delimiter === '\t' ? '\t' : ',') || cell.includes('"') || cell.includes('\n') || cell.includes('\t')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  artifacts.forEach((artifact) => {
    const relations = artifact.relations.map((relation) => `${relation.kind}:${relation.toId}`).join(';');
    const data = (() => {
      try {
        return JSON.stringify(artifact.data ?? {});
      } catch {
        return '{}';
      }
    })();

    rows.push(
      [
        escapeCell(artifact.id),
        escapeCell(artifact.type),
        escapeCell(artifact.projectId),
        escapeCell(artifact.title),
        escapeCell(artifact.summary),
        escapeCell(artifact.status),
        escapeCell(artifact.tags.join(';')),
        escapeCell(relations),
        escapeCell(data),
      ].join(delimiter),
    );
  });

  return rows.join('\n');
};

export const exportArtifactsToMarkdown = (project: Project, artifacts: Artifact[]): string => {
  const lines: string[] = [];
  lines.push(`# ${project.title}`);
  lines.push('');
  lines.push(project.summary || '');
  lines.push('');

  artifacts.forEach((artifact) => {
    lines.push(`## ${artifact.title}`);
    if (artifact.summary) {
      lines.push('');
      lines.push(artifact.summary);
      lines.push('');
    }
    lines.push('```json');
    lines.push(JSON.stringify(artifact.data ?? {}, null, 2));
    lines.push('```');
    lines.push('');
  });

  return lines.join('\n');
};

export const parseConlangLexemesFromCsv = (csv: string): Omit<ConlangLexeme, 'id'>[] => {
  const rows = csv
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one lexeme.');
  }

  const delimiter = rows[0].includes(TAB_DELIMITER) ? TAB_DELIMITER : ',';
  const header = parseCsvRow(rows[0], delimiter).map((cell) => cell.trim().toLowerCase());
  const lemmaIndex = header.indexOf('lemma');
  const posIndex = header.indexOf('pos');
  const glossIndex = header.indexOf('gloss');
  const etymologyIndex = header.indexOf('etymology');
  const tagsIndex = header.indexOf('tags');

  if (lemmaIndex === -1 || glossIndex === -1) {
    throw new Error('CSV header must include at least lemma and gloss columns.');
  }

  return rows.slice(1).map((row) => {
    const cells = parseCsvRow(row, delimiter).map((cell) => cell.trim());
    const tags =
      tagsIndex >= 0
        ? cells[tagsIndex]
            ?.split(/[,;]/)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : undefined;
    return {
      lemma: cells[lemmaIndex] ?? '',
      pos: posIndex >= 0 ? cells[posIndex] ?? '' : '',
      gloss: cells[glossIndex] ?? '',
      etymology: etymologyIndex >= 0 ? cells[etymologyIndex] || undefined : undefined,
      tags,
    };
  });
};

export const parseConlangLexemesFromMarkdown = (markdown: string): Omit<ConlangLexeme, 'id'>[] => {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  if (lines.length < 3) {
    throw new Error('Markdown table must include a header, separator, and at least one row.');
  }

  const headers = lines[0]
    .slice(1, lines[0].endsWith('|') ? -1 : undefined)
    .split('|')
    .map((cell) => cell.trim().toLowerCase());

  const lemmaIndex = headers.indexOf('lemma');
  const posIndex = headers.indexOf('part of speech') !== -1 ? headers.indexOf('part of speech') : headers.indexOf('pos');
  const glossIndex = headers.indexOf('gloss');
  const etymologyIndex = headers.indexOf('etymology');
  const tagsIndex = headers.indexOf('tags');

  if (lemmaIndex === -1 || glossIndex === -1) {
    throw new Error('Markdown table must include lemma and gloss columns.');
  }

  return lines.slice(2).map((line) => {
    const trimmed = line.slice(1, line.endsWith('|') ? -1 : undefined);
    const cells = trimmed.split('|').map((cell) => cell.trim());
    const tags =
      tagsIndex >= 0
        ? cells[tagsIndex]
            ?.split(/[,;]/)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : undefined;

    return {
      lemma: cells[lemmaIndex] ?? '',
      pos: posIndex >= 0 ? cells[posIndex] ?? '' : '',
      gloss: cells[glossIndex] ?? '',
      etymology: etymologyIndex >= 0 ? cells[etymologyIndex] || undefined : undefined,
      tags,
    };
  });
};

export const exportLexemesToCsv = (lexemes: ConlangLexeme[]): string => {
  const headers = ['lemma', 'pos', 'gloss', 'etymology', 'tags'];
  const rows = [headers.join(',')];

  lexemes.forEach((lexeme) => {
    const tags = (lexeme.tags ?? []).join(';');
    const escape = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    rows.push(
      [lexeme.lemma, lexeme.pos, lexeme.gloss, lexeme.etymology ?? '', tags].map((cell) => escape(cell ?? '')).join(','),
    );
  });

  return rows.join('\n');
};

export const exportLexemesToMarkdown = (lexemes: ConlangLexeme[]): string => {
  const lines: string[] = [];
  lines.push('| Lemma | Part of Speech | Gloss | Etymology | Tags |');
  lines.push('| --- | --- | --- | --- | --- |');
  lexemes.forEach((lexeme) => {
    lines.push(
      `| ${lexeme.lemma} | ${lexeme.pos} | ${lexeme.gloss} | ${lexeme.etymology ?? ''} | ${(lexeme.tags ?? []).join('; ')} |`,
    );
  });
  return lines.join('\n');
};

export const timestampToIso = (timestamp: FirebaseFirestore.Timestamp | Timestamp | undefined): string | undefined => {
  if (!timestamp) return undefined;
  if ('toDate' in timestamp) {
    return timestamp.toDate().toISOString();
  }
  return undefined;
};
