import type {
  DustlandAnchor,
  EncounterGeneratorConfig,
  EncounterIntensity,
  EncounterObjective,
  EncounterTone,
  GeneratedEncounter,
  PitAnchor,
} from '../types';

type Option<T extends string> = {
  value: T;
  label: string;
  description: string;
};

const INTENSITY_OPTIONS: Option<EncounterIntensity>[] = [
  {
    value: 'story',
    label: 'Story Hook',
    description: 'Low-risk vignette that spotlights new lore or NPC ties.',
  },
  {
    value: 'skirmish',
    label: 'Skirmish',
    description: 'Tactical clash with meaningful stakes and branching outcomes.',
  },
  {
    value: 'gauntlet',
    label: 'Gauntlet',
    description: 'High-pressure sequence that pushes the campaign arc forward.',
  },
];

const OBJECTIVE_OPTIONS: Option<EncounterObjective>[] = [
  {
    value: 'recon',
    label: 'Recon',
    description: 'Scout threats, gather intel, or map volatile zones.',
  },
  {
    value: 'extraction',
    label: 'Extraction',
    description: 'Pull an asset out before Dustland tech or PIT fauna reclaim it.',
  },
  {
    value: 'sabotage',
    label: 'Sabotage',
    description: 'Disable a hostile system before it ripples across worlds.',
  },
  {
    value: 'escort',
    label: 'Escort',
    description: 'Keep allies safe while the worlds braid their agendas.',
  },
];

const TONE_OPTIONS: Option<EncounterTone>[] = [
  {
    value: 'hopeful',
    label: 'Hopeful',
    description: 'Lean on community, resilience, and cross-world solidarity.',
  },
  {
    value: 'tense',
    label: 'Tense',
    description: 'Balance brinkmanship with precision—one misstep shifts canon.',
  },
  {
    value: 'grim',
    label: 'Grim',
    description: 'Highlight sacrifice, attrition, and the cost of convergence.',
  },
  {
    value: 'mystic',
    label: 'Mystic',
    description: 'Focus on surreal signals, rituals, and dreamlike threats.',
  },
];

const DUSTLAND_ANCHOR_DATA: Option<DustlandAnchor>[] = [
  {
    value: 'personaMasks',
    label: 'Persona Masks',
    description: 'Identity-shifting tools that let operatives channel archived roles.',
  },
  {
    value: 'resonanceCaravans',
    label: 'Resonance Caravans',
    description: 'Mobile enclaves tuning CRT signal arrays across the Dustland.',
  },
  {
    value: 'archiveWards',
    label: 'Archive Wards',
    description: 'Protective latticework safeguarding Tamenzut relic caches.',
  },
  {
    value: 'signalSpire',
    label: 'Signal Spires',
    description: 'Broadcast towers stitching Dustland myth broadcasts together.',
  },
];

const PIT_ANCHOR_DATA: Option<PitAnchor>[] = [
  {
    value: 'breachCult',
    label: 'Breach Cult',
    description: 'Apostles who worship the dimensional tears that birthed PIT.',
  },
  {
    value: 'feralDrift',
    label: 'Feral Drift',
    description: 'Wildline packs mutated by PIT fauna and irradiated weather.',
  },
  {
    value: 'emberParliament',
    label: 'Ember Parliament',
    description: 'Strategists turning volcanic citadels into negotiation arenas.',
  },
  {
    value: 'riftSyndicate',
    label: 'Rift Syndicate',
    description: 'Smugglers monetising cross-world contraband from PIT fissures.',
  },
];

const DEFAULT_CONFIG: EncounterGeneratorConfig = {
  intensity: 'skirmish',
  objective: 'recon',
  tone: 'tense',
  dustlandAnchor: 'resonanceCaravans',
  pitAnchor: 'emberParliament',
};

const makeOptionMap = <T extends string>(options: Option<T>[]): Map<T, Option<T>> => {
  return new Map(options.map((option) => [option.value, option]));
};

const INTENSITY_LOOKUP = makeOptionMap(INTENSITY_OPTIONS);
const OBJECTIVE_LOOKUP = makeOptionMap(OBJECTIVE_OPTIONS);
const TONE_LOOKUP = makeOptionMap(TONE_OPTIONS);
const DUSTLAND_LOOKUP = makeOptionMap(DUSTLAND_ANCHOR_DATA);
const PIT_LOOKUP = makeOptionMap(PIT_ANCHOR_DATA);

const ensureOption = <T extends string>(
  lookup: Map<T, Option<T>>,
  fallback: T,
  candidate?: T,
): T => {
  if (candidate && lookup.has(candidate)) {
    return candidate;
  }
  return fallback;
};

