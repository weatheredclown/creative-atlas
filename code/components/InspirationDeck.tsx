import React, { useEffect, useMemo, useState } from 'react';
import { SparklesIcon } from './Icons';

interface InspirationCard {
  id: string;
  title: string;
  archetype: string;
  vibe: string;
  prompt: string;
  tags: string[];
  booster: string;
}

const INSPIRATION_CARDS: InspirationCard[] = [
  {
    id: 'ember-mentor',
    title: "Ember Mentor",
    archetype: 'Character Catalyst',
    vibe: 'Warm Resolve',
    prompt: 'A veteran mage whose magic now manifests as clockwork sparks agrees to teach only if the apprentice unearths a forgotten failure.',
    tags: ['character', 'mentor', 'clockwork'],
    booster: 'Pair with a Task artifact to draft the apprentice’s proving ritual.',
  },
  {
    id: 'fracture-vault',
    title: 'Fracture Vault',
    archetype: 'Location Anchor',
    vibe: 'Tense Stillness',
    prompt: 'Beneath the Whisperwood sits a vault that only opens when three rival factions speak in unison.',
    tags: ['location', 'faction', 'puzzle'],
    booster: 'Link to your faction board and outline the negotiation scene.',
  },
  {
    id: 'loreline',
    title: 'Loreline Glitch',
    archetype: 'Continuity Spark',
    vibe: 'Electric Mystery',
    prompt: 'The timeline UI now shows a ghost entry—an event that never happened but feels inevitable.',
    tags: ['timeline', 'mystery'],
    booster: 'Create a quest to decide whether to embrace or erase the phantom event.',
  },
  {
    id: 'conlang-chime',
    title: 'Chime Lexeme',
    archetype: 'Language Flavor',
    vibe: 'Playful Insight',
    prompt: 'A new conlang word evokes both thunder and laughter, inspiring a festival tradition that only appears every ten years.',
    tags: ['conlang', 'culture', 'festival'],
    booster: 'Draft a wiki entry or card describing the festival’s games.',
  },
  {
    id: 'xp-harvest',
    title: 'XP Harvest',
    archetype: 'Gameplay Boost',
    vibe: 'High Energy',
    prompt: 'Completing a trio of micro-quests tonight grants a temporary XP multiplier for collaborative drafts.',
    tags: ['quest', 'xp', 'loop'],
    booster: 'Add three bite-sized quests to tonight’s board.',
  },
  {
    id: 'ally-mask',
    title: 'Ally Behind the Mask',
    archetype: 'Twist Hook',
    vibe: 'Suspenseful Pulse',
    prompt: 'A masked informant slips a relic onto the table—engraved with the protagonist’s childhood nickname.',
    tags: ['twist', 'relic', 'relationship'],
    booster: 'Log a character trait or scene card revealing why they left.',
  },
  {
    id: 'map-fissure',
    title: 'Fissure Atlas',
    archetype: 'Visual Prompt',
    vibe: 'Crumbling Awe',
    prompt: 'Your project map develops a spreading fissure overlay that traces where reality is thinnest.',
    tags: ['map', 'visual', 'threat'],
    booster: 'Sketch the three locations most at risk and link them together.',
  },
  {
    id: 'memory-orb',
    title: 'Memory Orb',
    archetype: 'Relic Memory',
    vibe: 'Melancholic Wonder',
    prompt: 'A crystalline orb replays one pivotal choice differently every time someone touches it.',
    tags: ['relic', 'memory', 'what-if'],
    booster: 'Write alternative beats for a key scene using the orb as catalyst.',
  },
];

const drawRandomCard = (excludeId?: string): InspirationCard => {
  const pool = excludeId ? INSPIRATION_CARDS.filter((card) => card.id !== excludeId) : INSPIRATION_CARDS;
  if (pool.length === 0) {
    throw new Error('Inspiration deck is empty.');
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

const InspirationDeck: React.FC = () => {
  const [currentCard, setCurrentCard] = useState<InspirationCard | null>(null);
  const [history, setHistory] = useState<InspirationCard[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isLocked, setIsLocked] = useState(false);

  const canDraw = useMemo(() => INSPIRATION_CARDS.length > 0, []);

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }
    const timeout = window.setTimeout(() => {
      setCopyState('idle');
    }, 2200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [copyState]);

  const handleDrawCard = () => {
    if (!canDraw || isLocked) {
      return;
    }
    setHistory((previous) => (currentCard ? [currentCard, ...previous].slice(0, 4) : previous));
    const nextCard = drawRandomCard(currentCard?.id);
    setCurrentCard(nextCard);
    setCopyState('idle');
  };

  const handleToggleLock = () => {
    if (!currentCard) {
      return;
    }
    setIsLocked((locked) => !locked);
  };

  const handleCopyPrompt = async () => {
    if (!currentCard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(currentCard.prompt);
      setCopyState('copied');
    } catch (error) {
      console.warn('Failed to copy inspiration prompt', error);
      setCopyState('error');
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-violet-500/30 bg-slate-900/60 p-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300">
          <SparklesIcon className="h-4 w-4" /> Inspiration Deck
        </div>
        <h3 className="text-xl font-semibold text-slate-100">Draw a fresh creative boost</h3>
        <p className="text-sm text-slate-400">
          Each card blends archetypes, vibes, and boosters sourced from the Aethelgard design kit. Draw one when a scene stalls or when you need a quest hook fast.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleDrawCard}
          disabled={!canDraw || isLocked}
          className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-violet-500"
        >
          Shuffle &amp; Draw
        </button>
        <button
          type="button"
          onClick={handleToggleLock}
          disabled={!currentCard}
          className="rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:border-slate-400 hover:text-white"
        >
          {isLocked ? 'Unlock card' : 'Lock card'}
        </button>
        {currentCard && (
          <span className={`text-xs font-semibold uppercase tracking-wide ${isLocked ? 'text-emerald-300' : 'text-slate-500'}`}>
            {isLocked ? 'Card locked in place' : 'Card free to draw'}
          </span>
        )}
      </div>

      {currentCard ? (
        <article className="space-y-4 rounded-xl border border-violet-500/40 bg-slate-950/60 p-5 shadow-lg shadow-violet-900/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">{currentCard.archetype}</p>
              <h4 className="text-lg font-semibold text-slate-100">{currentCard.title}</h4>
            </div>
            <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              {currentCard.vibe}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-200">{currentCard.prompt}</p>
          <div className="flex flex-wrap gap-2">
            {currentCard.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-3 text-xs text-slate-300">
            Booster: {currentCard.booster}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white"
            >
              Copy prompt
            </button>
            {copyState === 'copied' && <span className="text-xs font-semibold text-emerald-300">Copied!</span>}
            {copyState === 'error' && <span className="text-xs font-semibold text-rose-300">Copy failed—use Ctrl/Cmd + C</span>}
          </div>
        </article>
      ) : (
        <p className="rounded-lg border border-dashed border-violet-500/30 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
          Shuffle the deck to reveal a card. Each draw delivers a ready-to-use beat that you can slot into a wiki entry, quest, or scene card.
        </p>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent draws</p>
          <div className="flex flex-wrap gap-2">
            {history.map((card) => (
              <span key={card.id} className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
                {card.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default InspirationDeck;
