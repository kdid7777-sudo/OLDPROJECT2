// ─── Music / InstruComposer Types ───────────────────────────────────────────

export type NoteValue = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface PianoNote {
  /** unique id */
  id: string;
  /** column (time step), 0-indexed */
  col: number;
  /** row index in the grid (0 = highest pitch) */
  row: number;
  /** how many columns this note spans (1 = one step) */
  duration: number;
  /** velocity 0–1 */
  velocity: number;
}

export interface InstrumentTrack {
  id: string;
  name: string;
  instrumentKey: string;       // key into INSTRUMENT_PRESETS
  color: string;               // e.g. '#00e5ff'
  notes: PianoNote[];
  customAudioBuffer?: string;  // base64 if user uploaded — not stored in notes
  customFileName?: string;
  /** fx */
  fadeIn: boolean;
  fadeOut: boolean;
  echo: boolean;
  echoDelay: number;           // ms
  echoFeedback: number;        // 0–1
  volume: number;              // 0–1
  muted: boolean;
}

export interface MusicProject {
  id: string;
  name: string;
  bpm: number;
  numCols: number;             // total columns (time steps)
  tracks: InstrumentTrack[];
  createdAt: number;
  updatedAt: number;
  type: 'music';
}

// ─── Instruments ─────────────────────────────────────────────────────────────

export interface InstrumentPreset {
  key: string;
  name: string;
  emoji: string;
  category: string;
  /** synthesis parameters */
  oscillatorType: OscillatorType | 'custom';
  attackTime: number;
  decayTime: number;
  sustainLevel: number;
  releaseTime: number;
  filterFreq: number;
  filterType: BiquadFilterType;
  detune: number;
  harmonics?: number[];
}