const DUSTLAND_DETAILS: Record<
  DustlandAnchor,
  {
    locales: string[];
    missions: string[];
    rewards: string[];
  }
> = {
  personaMasks: {
    locales: [
      'Mask forge hidden beneath a CRT cathedral',
      'Persona rehearsal chamber carved into the Dustland metro',
      'Street market trading masks that echo Tamenzut vows',
    ],
    missions: [
      'secure a mask that impersonates a PIT tactician',
      'stabilise a fractured persona before it shatters canon',
      'track a smuggler weaving Dustland masks with PIT chimeras',
    ],
    rewards: [
      'Persona schema that unlocks dual-world disguises',
      'Archive favour owed by the Maskwright Circle',
      'Mask shard amplifying empathy across factions',
    ],
  },
  resonanceCaravans: {
    locales: [
      'Caravan plaza beneath flickering broadcast billboards',
      'Salvaged mag-rail convoy tuned to Dustland hymnals',
      'Signal barge drifting through neon-lit storm alleys',
    ],
    missions: [
      'escort a caravan calibrating PIT-resistant shields',
      'decode a caravan broadcast seeded with PIT war songs',
      'negotiate safe passage with Dustland traders fearing PIT spores',
    ],
    rewards: [
      'Convoy escort owed by Dustland pilots',
      'Signal scrambler harmonised to PIT interference',
      'Map of hidden caravan refuelling vaults',
    ],
  },
  archiveWards: {
    locales: [
      'Vault corridor ablaze with Tamenzut wardlight',
      'Sunken archive annex storing PIT-contaminated relics',
      'Crescent-shaped warding array hugging a Dustland breach',
    ],
    missions: [
      'repair a ward cracked by PIT psionics',
      'evacuate scholars before the ward collapses',
      'install PIT-resistant sigils along the archive perimeter',
    ],
    rewards: [
      'Ward attunement granting safe passage through relic caches',
      'Codex entry detailing PIT-proof binding rites',
      'Alliance with archivists sharing cross-world intelligence',
    ],
  },
  signalSpire: {
    locales: [
      'Signal spire piercing a dust storm at the city edge',
      'Collapsed spire repurposed as a PIT listening station',
      'Twin spires braiding Dustland static with PIT chorus nodes',
    ],
    missions: [
      'retune the broadcast before PIT chants hijack the feed',
      'plant a counter-frequency to reveal PIT infiltrators',
      'protect engineers rewiring the spire for Dustland relief calls',
    ],
    rewards: [
      'Encrypted broadcast key carrying Dustland rally codes',
      'Sonic lens revealing PIT anomalies in the field',
      'Promise of spire support during future missions',
    ],
  },
};

const PIT_DETAILS: Record<
  PitAnchor,
  {
    locales: string[];
    threats: string[];
    rewards: string[];
  }
> = {
  breachCult: {
    locales: [
      'Obsidian amphitheatre carved around a glowing breach',
      'Chant-filled catacombs storing PIT relic votives',
      'Procession route where cultists tattoo Dustland glyphs',
    ],
    threats: [
      'ritualists siphoning Dustland static to widen the rift',
      'cult prophets disguising PIT spawn beneath borrowed masks',
      'zealots deploying breachfire to erase archive wards',
    ],
    rewards: [
      'Cipher that calms breach tremors for a night',
      'Captured chantbook revealing cult supply lines',
      'Favor from defectors who know PIT secret routes',
    ],
  },
  feralDrift: {
    locales: [
      'Junkyard citadel patrolled by bio-augmented beasts',
      'Mire of irradiated vines threading through PIT fissures',
      'Shattered trainyard where feral packs hunt Dustland scouts',
    ],
    threats: [
      'alpha packs hunting Dustland caravans',
      'feral shamans warping Dustland tech into bone totems',
      'ambushes timed with PIT lightning storms',
    ],
    rewards: [
      'Ferality antidote derived from PIT spores',
      'Beast-taming oath forging temporary alliances',
      'Salvaged bio-armor tuned to Dustland frequencies',
    ],
  },
  emberParliament: {
    locales: [
      'Volcanic senate floor suspended over magma conduits',
      'Negotiation dais ringed by molten data obelisks',
      'Cooling chamber where emissaries share PIT emberwine',
    ],
    threats: [
      'political gambits that pit Dustland allies against each other',
      'sudden flare eruptions forcing rapid evacuations',
      'clandestine PIT lobbyists buying Dustland secrets',
    ],
    rewards: [
      'Parliament writ granting passage through PIT-controlled vents',
      'Diplomatic leverage with ember envoys',
      'Sealed testimony exposing traitors across both worlds',
    ],
  },
  riftSyndicate: {
    locales: [
      'Smuggler docks carved along a gravity-inverted rift',
      'Contraband vault accessed through floating platforms',
      'Night bazaar trading PIT tech for Dustland memories',
    ],
    threats: [
      'syndicate brokers selling weaponised personas',
      'rift smugglers jamming Dustland comms',
      'mercenaries wielding PIT implosion grenades',
    ],
    rewards: [
      'Ledger naming syndicate buyers across the multiverse',
      'Token granting a favour from the Rift trade queen',
      'Cache of hybrid tech ready for Dustland retrofit',
    ],
  },
};

