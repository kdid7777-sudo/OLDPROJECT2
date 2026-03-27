export interface BeatRow {
  id: string;
  name: string;
  cells: boolean[];
  customFileName?: string;
  // Note: AudioBuffer is not serializable, stored separately in memory
}

export interface BeatProject {
  id: string;
  name: string;
  bpm: number;
  numCols: number;
  rows: BeatRow[];
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_INSTRUMENTS = [
  'Kick',
  'Snare',
  'Hi-Hat',
  'Open Hat',
  'Clap',
  'Low Tom',
  'Mid Tom',
  'Ride',
  'Crash',
  'Shaker',
];

export const BPM_PRESETS = [
  { label: 'Slow', bpm: 70 },
  { label: 'Hip-Hop', bpm: 90 },
  { label: 'R&B', bpm: 95 },
  { label: 'Pop', bpm: 120 },
  { label: 'Rock', bpm: 130 },
  { label: 'House', bpm: 128 },
  { label: 'Techno', bpm: 140 },
  { label: 'Drum & Bass', bpm: 174 },
];
