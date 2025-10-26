
import React, { useState, useCallback } from 'react';
import { Artifact, ConlangLexeme } from '../types';
import { generateLexemes } from '../services/geminiService';
import { SparklesIcon, Spinner } from './Icons';

interface ConlangLexiconEditorProps {
  artifact: Artifact;
  conlangName: string;
  onLexemesAdded: (artifactId: string, newLexemes: ConlangLexeme[]) => void;
  addXp: (amount: number) => void;
}

const ConlangLexiconEditor: React.FC<ConlangLexiconEditorProps> = ({ artifact, conlangName, onLexemesAdded, addXp }) => {
  const [theme, setTheme] = useState<string>('nature');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lexemes = (artifact.data as ConlangLexeme[]) || [];

  const handleGenerateLexemes = useCallback(async () => {
    if (!theme) {
      setError('Please enter a theme.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const newLexemeData = await generateLexemes(conlangName, theme, lexemes);
      const newLexemesWithIds: ConlangLexeme[] = newLexemeData.map((lex, index) => ({
        ...lex,
        id: `lex-${Date.now()}-${index}`,
      }));
      
      onLexemesAdded(artifact.id, newLexemesWithIds);
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
  }, [theme, conlangName, lexemes, onLexemesAdded, artifact.id, addXp]);

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
        {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-slate-600">
            <tr>
              <th className="p-3 text-sm font-semibold text-slate-400">Lemma</th>
              <th className="p-3 text-sm font-semibold text-slate-400">Part of Speech</th>
              <th className="p-3 text-sm font-semibold text-slate-400">Gloss</th>
              <th className="p-3 text-sm font-semibold text-slate-400 hidden md:table-cell">Etymology</th>
            </tr>
          </thead>
          <tbody>
            {lexemes.length > 0 ? (
              lexemes.map((lexeme) => (
                <tr key={lexeme.id} className="border-b border-slate-800 hover:bg-slate-700/50">
                  <td className="p-3 font-mono text-cyan-300">{lexeme.lemma}</td>
                  <td className="p-3 text-slate-400 italic">{lexeme.pos}</td>
                  <td className="p-3">{lexeme.gloss}</td>
                  <td className="p-3 text-slate-500 text-sm hidden md:table-cell">{lexeme.etymology}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center p-8 text-slate-500">
                  No lexemes yet. Use the Conlang Smith to generate some!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConlangLexiconEditor;
