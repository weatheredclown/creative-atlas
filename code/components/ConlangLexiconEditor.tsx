import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Artifact, ConlangLexeme } from '../types';
import { generateLexemes } from '../services/geminiService';
import { SparklesIcon, Spinner } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import {
  exportLexiconViaApi,
  isDataApiConfigured,
  parseLexiconCsvViaApi,
  parseLexiconMarkdownViaApi,
} from '../services/dataApi';

interface ConlangLexiconEditorProps {
  artifact: Artifact;
  conlangName: string;
  onLexemesChange: (artifactId: string, lexemes: ConlangLexeme[]) => void;
  addXp: (amount: number) => void;
}

type EditableLexemeField = 'lemma' | 'pos' | 'gloss' | 'etymology' | 'tags';

const getLexemeKey = (lemma: string, pos: string) => `${lemma.toLowerCase()}::${pos.toLowerCase()}`;

const cloneLexeme = (lexeme: ConlangLexeme): ConlangLexeme => ({
  ...lexeme,
  tags: Array.isArray(lexeme.tags) ? [...lexeme.tags] : undefined,
});

const ConlangLexiconEditor: React.FC<ConlangLexiconEditorProps> = ({ artifact, conlangName, onLexemesChange, addXp }) => {
  const [theme, setTheme] = useState<string>('nature');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLexemes, setDraftLexemes] = useState<ConlangLexeme[]>([]);
  const [newLexeme, setNewLexeme] = useState<{ lemma: string; pos: string; gloss: string; etymology: string; tags: string }>(
    {
      lemma: '',
      pos: '',
      gloss: '',
      etymology: '',
      tags: '',
    },
  );
  const [showMarkdownImport, setShowMarkdownImport] = useState(false);
  const [markdownImport, setMarkdownImport] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getIdToken, isGuestMode } = useAuth();
  const dataApiEnabled = isDataApiConfigured && !isGuestMode;
  const downloadText = useCallback((content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const baseLexemes = useMemo(
    () => (Array.isArray(artifact.data) ? (artifact.data as ConlangLexeme[]) : []),
    [artifact.data],
  );

  useEffect(() => {
    setDraftLexemes(baseLexemes.map(cloneLexeme));
  }, [baseLexemes]);

  const commitLexemeUpdate = useCallback(
    (updater: (current: ConlangLexeme[]) => ConlangLexeme[]) => {
      setDraftLexemes((current) => {
        const updated = updater(current);
        const normalized = updated.map((lexeme) => {
          const trimmedEtymology = lexeme.etymology?.trim();
          const normalizedTags = Array.isArray(lexeme.tags)
            ? lexeme.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
            : undefined;
          return {
            ...lexeme,
            lemma: lexeme.lemma,
            pos: lexeme.pos,
            gloss: lexeme.gloss,
            etymology: trimmedEtymology && trimmedEtymology.length > 0 ? trimmedEtymology : undefined,
            tags: normalizedTags && normalizedTags.length > 0 ? normalizedTags : undefined,
          };
        });
        onLexemesChange(artifact.id, normalized);
        return normalized;
      });
    },
    [artifact.id, onLexemesChange],
  );

  const handleLexemeFieldChange = useCallback(
    (lexemeId: string, field: EditableLexemeField, value: string) => {
      if (field === 'lemma' || field === 'pos') {
        const target = draftLexemes.find((lexeme) => lexeme.id === lexemeId);
        if (target) {
          const nextLemma = field === 'lemma' ? value : target.lemma;
          const nextPos = field === 'pos' ? value : target.pos;
          const nextKey = getLexemeKey(nextLemma.trim(), nextPos.trim());
          const conflict = draftLexemes.some(
            (lexeme) => lexeme.id !== lexemeId && getLexemeKey(lexeme.lemma, lexeme.pos) === nextKey,
          );
          if (conflict) {
            setError('A lexeme with the same lemma and part of speech already exists.');
            return;
          }
        }
      }

      commitLexemeUpdate((current) =>
        current.map((lexeme) => {
          if (lexeme.id !== lexemeId) return lexeme;
          if (field === 'tags') {
            const tags = value
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0);
            return {
              ...lexeme,
              tags: tags.length > 0 ? tags : undefined,
            };
          }
          if (field === 'etymology') {
            const trimmed = value.trim();
            return {
              ...lexeme,
              etymology: trimmed.length > 0 ? trimmed : undefined,
            };
          }
          return {
            ...lexeme,
            [field]: value,
          } as ConlangLexeme;
        }),
      );
      setError(null);
    },
    [commitLexemeUpdate, draftLexemes],
  );

  const handleDeleteLexeme = useCallback(
    (lexemeId: string) => {
      commitLexemeUpdate((current) => current.filter((lexeme) => lexeme.id !== lexemeId));
      setError(null);
    },
    [commitLexemeUpdate],
  );

  const handleAddManualLexeme = useCallback(() => {
    const lemma = newLexeme.lemma.trim();
    const pos = newLexeme.pos.trim();
    const gloss = newLexeme.gloss.trim();
    const etymology = newLexeme.etymology.trim();
    const tags = newLexeme.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (!lemma || !gloss) {
      setError('Lemma and gloss are required to add a lexeme.');
      return;
    }

    const newKey = getLexemeKey(lemma, pos);
    if (draftLexemes.some((lexeme) => getLexemeKey(lexeme.lemma, lexeme.pos) === newKey)) {
      setError('A lexeme with the same lemma and part of speech already exists.');
      return;
    }

    const timestamp = Date.now();
    const lexemeToAdd: ConlangLexeme = {
      id: `lex-${timestamp}`,
      lemma,
      pos,
      gloss,
      etymology: etymology.length > 0 ? etymology : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    commitLexemeUpdate((current) => [...current, lexemeToAdd]);
    setNewLexeme({ lemma: '', pos: '', gloss: '', etymology: '', tags: '' });
    setError(null);
    addXp(5); // XP Source: manually forge a lexeme (+5)
  }, [addXp, commitLexemeUpdate, draftLexemes, newLexeme]);

  const escapeCsvCell = useCallback((cell: string | string[] | undefined): string => {
    const cellValue = Array.isArray(cell) ? cell.join('; ') : cell ?? '';
    if (/[",\n]/.test(cellValue)) {
      return `"${cellValue.replace(/"/g, '""')}"`;
    }
    return cellValue;
  }, []);

  const handleExportCsv = useCallback(async () => {
    if (draftLexemes.length === 0) {
      setError('No lexemes available to export yet.');
      return;
    }

    if (dataApiEnabled) {
      const token = await getIdToken();
      if (token) {
        try {
          const csvContent = await exportLexiconViaApi(token, draftLexemes, 'csv');
          downloadText(csvContent, 'text/csv', `${conlangName.toLowerCase().replace(/\s+/g, '_')}_lexicon.csv`);
          setError(null);
          return;
        } catch (error) {
          console.error('Data API lexicon CSV export failed, falling back to client export', error);
        }
      }
    }

    const header = ['lemma', 'pos', 'gloss', 'etymology', 'tags'];
    const rows = draftLexemes.map((lexeme) =>
      [
        escapeCsvCell(lexeme.lemma),
        escapeCsvCell(lexeme.pos),
        escapeCsvCell(lexeme.gloss),
        escapeCsvCell(lexeme.etymology),
        escapeCsvCell(lexeme.tags),
      ].join(','),
    );
    const csvContent = [header.join(','), ...rows].join('\n');
    downloadText(csvContent, 'text/csv', `${conlangName.toLowerCase().replace(/\s+/g, '_')}_lexicon.csv`);
    setError(null);
  }, [conlangName, draftLexemes, escapeCsvCell, dataApiEnabled, getIdToken, downloadText]);

  const handleExportMarkdown = useCallback(async () => {
    if (draftLexemes.length === 0) {
      setError('No lexemes available to export yet.');
      return;
    }

    if (dataApiEnabled) {
      const token = await getIdToken();
      if (token) {
        try {
          const markdown = await exportLexiconViaApi(token, draftLexemes, 'markdown');
          downloadText(markdown, 'text/markdown', `${conlangName.toLowerCase().replace(/\s+/g, '_')}_lexicon.md`);
          setError(null);
          return;
        } catch (error) {
          console.error('Data API lexicon Markdown export failed, falling back to client export', error);
        }
      }
    }

    const lines = [
      '| Lemma | Part of Speech | Gloss | Etymology | Tags |',
      '| --- | --- | --- | --- | --- |',
      ...draftLexemes.map((lexeme) => {
        const tags = Array.isArray(lexeme.tags) ? lexeme.tags.join('; ') : '';
        return `| ${lexeme.lemma || ''} | ${lexeme.pos || ''} | ${lexeme.gloss || ''} | ${lexeme.etymology || ''} | ${tags} |`;
      }),
    ];
    downloadText(lines.join('\n'), 'text/markdown', `${conlangName.toLowerCase().replace(/\s+/g, '_')}_lexicon.md`);
    setError(null);
  }, [conlangName, draftLexemes, dataApiEnabled, getIdToken, downloadText]);

  const parseCsvRow = useCallback((row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i += 1) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }, []);

  const normalizeLexeme = useCallback((lexeme: Omit<ConlangLexeme, 'id'>): Omit<ConlangLexeme, 'id'> | null => {
    const lemma = lexeme.lemma.trim();
    const pos = (lexeme.pos ?? '').trim();
    const gloss = lexeme.gloss.trim();
    const etymology = (lexeme.etymology ?? '').trim();
    const tagsSource = Array.isArray(lexeme.tags)
      ? lexeme.tags
      : typeof lexeme.tags === 'string'
      ? lexeme.tags.split(/[,;]/)
      : [];
    const tags = tagsSource.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

    if (!lemma || !gloss) {
      return null;
    }

    return {
      lemma,
      pos,
      gloss,
      etymology: etymology.length > 0 ? etymology : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
  }, []);

  const addImportedLexemes = useCallback(
    (lexemesToAdd: Omit<ConlangLexeme, 'id'>[]) => {
      const sanitized = lexemesToAdd
        .map((lexeme) => normalizeLexeme(lexeme))
        .filter((lexeme): lexeme is Omit<ConlangLexeme, 'id'> => lexeme !== null);

      if (sanitized.length === 0) {
        setError('No valid lexemes found in the provided data.');
        return;
      }

      const existingKeys = new Set(draftLexemes.map((lexeme) => getLexemeKey(lexeme.lemma, lexeme.pos)));
      const timestamp = Date.now();
      const deduped: ConlangLexeme[] = [];
      sanitized.forEach((lexeme, index) => {
        const key = getLexemeKey(lexeme.lemma, lexeme.pos);
        if (existingKeys.has(key)) {
          return;
        }
        existingKeys.add(key);
        deduped.push({
          id: `lex-${timestamp + index}`,
          ...lexeme,
        });
      });

      if (deduped.length === 0) {
        setError('All imported lexemes already exist in this lexicon.');
        return;
      }

      commitLexemeUpdate((current) => [...current, ...deduped]);
      setError(null);
      addXp(Math.min(15, deduped.length * 3)); // XP Source: import lexemes in bulk (+up to 15)
    },
    [addXp, commitLexemeUpdate, draftLexemes, normalizeLexeme],
  );

  const handleCsvImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();

        if (dataApiEnabled) {
          const token = await getIdToken();
          if (token) {
            try {
              const parsed = await parseLexiconCsvViaApi(token, text);
              const normalized = parsed.map((lexeme) => ({
                lemma: lexeme.lemma,
                pos: lexeme.pos,
                gloss: lexeme.gloss,
                etymology: lexeme.etymology,
                tags: lexeme.tags,
              }));
              addImportedLexemes(normalized);
              return;
            } catch (error) {
              console.error('Data API lexicon CSV import failed, using local parser', error);
            }
          }
        }

        const rows = text
          .split(/\r?\n/)
          .map((row) => row.trim())
          .filter((row) => row.length > 0);
        if (rows.length < 2) {
          throw new Error('CSV must include a header row and at least one lexeme.');
        }
        const header = parseCsvRow(rows[0]).map((cell) => cell.trim().toLowerCase());
        const lemmaIndex = header.indexOf('lemma');
        const posIndex = header.indexOf('pos');
        const glossIndex = header.indexOf('gloss');
        const etymologyIndex = header.indexOf('etymology');
        const tagsIndex = header.indexOf('tags');

        if (lemmaIndex === -1 || glossIndex === -1) {
          throw new Error('CSV header must include at least lemma and gloss columns.');
        }

        const imported: Omit<ConlangLexeme, 'id'>[] = rows.slice(1).map((row) => {
          const cells = parseCsvRow(row).map((cell) => cell.trim());
          const tags =
            tagsIndex >= 0 ? cells[tagsIndex]?.split(/[,;]/).map((tag) => tag.trim()).filter((tag) => tag.length > 0) : undefined;
          return {
            lemma: cells[lemmaIndex] ?? '',
            pos: posIndex >= 0 ? cells[posIndex] ?? '' : '',
            gloss: cells[glossIndex] ?? '',
            etymology: etymologyIndex >= 0 ? cells[etymologyIndex] ?? undefined : undefined,
            tags,
          };
        });

        addImportedLexemes(imported);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to import CSV file.');
      } finally {
        event.target.value = '';
      }
    },
    [addImportedLexemes, parseCsvRow, dataApiEnabled, getIdToken],
  );

  const handleMarkdownImport = useCallback(async () => {
    if (dataApiEnabled) {
      const token = await getIdToken();
      if (token) {
        try {
          const parsed = await parseLexiconMarkdownViaApi(token, markdownImport);
          const normalized = parsed.map((lexeme) => ({
            lemma: lexeme.lemma,
            pos: lexeme.pos,
            gloss: lexeme.gloss,
            etymology: lexeme.etymology,
            tags: lexeme.tags,
          }));
          addImportedLexemes(normalized);
          setMarkdownImport('');
          setShowMarkdownImport(false);
          setError(null);
          return;
        } catch (error) {
          console.error('Data API lexicon Markdown import failed, using local parser', error);
        }
      }
    }

    const lines = markdownImport
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('|'));

    if (lines.length < 3) {
      setError('Markdown table must include a header, separator, and at least one row.');
      return;
    }

    const headerCells = lines[0]
      .slice(1, lines[0].endsWith('|') ? -1 : undefined)
      .split('|')
      .map((cell) => cell.trim().toLowerCase());

    const lemmaIndex = headerCells.indexOf('lemma');
    const posIndex = (() => {
      const partOfSpeechIndex = headerCells.indexOf('part of speech');
      if (partOfSpeechIndex !== -1) return partOfSpeechIndex;
      return headerCells.indexOf('pos');
    })();
    const glossIndex = headerCells.indexOf('gloss');
    const etymologyIndex = headerCells.indexOf('etymology');
    const tagsIndex = headerCells.indexOf('tags');

    if (lemmaIndex === -1 || glossIndex === -1) {
      setError('Markdown header must include Lemma and Gloss columns.');
      return;
    }

    const rows = lines.slice(2);
    const imported: Omit<ConlangLexeme, 'id'>[] = rows.map((row) => {
      const cells = row
        .slice(1, row.endsWith('|') ? -1 : undefined)
        .split('|')
        .map((cell) => cell.trim());

      const tagsRaw = tagsIndex >= 0 ? cells[tagsIndex] ?? '' : '';
      const tags = tagsRaw
        .split(/[,;]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      return {
        lemma: cells[lemmaIndex] ?? '',
        pos: posIndex >= 0 ? cells[posIndex] ?? '' : '',
        gloss: cells[glossIndex] ?? '',
        etymology: etymologyIndex >= 0 ? cells[etymologyIndex] ?? undefined : undefined,
        tags: tags.length > 0 ? tags : undefined,
      };
    });

    addImportedLexemes(imported);
    setMarkdownImport('');
    setShowMarkdownImport(false);
  }, [addImportedLexemes, markdownImport, dataApiEnabled, getIdToken]);

  const handleGenerateLexemes = useCallback(async () => {
    if (!theme) {
      setError('Please enter a theme.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const newLexemeData = await generateLexemes(conlangName, theme, draftLexemes);
      const newLexemesWithIds: ConlangLexeme[] = newLexemeData.map((lex, index) => ({
        ...lex,
        id: `lex-${Date.now()}-${index}`,
      }));

      commitLexemeUpdate((current) => [...current, ...newLexemesWithIds]);
      addXp(10); // XP Source: add 10 lexemes (+10) - we'll count a batch as 10xp
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [theme, conlangName, draftLexemes, commitLexemeUpdate, addXp]);

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
      <h3 className="text-xl font-bold text-cyan-400 mb-4">Lexicon: {artifact.title}</h3>

      <div className="bg-slate-900/70 p-4 rounded-lg mb-6 border border-slate-700">
        <h4 className="font-semibold text-slate-200 mb-3">
          <SparklesIcon className="w-6 h-6 inline-block mr-2 text-violet-400" />
          AI Copilot: Conlang Smith
        </h4>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-auto flex-grow">
            <label htmlFor="theme-input" className="block text-sm font-medium text-slate-400 mb-1">
              Word Theme
            </label>
            <input
              id="theme-input"
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., magic, technology, nature"
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleGenerateLexemes}
            disabled={isLoading}
            className="w-full sm:w-auto mt-2 sm:mt-0 self-end h-10 px-6 font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-live="polite"
          >
            {isLoading ? (
              <>
                <Spinner className="w-5 h-5 mr-2" />
                Generating...
              </>
            ) : (
              'Generate Lexemes'
            )}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-slate-600">
            <tr>
              <th className="p-3 text-sm font-semibold text-slate-400">Lemma</th>
              <th className="p-3 text-sm font-semibold text-slate-400">Part of Speech</th>
              <th className="p-3 text-sm font-semibold text-slate-400">Gloss</th>
              <th className="p-3 text-sm font-semibold text-slate-400 hidden md:table-cell">Etymology</th>
              <th className="p-3 text-sm font-semibold text-slate-400 hidden md:table-cell">Tags</th>
              <th className="p-3 text-sm font-semibold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {draftLexemes.length > 0 ? (
              draftLexemes.map((lexeme) => (
                <tr key={lexeme.id} className="border-b border-slate-800 hover:bg-slate-700/50">
                  <td className="p-3 text-sm">
                    <input
                      value={lexeme.lemma}
                      onChange={(event) => handleLexemeFieldChange(lexeme.id, 'lemma', event.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="p-3 text-sm">
                    <input
                      value={lexeme.pos}
                      onChange={(event) => handleLexemeFieldChange(lexeme.id, 'pos', event.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="p-3 text-sm">
                    <input
                      value={lexeme.gloss}
                      onChange={(event) => handleLexemeFieldChange(lexeme.id, 'gloss', event.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="p-3 text-sm hidden md:table-cell">
                    <input
                      value={lexeme.etymology ?? ''}
                      onChange={(event) => handleLexemeFieldChange(lexeme.id, 'etymology', event.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="p-3 text-sm hidden md:table-cell">
                    <input
                      value={Array.isArray(lexeme.tags) ? lexeme.tags.join(', ') : ''}
                      onChange={(event) => handleLexemeFieldChange(lexeme.id, 'tags', event.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      placeholder="comma-separated"
                    />
                  </td>
                  <td className="p-3 text-sm">
                    <button
                      type="button"
                      onClick={() => handleDeleteLexeme(lexeme.id)}
                      className="text-xs font-semibold text-rose-300 hover:text-rose-200"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center p-8 text-slate-500">
                  No lexemes yet. Use the Conlang Smith or add entries manually!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-900/60 border border-slate-700 rounded-lg p-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-400 md:col-span-1">
          Lemma
          <input
            value={newLexeme.lemma}
            onChange={(event) => setNewLexeme((prev) => ({ ...prev, lemma: event.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="brubber"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-400 md:col-span-1">
          Part of speech
          <input
            value={newLexeme.pos}
            onChange={(event) => setNewLexeme((prev) => ({ ...prev, pos: event.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="adj"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-400 md:col-span-1">
          Gloss
          <input
            value={newLexeme.gloss}
            onChange={(event) => setNewLexeme((prev) => ({ ...prev, gloss: event.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="strange; unusual"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-400 md:col-span-1">
          Etymology
          <input
            value={newLexeme.etymology}
            onChange={(event) => setNewLexeme((prev) => ({ ...prev, etymology: event.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="From ..."
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-400 md:col-span-1">
          Tags
          <input
            value={newLexeme.tags}
            onChange={(event) => setNewLexeme((prev) => ({ ...prev, tags: event.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="core; darv"
          />
        </label>
        <div className="md:col-span-5 flex justify-end">
          <button
            type="button"
            onClick={handleAddManualLexeme}
            className="mt-2 inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md"
          >
            Add lexeme
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => { void handleExportCsv(); }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900/80 border border-slate-700 rounded-md hover:border-cyan-500"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => { void handleExportMarkdown(); }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900/80 border border-slate-700 rounded-md hover:border-cyan-500"
          >
            Export Markdown
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900/80 border border-slate-700 rounded-md hover:border-cyan-500"
          >
            Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          <button
            type="button"
            onClick={() => setShowMarkdownImport((value) => !value)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900/80 border border-slate-700 rounded-md hover:border-cyan-500"
          >
            {showMarkdownImport ? 'Close Markdown import' : 'Import from Markdown'}
          </button>
        </div>
        {showMarkdownImport && (
          <div className="space-y-3">
            <textarea
              value={markdownImport}
              onChange={(event) => setMarkdownImport(event.target.value)}
              rows={6}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
              placeholder="| Lemma | Part of Speech | Gloss | Etymology | Tags |\n| --- | --- | --- | --- | --- |\n| brubber | adj | strange | | core; darv |"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { void handleMarkdownImport(); }}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md"
              >
                Import Markdown table
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
    </div>
  );
};

export default ConlangLexiconEditor;
