import React, { useCallback, useMemo, useState } from 'react';
import { InspirationCard } from '../types';
import { drawInspirationCard } from '../utils/inspiration';
import { PlusIcon, SparklesIcon, TrophyIcon, Spinner } from './Icons';

interface InspirationDeckProps {
  onCaptureCard?: (card: InspirationCard) => Promise<void> | void;
  isCaptureDisabled?: boolean;
}

const InspirationDeck: React.FC<InspirationDeckProps> = ({ onCaptureCard, isCaptureDisabled }) => {
  const seed = useMemo(() => Number.parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10), []);
  const [history, setHistory] = useState<InspirationCard[]>([]);
  const [currentCard, setCurrentCard] = useState<InspirationCard>(() => drawInspirationCard([], seed));
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const isFavorite = favorites.includes(currentCard.id);

  const handleDraw = useCallback(() => {
    setHistory((prev) => {
      const updatedHistory = [...prev, currentCard];
      const nextSeed = seed + updatedHistory.length;
      const nextCard = drawInspirationCard(updatedHistory, nextSeed);
      setCurrentCard(nextCard);
      return updatedHistory;
    });
  }, [currentCard, seed]);

  const handleToggleFavorite = useCallback(() => {
    setFavorites((prev) => {
      if (prev.includes(currentCard.id)) {
        return prev.filter((id) => id !== currentCard.id);
      }
      return [...prev, currentCard.id];
    });
  }, [currentCard.id]);

  const handleCapture = useCallback(async () => {
    if (!onCaptureCard || isCaptureDisabled) {
      return;
    }
    try {
      setIsCapturing(true);
      await onCaptureCard(currentCard);
    } finally {
      setIsCapturing(false);
    }
  }, [currentCard, isCaptureDisabled, onCaptureCard]);

  const favoriteHistory = history.filter((card) => favorites.includes(card.id));

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-pink-300" /> Inspiration Deck
          </h3>
          <p className="text-sm text-slate-400">
            Draw collectible prompts when you need a vibe shift. Bookmark favorites or capture them directly into your project.
          </p>
        </div>
        <div className="rounded-lg border border-pink-400/30 bg-pink-500/10 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-pink-200 font-semibold">Cards today</p>
          <p className="text-2xl font-bold text-pink-100">{history.length + 1}</p>
          <p className="text-xs text-pink-200/80">Deck resets daily</p>
        </div>
      </header>

      <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-pink-200">{currentCard.suit}</span>
            <h4 className="text-xl font-semibold text-slate-50">{currentCard.title}</h4>
            <p className="text-sm text-slate-300">{currentCard.prompt}</p>
          </div>
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isFavorite
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200'
            }`}
          >
            <TrophyIcon className="w-4 h-4 inline mr-1" /> {isFavorite ? 'Saved' : 'Save card'}
          </button>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{currentCard.detail}</p>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
          {currentCard.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-800/70 border border-slate-700/60">
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDraw}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-500 rounded-md transition-colors"
          >
            <SparklesIcon className="w-4 h-4" /> Draw another
          </button>
          {onCaptureCard && (
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing || isCaptureDisabled}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 text-slate-100"
            >
              {isCapturing ? <Spinner className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
              {isCapturing ? 'Saving…' : 'Capture to project'}
            </button>
          )}
        </div>
      </div>

      {favoriteHistory.length > 0 && (
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-200">Starred pulls</p>
          <div className="flex flex-col gap-2">
            {favoriteHistory.map((card) => (
              <div key={card.id} className="flex items-start justify-between gap-3 bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{card.title}</p>
                  <p className="text-xs text-slate-400">{card.prompt}</p>
                </div>
                <span className="text-[11px] uppercase tracking-wide text-slate-500">{card.suit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default InspirationDeck;