const OBJECTIVE_BEATS: Record<EncounterObjective, string[]> = {
  recon: [
    'Survey overlapping patrol routes and map their blind spots',
    'Capture resonance spectrums before they destabilise',
    'Shadow emissaries to learn who is funding the convergence',
  ],
  extraction: [
    'Evacuate a trapped specialist before the breach consumes them',
    'Recover a relic tether binding PIT fauna to Dustland grids',
    'Smuggle a witness who can decode both worlds’ politics',
  ],
  sabotage: [
    'Cripple the power conduits amplifying PIT ritual fields',
    'Plant failsafe sigils that collapse illicit broadcasts',
    'Turn syndicate weapons against their own summoners',
  ],
  escort: [
    'Protect diplomats exchanging Dustland wards for PIT truces',
    'Guide a caravan of displaced families through contested ground',
    'Guard engineers calibrating a cross-world stabiliser array',
  ],
};

const TONE_BEATS: Record<EncounterTone, { color: string; cadence: string[] }> = {
  hopeful: {
    color: 'Threads of solidarity weave unexpected allies together.',
    cadence: [
      'Locals share hidden caches when shown kindness',
      'Old rivalries soften as the converged worlds recognise mirrored grief',
      'A rescued chorus steadies nerves with Dustland hymnals',
    ],
  },
  tense: {
    color: 'Every decision tightens the wire between triumph and catastrophe.',
    cadence: [
      'Timer glyphs crackle as breaches surge in syncopated bursts',
      'Intel conflicts—choose who to trust before the window closes',
      'Unexpected reinforcements arrive but demand immediate proof of loyalty',
    ],
  },
  grim: {
    color: 'Victory demands sacrifice, and the worlds remember every cost.',
    cadence: [
      'An ally bargains their memories for a corridor to safety',
      'Weathered Dustland veterans coach rookies through trauma drills',
      'Fallen foes whisper last warnings that complicate the mission',
    ],
  },
  mystic: {
    color: 'Ritual echoes and dream logic blur the line between truth and omen.',
    cadence: [
      'Visions bleed into the battlefield, showing divergent futures',
      'PIT fauna hum Tamenzut lullabies learned in forgotten lifetimes',
      'Glyph constellations rearrange as decisions ripple across timelines',
    ],
  },
};

const INTENSITY_TITLES: Record<EncounterIntensity, string[]> = {
  story: [
    'Spark of Convergence',
    'Signal of Accord',
    'Crossfade Prelude',
  ],
  skirmish: [
    'Breachside Gambit',
    'CRT Counterstrike',
    'Caravan Stand',
  ],
  gauntlet: [
    'Gauntlet of the Twin Worlds',
    'Final Archive Vigil',
    'Anvil of the Rift',
  ],
};

const CROSSOVER_SPARKS: string[] = [
  'A Dustland mask vibrates when PIT pulse storms align.',
  'Tamenzut relics glow whenever breach cult hymns crescendo.',
  'A caravan child translates PIT hand signs no one taught them.',
  'Syndicate smugglers barter in memories recorded on CRT tape.',
  'Ember envoys promise reinforcements if Dustland tech mends their vents.',
];

const HYBRID_REWARDS: string[] = [
  'Joint task force contact bridging Dustland logistics and PIT scouts',
  'Cross-world safehouse keyed to both resonance codes and breach sigils',
  'Prototype translator harmonising Dustland static with PIT pheromone signals',
  'Lore packet documenting how Dustland myths rewrite PIT folklore',
];

const pick = <T>(items: readonly T[], rng: () => number): T => {
  const index = Math.floor(rng() * items.length);
  return items[index >= items.length ? items.length - 1 : index];
};

