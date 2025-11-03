import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Artifact, MagicSystemData, MagicSystemPrinciple, MagicSystemRitual, MagicSystemSource, MagicSystemTaboo } from '../types';
import { useDepthPreferences } from '../contexts/DepthPreferencesContext';
import {
  createBlankMagicSystemData,
  createTamenzutMagicSystemData,
  normalizeMagicSystemData,
} from '../utils/magicSystem';
import { BookOpenIcon, PlusIcon, SparklesIcon, XMarkIcon } from './Icons';

interface MagicSystemBuilderProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: MagicSystemData) => void;
}

const createId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const MagicSystemBuilder: React.FC<MagicSystemBuilderProps> = ({ artifact, onUpdateArtifactData }) => {
  const { showDetailedFields } = useDepthPreferences();
  const normalizedData = useMemo(
    () => normalizeMagicSystemData((artifact.data as MagicSystemData | undefined) ?? undefined, artifact.title),
    [artifact.data, artifact.title],
  );
  const [localData, setLocalData] = useState<MagicSystemData>(() => normalizedData);

  useEffect(() => {
    setLocalData(normalizeMagicSystemData((artifact.data as MagicSystemData | undefined) ?? undefined, artifact.title));
  }, [artifact.data, artifact.title, artifact.id]);

  const persist = useCallback(
    (next: MagicSystemData) => {
      setLocalData(next);
      onUpdateArtifactData(artifact.id, next);
    },
    [artifact.id, onUpdateArtifactData],
  );

  const handleSummaryChange = (field: keyof Pick<MagicSystemData, 'codexName' | 'summary'>, value: string) => {
    persist({ ...localData, [field]: value });
  };

  const handlePrincipleChange = (principleId: string, updates: Partial<MagicSystemPrinciple>) => {
    const nextPrinciples = localData.principles.map((principle) =>
      principle.id === principleId ? { ...principle, ...updates } : principle,
    );
    persist({ ...localData, principles: nextPrinciples });
  };

  const handleSourceChange = (sourceId: string, updates: Partial<MagicSystemSource>) => {
    const nextSources = localData.sources.map((source) => (source.id === sourceId ? { ...source, ...updates } : source));
    persist({ ...localData, sources: nextSources });
  };

  const handleRitualChange = (ritualId: string, updates: Partial<MagicSystemRitual>) => {
    const nextRituals = localData.rituals.map((ritual) => (ritual.id === ritualId ? { ...ritual, ...updates } : ritual));
    persist({ ...localData, rituals: nextRituals });
  };

  const handleTabooChange = (tabooId: string, updates: Partial<MagicSystemTaboo>) => {
    const nextTaboos = localData.taboos.map((taboo) => (taboo.id === tabooId ? { ...taboo, ...updates } : taboo));
    persist({ ...localData, taboos: nextTaboos });
  };

  const handleFieldNoteChange = (index: number, value: string) => {
    const nextNotes = [...localData.fieldNotes];
    nextNotes[index] = value;
    persist({ ...localData, fieldNotes: nextNotes });
  };

  const addPrinciple = () => {
    const nextPrinciples: MagicSystemPrinciple[] = [
      ...localData.principles,
      {
        id: createId('principle'),
        title: 'New Principle',
        focus: 'Define the law this principle enforces.',
        description: '',
        stability: 'stable',
      },
    ];
    persist({ ...localData, principles: nextPrinciples });
  };

  const addSource = () => {
    const nextSources: MagicSystemSource[] = [
      ...localData.sources,
      {
        id: createId('source'),
        name: 'New Source',
        resonance: 'Describe the resonance signature.',
        capacity: 'Capacity or scale.',
        tells: 'Perceptible tells or side effects.',
      },
    ];
    persist({ ...localData, sources: nextSources });
  };

  const addRitual = () => {
    const nextRituals: MagicSystemRitual[] = [
      ...localData.rituals,
      {
        id: createId('ritual'),
        name: 'New Ritual',
        tier: 'Novice',
        cost: 'What is surrendered or expended?',
        effect: 'What the ritual accomplishes.',
        failure: 'What happens if the weave collapses?',
      },
    ];
    persist({ ...localData, rituals: nextRituals });
  };

  const addTaboo = () => {
    const nextTaboos: MagicSystemTaboo[] = [
      ...localData.taboos,
      {
        id: createId('taboo'),
        rule: 'Document a prohibition or taboo.',
        consequence: 'What backlash occurs when this taboo is broken?',
        restoration: '',
      },
    ];
    persist({ ...localData, taboos: nextTaboos });
  };

  const addFieldNote = () => {
    persist({ ...localData, fieldNotes: [...localData.fieldNotes, 'New observation or reminder.'] });
  };

  const removePrinciple = (principleId: string) => {
    persist({ ...localData, principles: localData.principles.filter((principle) => principle.id !== principleId) });
  };

  const removeSource = (sourceId: string) => {
    persist({ ...localData, sources: localData.sources.filter((source) => source.id !== sourceId) });
  };

  const removeRitual = (ritualId: string) => {
    persist({ ...localData, rituals: localData.rituals.filter((ritual) => ritual.id !== ritualId) });
  };

  const removeTaboo = (tabooId: string) => {
    persist({ ...localData, taboos: localData.taboos.filter((taboo) => taboo.id !== tabooId) });
  };

  const removeFieldNote = (index: number) => {
    const nextNotes = localData.fieldNotes.filter((_, idx) => idx !== index);
    persist({ ...localData, fieldNotes: nextNotes });
  };

  const handleApplyTamenzutBaseline = () => {
    persist(createTamenzutMagicSystemData());
  };

  const handleResetBlank = () => {
    persist(createBlankMagicSystemData(artifact.title));
  };

  const isTamenzutTemplate = artifact.projectId.toLowerCase().includes('tamenzut');

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-500/20 border border-violet-400/40 p-2 text-violet-200">
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Magic System Builder</p>
            <h3 className="text-xl font-semibold text-slate-100">{localData.codexName}</h3>
            <p className="text-sm text-slate-400">
              Capture the governing principles, energy reservoirs, rituals, and taboos that define this system.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleApplyTamenzutBaseline}
            className="inline-flex items-center gap-2 rounded-md border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition-colors"
          >
            <SparklesIcon className="w-4 h-4" /> Load Tamenzut baseline
          </button>
          {showDetailedFields && (
            <button
              type="button"
              onClick={handleResetBlank}
              className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
            >
              Reset to blank
            </button>
          )}
        </div>
      </header>

      <div className="space-y-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="magic-codex-name">
          Codex Name
        </label>
        <input
          id="magic-codex-name"
          type="text"
          value={localData.codexName}
          onChange={(event) => handleSummaryChange('codexName', event.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
        />
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="magic-summary">
          Summary
        </label>
        <textarea
          id="magic-summary"
          rows={3}
          value={localData.summary}
          onChange={(event) => handleSummaryChange('summary', event.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
          placeholder="Explain how the system feels, who polices it, and what it costs."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Core Principles</h4>
              <p className="text-xs text-slate-500">Laws and tensions that define what weaving can or cannot do.</p>
            </div>
            <button
              type="button"
              onClick={addPrinciple}
              className="inline-flex items-center gap-2 rounded-md bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-500/30 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Principle
            </button>
          </header>
          <div className="space-y-3">
            {localData.principles.length === 0 && (
              <p className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/40 px-3 py-4 text-xs text-slate-500">
                No principles captured yet. Add at least one law, tension, or cost to define how power behaves.
              </p>
            )}
            {localData.principles.map((principle) => (
              <article key={principle.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={principle.title}
                      onChange={(event) => handlePrincipleChange(principle.id, { title: event.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-sm font-semibold text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                    <input
                      type="text"
                      value={principle.focus}
                      onChange={(event) => handlePrincipleChange(principle.id, { focus: event.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-violet-200 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                  </div>
                  {showDetailedFields && (
                    <button
                      type="button"
                      onClick={() => removePrinciple(principle.id)}
                      className="text-slate-500 hover:text-rose-300"
                      aria-label="Remove principle"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Stability
                    <select
                      value={principle.stability}
                      onChange={(event) => handlePrincipleChange(principle.id, { stability: event.target.value as MagicSystemPrinciple['stability'] })}
                      className="ml-2 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 focus:border-violet-400 focus:outline-none"
                    >
                      <option value="stable">Stable</option>
                      <option value="volatile">Volatile</option>
                      <option value="forbidden">Forbidden</option>
                    </select>
                  </label>
                  {isTamenzutTemplate && principle.stability === 'volatile' && (
                    <span className="text-[11px] text-amber-300">Wardens monitor volatile threads closely.</span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={principle.description}
                  onChange={(event) => handlePrincipleChange(principle.id, { description: event.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  placeholder="Describe how this law manifests, who enforces it, and what it costs."
                />
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Energy Reservoirs</h4>
              <p className="text-xs text-slate-500">Sources that feed the loom and the sensory tells they leave behind.</p>
            </div>
            <button
              type="button"
              onClick={addSource}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Source
            </button>
          </header>
          <div className="space-y-3">
            {localData.sources.length === 0 && (
              <p className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/40 px-3 py-4 text-xs text-slate-500">
                Document where power originates—ley lines, relics, patrons, or forbidden bargains.
              </p>
            )}
            {localData.sources.map((source) => (
              <article key={source.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={source.name}
                      onChange={(event) => handleSourceChange(source.id, { name: event.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-sm font-semibold text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                    <textarea
                      rows={2}
                      value={source.resonance}
                      onChange={(event) => handleSourceChange(source.id, { resonance: event.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      placeholder="How does this source feel, sound, or smell?"
                    />
                  </div>
                  {showDetailedFields && (
                    <button
                      type="button"
                      onClick={() => removeSource(source.id)}
                      className="text-slate-500 hover:text-rose-300"
                      aria-label="Remove source"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor={`source-capacity-${source.id}`}>
                      Capacity
                    </label>
                    <input
                      id={`source-capacity-${source.id}`}
                      type="text"
                      value={source.capacity}
                      onChange={(event) => handleSourceChange(source.id, { capacity: event.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor={`source-tells-${source.id}`}>
                      Resonance Tells
                    </label>
                    <textarea
                      id={`source-tells-${source.id}`}
                      rows={2}
                      value={source.tells}
                      onChange={(event) => handleSourceChange(source.id, { tells: event.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Signature Rituals</h4>
            <p className="text-xs text-slate-500">Blueprint pivotal weaves, their costs, and failure fallout.</p>
          </div>
          <button
            type="button"
            onClick={addRitual}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> Ritual
          </button>
        </header>
        <div className="grid gap-3 lg:grid-cols-3">
          {localData.rituals.length === 0 && (
            <p className="lg:col-span-3 rounded-md border border-dashed border-slate-700/60 bg-slate-900/40 px-3 py-4 text-xs text-slate-500">
              Detail at least one ritual. Include the tier, what it consumes, and how it warps scenes when it fails.
            </p>
          )}
          {localData.rituals.map((ritual) => (
            <article key={ritual.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <input
                  type="text"
                  value={ritual.name}
                  onChange={(event) => handleRitualChange(ritual.id, { name: event.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-sm font-semibold text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                {showDetailedFields && (
                  <button
                    type="button"
                    onClick={() => removeRitual(ritual.id)}
                    className="text-slate-500 hover:text-rose-300"
                    aria-label="Remove ritual"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tier
                  <select
                    value={ritual.tier}
                    onChange={(event) => handleRitualChange(ritual.id, { tier: event.target.value })}
                    className="rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="Novice">Novice</option>
                    <option value="Adept">Adept</option>
                    <option value="Master">Master</option>
                    <option value="Mythic">Mythic</option>
                  </select>
                </label>
                <textarea
                  rows={2}
                  value={ritual.cost}
                  onChange={(event) => handleRitualChange(ritual.id, { cost: event.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
                  placeholder="What must be surrendered?"
                />
                <textarea
                  rows={2}
                  value={ritual.effect}
                  onChange={(event) => handleRitualChange(ritual.id, { effect: event.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
                  placeholder="What scene change does the ritual enable?"
                />
                <textarea
                  rows={2}
                  value={ritual.failure}
                  onChange={(event) => handleRitualChange(ritual.id, { failure: event.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
                  placeholder="Describe the backlash or residue when the weave collapses."
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Taboos & Consequences</h4>
            <p className="text-xs text-slate-500">Guardrails that canon-keepers and wardens enforce.</p>
          </div>
          <button
            type="button"
            onClick={addTaboo}
            className="inline-flex items-center gap-2 rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> Taboo
          </button>
        </header>
        <div className="space-y-3">
          {localData.taboos.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/40 px-3 py-4 text-xs text-slate-500">
              Record forbidden actions, their narrative consequences, and the rites needed to atone.
            </p>
          )}
          {localData.taboos.map((taboo) => (
            <article key={taboo.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <input
                  type="text"
                  value={taboo.rule}
                  onChange={(event) => handleTabooChange(taboo.id, { rule: event.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-sm font-semibold text-slate-100 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
                {showDetailedFields && (
                  <button
                    type="button"
                    onClick={() => removeTaboo(taboo.id)}
                    className="text-slate-500 hover:text-rose-300"
                    aria-label="Remove taboo"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={taboo.consequence}
                onChange={(event) => handleTabooChange(taboo.id, { consequence: event.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 focus:border-rose-400 focus:outline-none"
                placeholder="What happens when this line is crossed?"
              />
              <textarea
                rows={2}
                value={taboo.restoration ?? ''}
                onChange={(event) => handleTabooChange(taboo.id, { restoration: event.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 focus:border-rose-400 focus:outline-none"
                placeholder="Optional: rites or quests that restore balance."
              />
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Field Notes</h4>
            <p className="text-xs text-slate-500">Quick reminders for continuity, crossover hooks, or GM usage.</p>
          </div>
          <button
            type="button"
            onClick={addFieldNote}
            className="inline-flex items-center gap-2 rounded-md bg-slate-200/10 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-200/20 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> Note
          </button>
        </header>
        <div className="space-y-3">
          {localData.fieldNotes.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/40 px-3 py-4 text-xs text-slate-500">
              Keep fast pointers here—continuity warnings, export reminders, or links to related artifacts.
            </p>
          )}
          {localData.fieldNotes.map((note, index) => (
            <div key={`note-${index}`} className="flex gap-3">
              <textarea
                rows={2}
                value={note}
                onChange={(event) => handleFieldNoteChange(index, event.target.value)}
                className="flex-1 rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 focus:border-slate-500 focus:outline-none"
              />
              {showDetailedFields && (
                <button
                  type="button"
                  onClick={() => removeFieldNote(index)}
                  className="mt-1 text-slate-500 hover:text-rose-300"
                  aria-label="Remove note"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
};

export default MagicSystemBuilder;