export const INSTRUMENT_PRESETS: Record<string, InstrumentPreset> = {
  piano: {
    key: 'piano', name: 'Piano', emoji: '🎹', category: 'Keys',
    oscillatorType: 'triangle', attackTime: 0.005, decayTime: 0.3,
    sustainLevel: 0.4, releaseTime: 0.8, filterFreq: 8000, filterType: 'lowpass', detune: 0,
  },
  electricPiano: {
    key: 'electricPiano', name: 'Electric Piano', emoji: '🎹', category: 'Keys',
    oscillatorType: 'sine', attackTime: 0.01, decayTime: 0.2,
    sustainLevel: 0.5, releaseTime: 0.6, filterFreq: 5000, filterType: 'lowpass', detune: 2,
  },
  organ: {
    key: 'organ', name: 'Organ', emoji: '🎸', category: 'Keys',
    oscillatorType: 'square', attackTime: 0.01, decayTime: 0.05,
    sustainLevel: 0.9, releaseTime: 0.1, filterFreq: 3000, filterType: 'lowpass', detune: 0,
  },
  flute: {
    key: 'flute', name: 'Flute', emoji: '🎵', category: 'Wind',
    oscillatorType: 'sine', attackTime: 0.08, decayTime: 0.1,
    sustainLevel: 0.7, releaseTime: 0.3, filterFreq: 12000, filterType: 'highpass', detune: 0,
  },
  clarinet: {
    key: 'clarinet', name: 'Clarinet', emoji: '🎷', category: 'Wind',
    oscillatorType: 'square', attackTime: 0.05, decayTime: 0.1,
    sustainLevel: 0.6, releaseTime: 0.2, filterFreq: 2500, filterType: 'bandpass', detune: 0,
  },
  saxophone: {
    key: 'saxophone', name: 'Saxophone', emoji: '🎷', category: 'Wind',
    oscillatorType: 'sawtooth', attackTime: 0.06, decayTime: 0.15,
    sustainLevel: 0.65, releaseTime: 0.25, filterFreq: 1800, filterType: 'bandpass', detune: 5,
  },
  trumpet: {
    key: 'trumpet', name: 'Trumpet', emoji: '🎺', category: 'Brass',
    oscillatorType: 'sawtooth', attackTime: 0.04, decayTime: 0.1,
    sustainLevel: 0.7, releaseTime: 0.2, filterFreq: 3500, filterType: 'bandpass', detune: 0,
  },
  trombone: {
    key: 'trombone', name: 'Trombone', emoji: '🎺', category: 'Brass',
    oscillatorType: 'sawtooth', attackTime: 0.06, decayTime: 0.15,
    sustainLevel: 0.65, releaseTime: 0.3, filterFreq: 2200, filterType: 'lowpass', detune: -3,
  },
  violin: {
    key: 'violin', name: 'Violin', emoji: '🎻', category: 'Strings',
    oscillatorType: 'sawtooth', attackTime: 0.1, decayTime: 0.05,
    sustainLevel: 0.8, releaseTime: 0.4, filterFreq: 4000, filterType: 'lowpass', detune: 0,
  },
  cello: {
    key: 'cello', name: 'Cello', emoji: '🎻', category: 'Strings',
    oscillatorType: 'sawtooth', attackTime: 0.12, decayTime: 0.08,
    sustainLevel: 0.75, releaseTime: 0.5, filterFreq: 2500, filterType: 'lowpass', detune: -5,
  },
  guitar: {
    key: 'guitar', name: 'Acoustic Guitar', emoji: '🎸', category: 'Strings',
    oscillatorType: 'triangle', attackTime: 0.005, decayTime: 0.4,
    sustainLevel: 0.3, releaseTime: 0.6, filterFreq: 5000, filterType: 'lowpass', detune: 0,
  },
  electricGuitar: {
    key: 'electricGuitar', name: 'Electric Guitar', emoji: '🎸', category: 'Strings',
    oscillatorType: 'sawtooth', attackTime: 0.005, decayTime: 0.2,
    sustainLevel: 0.5, releaseTime: 0.4, filterFreq: 4000, filterType: 'lowpass', detune: 10,
  },
  banjo: {
    key: 'banjo', name: 'Banjo', emoji: '🪕', category: 'Strings',
    oscillatorType: 'triangle', attackTime: 0.003, decayTime: 0.3,
    sustainLevel: 0.2, releaseTime: 0.4, filterFreq: 6000, filterType: 'highpass', detune: 0,
  },
  sitar: {
    key: 'sitar', name: 'Sitar', emoji: '🪕', category: 'Strings',
    oscillatorType: 'sawtooth', attackTime: 0.01, decayTime: 0.5,
    sustainLevel: 0.4, releaseTime: 0.7, filterFreq: 3000, filterType: 'bandpass', detune: 15,
  },
  bass: {
    key: 'bass', name: 'Bass Guitar', emoji: '🎸', category: 'Bass',
    oscillatorType: 'sawtooth', attackTime: 0.01, decayTime: 0.15,
    sustainLevel: 0.6, releaseTime: 0.3, filterFreq: 800, filterType: 'lowpass', detune: 0,
  },
  synth: {
    key: 'synth', name: 'Synth Lead', emoji: '🎛️', category: 'Electronic',
    oscillatorType: 'sawtooth', attackTime: 0.02, decayTime: 0.1,
    sustainLevel: 0.7, releaseTime: 0.3, filterFreq: 6000, filterType: 'lowpass', detune: 5,
  },
  synthPad: {
    key: 'synthPad', name: 'Synth Pad', emoji: '🌊', category: 'Electronic',
    oscillatorType: 'sine', attackTime: 0.3, decayTime: 0.2,
    sustainLevel: 0.8, releaseTime: 1.0, filterFreq: 4000, filterType: 'lowpass', detune: 8,
  },
  bells: {
    key: 'bells', name: 'Bells / Glockenspiel', emoji: '🔔', category: 'Percussion',
    oscillatorType: 'sine', attackTime: 0.002, decayTime: 0.5,
    sustainLevel: 0.1, releaseTime: 1.5, filterFreq: 10000, filterType: 'highpass', detune: 0,
  },
  marimba: {
    key: 'marimba', name: 'Marimba', emoji: '🥁', category: 'Percussion',
    oscillatorType: 'sine', attackTime: 0.003, decayTime: 0.4,
    sustainLevel: 0.15, releaseTime: 0.5, filterFreq: 7000, filterType: 'lowpass', detune: 0,
  },
  harp: {
    key: 'harp', name: 'Harp', emoji: '🎵', category: 'Strings',
    oscillatorType: 'triangle', attackTime: 0.008, decayTime: 0.6,
    sustainLevel: 0.25, releaseTime: 1.0, filterFreq: 9000, filterType: 'lowpass', detune: 0,
  },
  xylophone: {
    key: 'xylophone', name: 'Xylophone', emoji: '🎵', category: 'Percussion',
    oscillatorType: 'sine', attackTime: 0.002, decayTime: 0.3,
    sustainLevel: 0.1, releaseTime: 0.4, filterFreq: 8000, filterType: 'highpass', detune: 0,
  },
  oud: {
    key: 'oud', name: 'Oud', emoji: '🪕', category: 'World',
    oscillatorType: 'sawtooth', attackTime: 0.008, decayTime: 0.35,
    sustainLevel: 0.35, releaseTime: 0.5, filterFreq: 3500, filterType: 'bandpass', detune: 8,
  },
  accordion: {
    key: 'accordion', name: 'Accordion', emoji: '🪗', category: 'Wind',
    oscillatorType: 'square', attackTime: 0.05, decayTime: 0.05,
    sustainLevel: 0.8, releaseTime: 0.15, filterFreq: 2800, filterType: 'lowpass', detune: 3,
  },
};

