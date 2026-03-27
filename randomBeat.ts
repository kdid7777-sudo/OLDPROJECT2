// Random Beat Generator for KDMPH
// Generates genre-authentic patterns using probabilistic & template logic

export type Genre =
  | 'Hip-Hop'
  | 'Trap'
  | 'R&B'
  | 'Pop'
  | 'Rock'
  | 'Punk Rock'
  | 'House'
  | 'Techno'
  | 'Drum & Bass'
  | 'Reggaeton'
  | 'Jazz'
  | 'Afrobeats'
  | 'Lo-Fi'
  | 'Dubstep'
  | 'Disco';

export interface GenreConfig {
  label: Genre;
  bpm: number;
  description: string;
  emoji: string;
  color: string;
}

export const GENRE_CONFIGS: GenreConfig[] = [
  { label: 'Hip-Hop',     bpm: 90,  description: 'Classic boom-bap with heavy kicks & snares', emoji: '🎤', color: 'from-yellow-600 to-orange-700' },
  { label: 'Trap',        bpm: 140, description: 'Hard 808s, rapid hi-hats & snare rolls',       emoji: '🔥', color: 'from-red-700 to-rose-900' },
  { label: 'R&B',         bpm: 95,  description: 'Smooth grooves with syncopated rhythms',        emoji: '💜', color: 'from-purple-700 to-violet-900' },
  { label: 'Pop',         bpm: 120, description: 'Four-on-the-floor with bright hi-hats',         emoji: '⭐', color: 'from-pink-600 to-fuchsia-700' },
  { label: 'Rock',        bpm: 130, description: 'Driving kick-snare with hard-hitting energy',   emoji: '🎸', color: 'from-gray-600 to-slate-800' },
  { label: 'Punk Rock',   bpm: 160, description: 'Relentless fast-paced raw drum patterns',       emoji: '⚡', color: 'from-green-700 to-emerald-900' },
  { label: 'House',       bpm: 128, description: 'Four-on-the-floor kick with offbeat claps',     emoji: '🏠', color: 'from-cyan-600 to-blue-800' },
  { label: 'Techno',      bpm: 145, description: 'Industrial, repetitive & hypnotic patterns',    emoji: '🤖', color: 'from-gray-700 to-zinc-900' },
  { label: 'Drum & Bass', bpm: 174, description: 'Fast breakbeat drums with syncopation',         emoji: '🥁', color: 'from-blue-700 to-indigo-900' },
  { label: 'Reggaeton',   bpm: 100, description: 'Dembow rhythm with syncopated hi-hats',         emoji: '🌴', color: 'from-green-600 to-teal-800' },
  { label: 'Jazz',        bpm: 120, description: 'Swinging ride with brush snare & ghost notes',  emoji: '🎷', color: 'from-amber-700 to-yellow-900' },
  { label: 'Afrobeats',   bpm: 105, description: 'Polyrhythmic grooves with shakers & toms',      emoji: '🌍', color: 'from-orange-600 to-red-800' },
  { label: 'Lo-Fi',       bpm: 75,  description: 'Chill dusty beats with vinyl feel',             emoji: '📻', color: 'from-teal-700 to-cyan-900' },
  { label: 'Dubstep',     bpm: 140, description: 'Half-time feel with massive snare drops',       emoji: '🌀', color: 'from-violet-700 to-purple-900' },
  { label: 'Disco',       bpm: 120, description: 'Funky four-on-floor with open hi-hats',         emoji: '🪩', color: 'from-yellow-500 to-pink-700' },
];

// ── Row name constants to match default instruments ──
const KICK       = 'Kick';
const SNARE      = 'Snare';
const HIHAT      = 'Hi-Hat';
const OPEN_HAT   = 'Open Hat';
const CLAP       = 'Clap';
const LOW_TOM    = 'Low Tom';
const MID_TOM    = 'Mid Tom';
const RIDE       = 'Ride';
const CRASH      = 'Crash';
const SHAKER     = 'Shaker';

// ── Helpers ──
function prob(p: number): boolean {
  return Math.random() < p;
}

/** Given a 16-step boolean template, randomly sprinkle ghost notes with probability `ghostP` */
function addGhosts(base: boolean[], ghostP: number): boolean[] {
  return base.map(b => (b ? true : prob(ghostP)));
}



// ── 16-step pattern definitions per genre ──
// These are the "skeleton" patterns. We then randomise further to keep it fresh.

type PatternMap = Record<string, boolean[]>;

