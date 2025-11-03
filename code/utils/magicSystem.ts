import {
  MagicStability,
  MagicSystemData,
  MagicSystemPrinciple,
  MagicSystemRitual,
  MagicSystemSource,
  MagicSystemTaboo,
} from '../types';

type PartialMagicSystemData = Partial<MagicSystemData> | undefined;

const isString = (value: unknown): value is string => typeof value === 'string';

const coerceStability = (value: unknown): MagicStability => {
  if (value === 'volatile' || value === 'forbidden') {
    return value;
  }
  return 'stable';
};

const sanitizePrinciple = (principle: MagicSystemPrinciple): MagicSystemPrinciple => ({
  ...principle,
  title: principle.title.trim(),
  focus: principle.focus.trim(),
  description: principle.description.trim(),
  stability: coerceStability(principle.stability),
});

const sanitizeSource = (source: MagicSystemSource): MagicSystemSource => ({
  ...source,
  name: source.name.trim(),
  resonance: source.resonance.trim(),
  capacity: source.capacity.trim(),
  tells: source.tells.trim(),
});

const sanitizeRitual = (ritual: MagicSystemRitual): MagicSystemRitual => ({
  ...ritual,
  name: ritual.name.trim(),
  tier: ritual.tier.trim(),
  cost: ritual.cost.trim(),
  effect: ritual.effect.trim(),
  failure: ritual.failure.trim(),
});

const sanitizeTaboo = (taboo: MagicSystemTaboo): MagicSystemTaboo => ({
  ...taboo,
  rule: taboo.rule.trim(),
  consequence: taboo.consequence.trim(),
  restoration: taboo.restoration?.trim() ?? undefined,
});

export const createBlankMagicSystemData = (title?: string): MagicSystemData => ({
  codexName: title ? `${title} Codex` : 'Untitled Codex',
  summary: '',
  principles: [],
  sources: [],
  rituals: [],
  taboos: [],
  fieldNotes: [],
});

export const normalizeMagicSystemData = (
  value: PartialMagicSystemData,
  fallbackTitle?: string,
): MagicSystemData => {
  const fallback = createBlankMagicSystemData(fallbackTitle);
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const data = value as Partial<MagicSystemData>;
  const codexName = isString(data.codexName) && data.codexName.trim().length > 0 ? data.codexName : fallback.codexName;
  const summary = isString(data.summary) ? data.summary : '';

  const principles: MagicSystemPrinciple[] = Array.isArray(data.principles)
    ? data.principles
        .filter((item): item is MagicSystemPrinciple =>
          Boolean(item) && typeof item === 'object' && isString((item as MagicSystemPrinciple).id),
        )
        .map((principle) => sanitizePrinciple(principle))
    : [];

  const sources: MagicSystemSource[] = Array.isArray(data.sources)
    ? data.sources
        .filter((item): item is MagicSystemSource =>
          Boolean(item) && typeof item === 'object' && isString((item as MagicSystemSource).id),
        )
        .map((source) => sanitizeSource(source))
    : [];

  const rituals: MagicSystemRitual[] = Array.isArray(data.rituals)
    ? data.rituals
        .filter((item): item is MagicSystemRitual =>
          Boolean(item) && typeof item === 'object' && isString((item as MagicSystemRitual).id),
        )
        .map((ritual) => sanitizeRitual(ritual))
    : [];

  const taboos: MagicSystemTaboo[] = Array.isArray(data.taboos)
    ? data.taboos
        .filter((item): item is MagicSystemTaboo =>
          Boolean(item) && typeof item === 'object' && isString((item as MagicSystemTaboo).id),
        )
        .map((taboo) => sanitizeTaboo(taboo))
    : [];

  const fieldNotes = Array.isArray(data.fieldNotes)
    ? data.fieldNotes.filter((note): note is string => isString(note)).map((note) => note.trim())
    : [];

  return {
    codexName,
    summary,
    principles,
    sources,
    rituals,
    taboos,
    fieldNotes,
  };
};