// ─── Pitch rows (chromatic, 5 octaves, high to low) ──────────────────────────

export const OCTAVES = [6, 5, 4, 3, 2];
export const NOTE_NAMES: NoteValue[] = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];

export interface PitchRow {
  label: string;    // e.g. 'C4'
  note: NoteValue;
  octave: number;
  frequency: number;
  isBlack: boolean; // sharps/flats
}

function noteToFreq(note: NoteValue, octave: number): number {
  const noteOrder: Record<NoteValue, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
  };
  const semitone = (octave + 1) * 12 + noteOrder[note];
  return 440 * Math.pow(2, (semitone - 69) / 12);
}

export function buildPitchRows(): PitchRow[] {
  const rows: PitchRow[] = [];
  for (const oct of OCTAVES) {
    for (const note of NOTE_NAMES) {
      rows.push({
        label: `${note}${oct}`,
        note,
        octave: oct,
        frequency: noteToFreq(note, oct),
        isBlack: note.includes('#'),
      });
    }
  }
  return rows;
}

export const PITCH_ROWS = buildPitchRows(); // 60 rows total

// ─── Genre presets for music ──────────────────────────────────────────────────

export interface MusicGenrePreset {
  key: string;
  label: string;
  emoji: string;
  bpm: number;
  bpmRange: [number, number];
  description: string;
  instrumentKeys: string[];   // preferred instruments
  scaleIntervals: number[];   // semitone intervals from root (major/minor/pentatonic etc.)
  chordProgressions: number[][];  // scale degrees (0-indexed)
}