function generateHipHop(numCols: number): PatternMap {
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [HIHAT]:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1].map(Boolean),
  };
  // Randomise kick slightly
  if (prob(0.6)) base16[KICK][2] = true;
  if (prob(0.4)) base16[KICK][10] = true;
  if (prob(0.5)) base16[KICK][13] = true;
  return scaleToNumCols(base16, numCols);
}

function generateTrap(numCols: number): PatternMap {
  // Trap: sparse kick on 1 & 3, snare on 2 & 4, FAST hi-hat rolls
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [HIHAT]:    [1,1,1,1, 0,1,1,1, 1,1,0,1, 1,1,1,0].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,1,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
  };
  // Random hi-hat bursts (trap rolls)
  const hh = base16[HIHAT];
  for (let i = 0; i < 16; i++) {
    if (prob(0.3)) hh[i] = !hh[i];
  }
  // random 808 kick doubles
  if (prob(0.5)) base16[KICK][6] = true;
  if (prob(0.4)) base16[KICK][14] = true;
  return scaleToNumCols(base16, numCols);
}

function generateRnB(numCols: number): PatternMap {
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [HIHAT]:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1].map(Boolean),
    [CLAP]:     [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [1,0,0,1, 0,1,0,0, 1,0,0,1, 0,1,0,0].map(Boolean),
  };
  // Syncopated kick variations
  if (prob(0.5)) base16[KICK][11] = true;
  if (prob(0.4)) base16[KICK][14] = true;
  return scaleToNumCols(base16, numCols);
}

function generatePop(numCols: number): PatternMap {
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [HIHAT]:    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1].map(Boolean),
  };
  // Drop a random kick for variation
  if (prob(0.5)) base16[KICK][6] = true;
  return scaleToNumCols(base16, numCols);
}

function generateRock(numCols: number): PatternMap {
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [HIHAT]:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
  };
  return scaleToNumCols(base16, numCols);
}

function generatePunkRock(numCols: number): PatternMap {
  // Very dense, fast pattern
  const base16: PatternMap = {
    [KICK]:     [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
    [SNARE]:    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0].map(Boolean),
    [HIHAT]:    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
  };
  return scaleToNumCols(base16, numCols);
}

function generateHouse(numCols: number): PatternMap {
  // Classic 4-on-the-floor
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [HIHAT]:    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0].map(Boolean),
  };
  // Random open hat shuffle
  if (prob(0.5)) base16[OPEN_HAT][10] = true;
  return scaleToNumCols(base16, numCols);
}

function generateTechno(numCols: number): PatternMap {
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1].map(Boolean),
    [HIHAT]:    [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1].map(Boolean),
    [OPEN_HAT]: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
  };
  // random techno variation
  if (prob(0.4)) base16[KICK][10] = true;
  if (prob(0.3)) base16[KICK][14] = true;
  return scaleToNumCols(base16, numCols);
}

function generateDnB(numCols: number): PatternMap {
  // Amen-style breakbeat
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1].map(Boolean),
    [HIHAT]:    [1,1,0,1, 0,1,1,0, 1,0,1,1, 0,1,0,1].map(Boolean),
    [OPEN_HAT]: [0,0,1,0, 0,0,0,1, 0,1,0,0, 1,0,1,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
  };
  return scaleToNumCols(base16, numCols);
}

function generateReggaeton(numCols: number): PatternMap {
  // Classic dembow: kick on 1 & kick+snare on 3.5
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1].map(Boolean),
    [HIHAT]:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
    [OPEN_HAT]: [0,1,0,0, 0,1,0,0, 0,1,0,0, 0,1,0,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1].map(Boolean),
  };
  return scaleToNumCols(base16, numCols);
}

function generateJazz(numCols: number): PatternMap {
  // Jazz swing: ride on all, snare on 2 & 4, ghost notes
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0].map(Boolean),
    [HIHAT]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0].map(Boolean),
    [RIDE]:     [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
    [CRASH]:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
  };
  // Swing ghost notes
  base16[SNARE] = addGhosts(base16[SNARE], 0.15);
  // Random kick improv
  if (prob(0.4)) base16[KICK][5] = true;
  return scaleToNumCols(base16, numCols);
}

function generateAfrobeats(numCols: number): PatternMap {
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,1,0].map(Boolean),
    [SNARE]:    [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0].map(Boolean),
    [HIHAT]:    [1,0,1,1, 0,1,0,1, 1,0,1,1, 0,1,0,1].map(Boolean),
    [OPEN_HAT]: [0,1,0,0, 1,0,1,0, 0,1,0,0, 1,0,1,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [1,1,0,1, 0,1,1,0, 1,1,0,1, 0,1,1,0].map(Boolean),
  };
  return scaleToNumCols(base16, numCols);
}

