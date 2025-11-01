import { InspirationCard, InspirationCardSuit } from '../types';

const createCard = (
  id: string,
  suit: InspirationCardSuit,
  title: string,
  prompt: string,
  detail: string,
  tags: string[],
): InspirationCard => ({ id, suit, title, prompt, detail, tags });

export const INSPIRATION_DECK: InspirationCard[] = [
  createCard(
    'card-aurora-scout',
    'Character',
    'Aurora Scout',
    'A courier who maps ley-line storms to keep trade routes open.',
    'They taste thunder in the air moments before it strikes and keep a journal of routes that only appear under certain moons.',
    ['wanderer', 'mystic', 'trade'],
  ),
  createCard(
    'card-ember-market',
    'Setting',
    'Ember Market at Dusk',
    'A floating bazaar tethered to weather balloons to escape ground taxes.',
    'Vendors anchor stalls with rune-weighted chains. When a storm approaches, everything lifts off at once, leaving unpaid debts dangling from the tethers.',
    ['economy', 'sky', 'rumor'],
  ),
  createCard(
    'card-broken-oath',
    'Conflict',
    'The Broken Oath',
    'An unbreakable vow splinters, releasing a spectral debt collector.',
    'Anyone who benefited from the vow feels a phantom hand at their throat until they make restitution or find the original caster.',
    ['oath', 'ghost', 'debt'],
  ),
  createCard(
    'card-hollow-library',
    'Lore',
    'The Hollow Library',
    'A repository of books printed with blank pages that reveal ink only when sung to.',
    'Each volume responds to a different melody; when performed together, they recall a forgotten dynasty.',
    ['knowledge', 'song', 'secret'],
  ),
  createCard(
    'card-echo-ridge',
    'Setting',
    'Echo Ridge Observatory',
    'A cliffside station that listens to echoes from parallel timelines.',
    'The engineers wear mirrored helmets to avoid slipping into reflected realities while plotting safe passage windows.',
    ['science', 'time', 'cliff'],
  ),
  createCard(
    'card-night-market',
    'Sensory',
    'Night-Market Aromas',
    'Scents of charred citrus, cold iron, and wet stone braid through the crowd.',
    'Merchants bottle captured weather patterns; opening one releases the smell and the associated breeze.',
    ['scent', 'weather', 'market'],
  ),
  createCard(
    'card-ember-ward',
    'Conflict',
    'Ember Ward Siege',
    'A city block quarantined by shimmering wards to trap a rogue star inside.',
    'Residents barter for star-metal shards that fall like snow, while the ward weakens each sunset.',
    ['siege', 'urban', 'magic'],
  ),
  createCard(
    'card-pact-sworn',
    'Character',
    'Pact-Sworn Mediator',
    'A negotiator who tattoos each signed treaty onto their arms in glowing ink.',
    'Breaking a pact scars the skin and dims the matching sigil carved onto the counterpart in the opposing faction.',
    ['diplomat', 'tattoo', 'faction'],
  ),
  createCard(
    'card-wandering-fjord',
    'Setting',
    'Wandering Fjord',
    'A glacier-carved harbor that migrates a mile each year, dragging its docks with it.',
    'Anchored ships must set sail nightly to avoid being frozen into next season’s ice wall.',
    ['travel', 'ice', 'harbor'],
  ),
  createCard(
    'card-sigil-harvest',
    'Lore',
    'Sigil Harvest',
    'Farmers grow glyph-infused grains that store memories of the soil.',
    'Bread baked from the harvest lets diners relive a single day from the land’s perspective.',
    ['agriculture', 'memory', 'ritual'],
  ),
  createCard(
    'card-shatter-resonance',
    'Sensory',
    'Shatter Resonance',
    'When glass breaks near the capital, bells across the city hum the same note.',
    'Scholars tune to the resonance to forecast political coups three days early.',
    ['sound', 'omen', 'urban'],
  ),
  createCard(
    'card-ashen-archivist',
    'Character',
    'Ashen Archivist',
    'A librarian whose skin records every document they burn to protect.',
    'They can tap the ash patterns like braille to reprint a page once—but the scar fades afterward.',
    ['sacrifice', 'memory', 'library'],
  ),
];

export const shuffleInspirationDeck = (seed: number): InspirationCard[] => {
  const deck = [...INSPIRATION_DECK];
  let state = seed;
  const nextRandom = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(nextRandom() * (index + 1));
    [deck[index], deck[randomIndex]] = [deck[randomIndex], deck[index]];
  }

  return deck;
};

export const drawInspirationCard = (
  history: InspirationCard[],
  seed: number,
): InspirationCard => {
  const drawnIds = new Set(history.map((card) => card.id));
  const shuffled = shuffleInspirationDeck(seed);
  const nextCard = shuffled.find((card) => !drawnIds.has(card.id)) ?? shuffled[0];
  return nextCard;
};