export const createTamenzutMagicSystemData = (): MagicSystemData => ({
  codexName: 'Tamenzut Threadweaving Codex',
  summary:
    'Threadweaving binds solar-born strands to mortal memory. Each weave trades a tangible cost and leaves a resonance scar the Continuity Wardens monitor.',
  principles: [
    {
      id: 'principle-reciprocal-balance',
      title: 'Reciprocal Balance',
      focus: 'Every weave demands an equal surrender.',
      description:
        'Stabilize the loom by surrendering something of matching personal value. Favor memories, vows, or treasured objects tied to the scene.',
      stability: 'stable',
    },
    {
      id: 'principle-memory-binding',
      title: 'Memory Binding',
      focus: 'Threads remember intention and caller.',
      description:
        'Weaves cling to the last vivid emotion impressed upon them. Anchor with a mantra in Darv to keep the strand loyal during turbulence.',
      stability: 'stable',
    },
    {
      id: 'principle-veil-tension',
      title: 'Veil Tension',
      focus: 'The further a thread stretches, the harsher the backlash.',
      description:
        'Long-distance or multi-target weaves accumulate veil drag. Without a counter-chord, backlash manifests as fractures in bone, mind, or timeline.',
      stability: 'volatile',
    },
  ],
  sources: [
    {
      id: 'source-solar-loom',
      name: 'Solar Looms',
      resonance: 'Sunlight refracted through loom towers above the Gilded City.',
      capacity: 'High — supports city-scale weaves.',
      tells: 'Amber afterglow on skin, metallic taste, whispers of sung scripture.',
    },
    {
      id: 'source-vein-resonance',
      name: 'Vein Resonance',
      resonance: 'Ley lines pulsing beneath Tamenzut fault lines and canyon scars.',
      capacity: 'Moderate — stable for single targets and travel rituals.',
      tells: 'Soil vibrations, pressure behind the eyes, silhouettes smudging at the edges.',
    },
    {
      id: 'source-echo-pools',
      name: 'Echo Pools',
      resonance: 'Ancestral memory wells tended by Edruel archivists.',
      capacity: 'Low — ideal for prophetic glimpses and binding oaths.',
      tells: 'Cold breath in warm rooms, reflection lags, whispered Darv syllables.',
    },
  ],
  rituals: [
    {
      id: 'ritual-first-thread',
      name: 'First Thread Invocation',
      tier: 'Novice',
      cost: 'A drop of copper blood and a whispered vow offered to the loom.',
      effect: 'Creates a single luminous strand that can mend minor wounds or carry a message.',
      failure: 'Strand frays instantly, scorching the caster’s palm and erasing the spoken vow.',
    },
    {
      id: 'ritual-veil-walk',
      name: 'Veil Walk',
      tier: 'Adept',
      cost: 'Twin weavers, mirrored charms, and a shared memory burned into incense.',
      effect: 'Bridges two sanctified spaces so travelers step through a shimmering seam of air.',
      failure: 'Traveler splits into echoes for a night; they attract warden attention until recombined.',
    },
    {
      id: 'ritual-edruel-recall',
      name: 'Edruel Recall',
      tier: 'Mythic',
      cost: 'Seven nights of chanted Darv, a sacrificed memory, and a relic from the ruins.',
      effect: 'Summons ancestral counsel woven into light, offering prophecy or lost techniques.',
      failure: 'The relic shatters and the sacrificed memory infects the loom with restless spirits.',
    },
  ],
  taboos: [
    {
      id: 'taboo-severed-thread',
      rule: 'Never sever another weaver’s living thread.',
      consequence: 'Victim suffers lasting numbness; the cutter’s shadow becomes translucent for a lunar cycle.',
      restoration: 'Offer a blood-forged cord at the Wardens’ altar and heal three strangers without payment.',
    },
    {
      id: 'taboo-eclipse',
      rule: 'Do not weave beneath a full eclipse.',
      consequence: 'Threads twist feral, binding caster and target into a mirrored fate.',
      restoration: 'Wait forty nights, then weave a Dawn Vigil ritual under the first sunrise.',
    },
    {
      id: 'taboo-final-syllable',
      rule: 'Withhold the final Darv syllable of binding unless the loom witnesses consent.',
      consequence: 'Unauthorized bindings ignite soulfire scars visible to every warden.',
      restoration: 'Confess before the Loom Keepers and surrender a personal secret to the archives.',
    },
  ],
  fieldNotes: [
    'Wardens track resonance scars with prism readers — log notable scars per protagonist.',
    'Threadweaving pairs well with Darv lexicon artifacts. Link them via RELATES_TO for quick recall.',
    'Use the Continuity Monitor to flag scenes where veil drag compounds across chapters.',
  ],
});