function generateLoFi(numCols: number): PatternMap {
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [HIHAT]:    [1,0,0,1, 0,1,0,0, 1,0,0,1, 0,1,0,0].map(Boolean),
    [OPEN_HAT]: [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,1,0,0, 0,0,1,0, 0,1,0,0, 0,0,1,0].map(Boolean),
  };
  // Sparse ghost notes for lo-fi feel
  base16[SNARE] = addGhosts(base16[SNARE], 0.08);
  base16[HIHAT] = addGhosts(base16[HIHAT], 0.05);
  // Random kick drop
  if (prob(0.3)) base16[KICK][6] = true;
  return scaleToNumCols(base16, numCols);
}

function generateDubstep(numCols: number): PatternMap {
  // Half-time feel: kick on 1, snare on 3
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [HIHAT]:    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
    [OPEN_HAT]: [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,1].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
  };
  // random wobble hits
  if (prob(0.5)) base16[KICK][10] = true;
  if (prob(0.4)) base16[KICK][12] = true;
  return scaleToNumCols(base16, numCols);
}

function generateDisco(numCols: number): PatternMap {
  const base16: PatternMap = {
    [KICK]:     [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0].map(Boolean),
    [SNARE]:    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [HIHAT]:    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0].map(Boolean),
    [OPEN_HAT]: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(Boolean),
    [CLAP]:     [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean),
    [LOW_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [MID_TOM]:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [RIDE]:     [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1].map(Boolean),
    [CRASH]:    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0].map(Boolean),
    [SHAKER]:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean),
  };
  // Random extra open hat
  if (prob(0.4)) base16[OPEN_HAT][8] = true;
  if (prob(0.4)) base16[OPEN_HAT][12] = true;
  return scaleToNumCols(base16, numCols);
}

/** Stretch/repeat a 16-step pattern to numCols */
function scaleToNumCols(map: PatternMap, numCols: number): PatternMap {
  const result: PatternMap = {};
  for (const key of Object.keys(map)) {
    const base = map[key];
    const out: boolean[] = [];
    for (let i = 0; i < numCols; i++) {
      out.push(base[i % 16]);
    }
    result[key] = out;
  }
  return result;
}

/**
 * Generate a random beat for the given genre.
 * Returns a PatternMap: { [rowName]: boolean[] }
 * Also supports custom rows — those get random sparse patterns.
 */
export function generateRandomBeat(
  genre: Genre,
  numCols: number,
  existingRowNames: string[]
): { patternMap: PatternMap; bpm: number } {
  const config = GENRE_CONFIGS.find(g => g.label === genre)!;
  // Small random BPM variation ±5
  const bpm = config.bpm + Math.floor(Math.random() * 11) - 5;

  let basePattern: PatternMap;

  switch (genre) {
    case 'Hip-Hop':     basePattern = generateHipHop(numCols); break;
    case 'Trap':        basePattern = generateTrap(numCols); break;
    case 'R&B':         basePattern = generateRnB(numCols); break;
    case 'Pop':         basePattern = generatePop(numCols); break;
    case 'Rock':        basePattern = generateRock(numCols); break;
    case 'Punk Rock':   basePattern = generatePunkRock(numCols); break;
    case 'House':       basePattern = generateHouse(numCols); break;
    case 'Techno':      basePattern = generateTechno(numCols); break;
    case 'Drum & Bass': basePattern = generateDnB(numCols); break;
    case 'Reggaeton':   basePattern = generateReggaeton(numCols); break;
    case 'Jazz':        basePattern = generateJazz(numCols); break;
    case 'Afrobeats':   basePattern = generateAfrobeats(numCols); break;
    case 'Lo-Fi':       basePattern = generateLoFi(numCols); break;
    case 'Dubstep':     basePattern = generateDubstep(numCols); break;
    case 'Disco':       basePattern = generateDisco(numCols); break;
    default:            basePattern = generateHipHop(numCols);
  }

  // For any custom row (not in the base pattern), generate a sparse random pattern
  const patternMap: PatternMap = { ...basePattern };
  for (const rowName of existingRowNames) {
    if (!patternMap[rowName]) {
      // Custom row: sparse random pattern appropriate to genre density
      const density = genre === 'Techno' || genre === 'Punk Rock' ? 0.35
        : genre === 'Lo-Fi' || genre === 'Jazz' ? 0.12
        : genre === 'Trap' ? 0.2
        : 0.2;
      patternMap[rowName] = Array.from({ length: numCols }, () => prob(density));
    }
  }

  return { patternMap, bpm };
}