export const MUSIC_GENRES: MusicGenrePreset[] = [
  {
    key: 'classical', label: 'Classical', emoji: '🎼', bpm: 76, bpmRange: [60, 96],
    description: 'Elegant orchestral arrangements',
    instrumentKeys: ['violin', 'cello', 'piano', 'flute', 'harp'],
    scaleIntervals: [0, 2, 4, 5, 7, 9, 11], // Major
    chordProgressions: [[0,2,4],[3,5,0],[4,6,1],[0,2,4]],
  },
  {
    key: 'jazz', label: 'Jazz', emoji: '🎷', bpm: 120, bpmRange: [100, 160],
    description: 'Swingy, chromatic jazz vibes',
    instrumentKeys: ['saxophone', 'piano', 'trumpet', 'bass', 'violin'],
    scaleIntervals: [0, 2, 3, 5, 7, 9, 10], // Dorian
    chordProgressions: [[0,2,4,6],[3,5,0,2],[4,6,1,3],[0,2,4,6]],
  },
  {
    key: 'pop', label: 'Pop', emoji: '⭐', bpm: 120, bpmRange: [100, 130],
    description: 'Catchy, melodic pop energy',
    instrumentKeys: ['synth', 'piano', 'electricPiano', 'guitar', 'bass'],
    scaleIntervals: [0, 2, 4, 5, 7, 9, 11], // Major
    chordProgressions: [[0,2,4],[4,6,1],[3,5,0],[4,6,1]],
  },
  {
    key: 'hiphop', label: 'Hip-Hop', emoji: '🎤', bpm: 90, bpmRange: [80, 100],
    description: 'Soulful hip-hop instrumentals',
    instrumentKeys: ['piano', 'bass', 'synth', 'bells', 'electricPiano'],
    scaleIntervals: [0, 2, 3, 5, 7, 8, 10], // Natural Minor
    chordProgressions: [[0,2,4],[6,1,3],[4,6,1],[3,5,0]],
  },
  {
    key: 'rnb', label: 'R&B', emoji: '💜', bpm: 95, bpmRange: [80, 110],
    description: 'Smooth, groovy R&B vibes',
    instrumentKeys: ['electricPiano', 'synth', 'bass', 'saxophone', 'piano'],
    scaleIntervals: [0, 2, 3, 5, 7, 9, 10], // Dorian
    chordProgressions: [[0,2,4,6],[3,5,0,2],[4,6,1,3],[0,2,4,6]],
  },
  {
    key: 'rock', label: 'Rock', emoji: '🎸', bpm: 130, bpmRange: [115, 145],
    description: 'Powerful guitar-driven rock',
    instrumentKeys: ['electricGuitar', 'bass', 'organ', 'synth', 'piano'],
    scaleIntervals: [0, 2, 4, 5, 7, 9, 11], // Major
    chordProgressions: [[0,2,4],[3,5,0],[4,6,1],[0,2,4]],
  },
  {
    key: 'blues', label: 'Blues', emoji: '🔵', bpm: 80, bpmRange: [60, 100],
    description: 'Soulful, expressive blues',
    instrumentKeys: ['guitar', 'saxophone', 'piano', 'bass', 'harmonica'],
    scaleIntervals: [0, 3, 5, 6, 7, 10], // Blues Scale
    chordProgressions: [[0,2,4],[0,2,4],[3,5,0],[0,2,4],[4,6,1],[3,5,0]],
  },
  {
    key: 'lofi', label: 'Lo-Fi', emoji: '📻', bpm: 75, bpmRange: [65, 85],
    description: 'Chill, dusty lo-fi beats',
    instrumentKeys: ['piano', 'electricPiano', 'bass', 'marimba', 'guitar'],
    scaleIntervals: [0, 2, 3, 5, 7, 9, 10], // Dorian
    chordProgressions: [[0,2,4,6],[3,5,0,2],[4,6,1,3],[0,2,4,6]],
  },
  {
    key: 'indian', label: 'Indian Classical', emoji: '🌺', bpm: 80, bpmRange: [60, 100],
    description: 'Sitar-led Indian classical fusion',
    instrumentKeys: ['sitar', 'flute', 'tabla', 'oud', 'bells'],
    scaleIntervals: [0, 1, 4, 5, 7, 8, 11], // Bhairav raga
    chordProgressions: [[0,2,4],[0,3,5],[0,2,4],[4,0,2]],
  },
  {
    key: 'world', label: 'World Music', emoji: '🌍', bpm: 100, bpmRange: [85, 115],
    description: 'Global rhythms and textures',
    instrumentKeys: ['oud', 'sitar', 'accordion', 'flute', 'marimba'],
    scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
    chordProgressions: [[0,2,4],[3,5,0],[4,6,1],[0,2,4]],
  },
  {
    key: 'electronic', label: 'Electronic', emoji: '🤖', bpm: 128, bpmRange: [120, 140],
    description: 'Pulsing synth-driven electronica',
    instrumentKeys: ['synth', 'synthPad', 'bass', 'electricPiano', 'bells'],
    scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
    chordProgressions: [[0,2,4],[4,6,1],[3,5,0],[4,6,1]],
  },
  {
    key: 'cinematic', label: 'Cinematic', emoji: '🎬', bpm: 72, bpmRange: [60, 90],
    description: 'Epic orchestral film scores',
    instrumentKeys: ['violin', 'cello', 'piano', 'trumpet', 'trombone', 'harp'],
    scaleIntervals: [0, 2, 3, 5, 7, 8, 10], // Natural Minor
    chordProgressions: [[0,2,4],[6,1,3],[3,5,0],[4,6,1]],
  },
  {
    key: 'folk', label: 'Folk', emoji: '🌿', bpm: 100, bpmRange: [85, 115],
    description: 'Warm acoustic folk melodies',
    instrumentKeys: ['guitar', 'banjo', 'accordion', 'flute', 'violin'],
    scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
    chordProgressions: [[0,2,4],[3,5,0],[4,6,1],[0,2,4]],
  },
  {
    key: 'reggae', label: 'Reggae', emoji: '🌴', bpm: 90, bpmRange: [80, 100],
    description: 'Laid-back reggae rhythms',
    instrumentKeys: ['electricGuitar', 'bass', 'organ', 'piano', 'saxophone'],
    scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
    chordProgressions: [[0,2,4],[3,5,0],[4,6,1],[3,5,0]],
  },
  {
    key: 'ambient', label: 'Ambient', emoji: '🌌', bpm: 60, bpmRange: [50, 75],
    description: 'Dreamy, atmospheric soundscapes',
    instrumentKeys: ['synthPad', 'harp', 'bells', 'flute', 'violin'],
    scaleIntervals: [0, 2, 4, 7, 9], // Pentatonic
    chordProgressions: [[0,2,4],[0,2,4],[3,0,4],[0,2,4]],
  },
];

// Track colors
export const TRACK_COLORS = [
  '#00e5ff', '#00bcd4', '#18ffff', '#80deea',
  '#b2ebf2', '#4dd0e1', '#26c6da', '#00acc1',
  '#0097a7', '#00838f',
];