export const ENCOUNTER_INTENSITY_OPTIONS = INTENSITY_OPTIONS;
export const ENCOUNTER_OBJECTIVE_OPTIONS = OBJECTIVE_OPTIONS;
export const ENCOUNTER_TONE_OPTIONS = TONE_OPTIONS;
export const DUSTLAND_ANCHOR_OPTIONS = DUSTLAND_ANCHOR_DATA;
export const PIT_ANCHOR_OPTIONS = PIT_ANCHOR_DATA;

export const createEncounterConfig = (
  input?: Partial<EncounterGeneratorConfig> | null,
): EncounterGeneratorConfig => {
  const source = input ?? {};
  return {
    intensity: ensureOption(INTENSITY_LOOKUP, DEFAULT_CONFIG.intensity, source.intensity),
    objective: ensureOption(OBJECTIVE_LOOKUP, DEFAULT_CONFIG.objective, source.objective),
    tone: ensureOption(TONE_LOOKUP, DEFAULT_CONFIG.tone, source.tone),
    dustlandAnchor: ensureOption(DUSTLAND_LOOKUP, DEFAULT_CONFIG.dustlandAnchor, source.dustlandAnchor),
    pitAnchor: ensureOption(PIT_LOOKUP, DEFAULT_CONFIG.pitAnchor, source.pitAnchor),
  };
};

export const sanitizeEncounterConfig = (input: unknown): EncounterGeneratorConfig => {
  if (!input || typeof input !== 'object') {
    return createEncounterConfig();
  }

  const candidate = input as Partial<EncounterGeneratorConfig>;
  return createEncounterConfig(candidate);
};

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

export const sanitizeGeneratedEncounter = (value: unknown): GeneratedEncounter | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const raw = value as Partial<GeneratedEncounter>;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const location = typeof raw.location === 'string' ? raw.location.trim() : '';
  const briefing = typeof raw.briefing === 'string' ? raw.briefing.trim() : '';
  const beats = sanitizeStringArray(raw.beats);
  const rewards = sanitizeStringArray(raw.rewards);

  if (!title && !location && !briefing && beats.length === 0 && rewards.length === 0) {
    return undefined;
  }

  return {
    title: title || 'Untitled Encounter',
    location: location || 'Uncharted convergence point',
    briefing: briefing || 'An encounter awaits between Dustland operatives and PIT forces.',
    beats,
    rewards,
  };
};

export const generateEncounter = (
  configInput?: Partial<EncounterGeneratorConfig> | null,
  rng: () => number = Math.random,
): GeneratedEncounter => {
  const config = createEncounterConfig(configInput ?? undefined);
  const dustland = DUSTLAND_DETAILS[config.dustlandAnchor];
  const pit = PIT_DETAILS[config.pitAnchor];
  const tone = TONE_BEATS[config.tone];
  const intensityLabel = INTENSITY_LOOKUP.get(config.intensity)?.label ?? config.intensity;
  const missionName = pick(INTENSITY_TITLES[config.intensity], rng);
  const dustlandFocus = pick(dustland.missions, rng);
  const pitThreat = pick(pit.threats, rng);
  const dustlandLocale = pick(dustland.locales, rng);
  const pitLocale = pick(pit.locales, rng);
  const title = `${intensityLabel}: ${missionName} — ${dustlandFocus}`;
  const location = `Dustland site — ${dustlandLocale} | PIT front — ${pitLocale}`;
  const catalyst = pick(CROSSOVER_SPARKS, rng);
  const objectiveBeat = pick(OBJECTIVE_BEATS[config.objective], rng);
  const toneBeats = tone.cadence.map((beat) => beat);

  const beats = [
    tone.color,
    `Dustland priority: ${dustlandFocus}.`,
    `PIT pressure: ${pitThreat}.`,
    `Objective: ${objectiveBeat}.`,
    `Crossover spark: ${catalyst}`,
    pick(toneBeats, rng),
  ];

  const rewards = [
    pick(dustland.rewards, rng),
    pick(pit.rewards, rng),
    pick(HYBRID_REWARDS, rng),
  ];

  const briefing = `A ${config.tone} ${config.intensity} focusing on ${config.objective} play unfolds as Dustland ${
    DUSTLAND_LOOKUP.get(config.dustlandAnchor)?.label ?? config.dustlandAnchor
  } negotiate with PIT ${PIT_LOOKUP.get(config.pitAnchor)?.label ?? config.pitAnchor}. ${catalyst}`;

  return {
    title,
    location,
    briefing,
    beats,
    rewards,
  };
};

export const DEFAULT_ENCOUNTER_CONFIG = DEFAULT_CONFIG;

