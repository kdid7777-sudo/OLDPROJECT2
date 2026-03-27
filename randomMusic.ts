// ─── Random Music Generator for InstruComposer ──────────────────────────────
import type { MusicGenrePreset, InstrumentTrack, PianoNote, MusicProject } from '../types/music';
import { PITCH_ROWS, INSTRUMENT_PRESETS, TRACK_COLORS, MUSIC_GENRES } from '../types/music';
import { generateMusicId } from './musicStorage';

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function chance(p: number) {
  return Math.random() < p;
}

/**
 * Build a scale (row indices in PITCH_ROWS) starting from a root row.
 * PITCH_ROWS goes high to low; we work within a range of rows.
 */
function buildScaleRows(rootRow: number, intervals: number[], span = 24): number[] {
  const rows: number[] = [];
  // Walk downward (increasing row index = lower pitch) through the span
  for (let offset = 0; offset < span; offset++) {
    const rowIdx = rootRow + offset;
    if (rowIdx >= PITCH_ROWS.length) break;
    // Check if offset % 12 is in scale intervals
    if (intervals.includes(offset % 12)) {
      rows.push(rowIdx);
    }
  }
  return rows;
}

/** Generate notes for one instrument track based on genre */
function generateTrackNotes(
  genre: MusicGenrePreset,
  numCols: number,
  role: 'melody' | 'harmony' | 'bass' | 'arp',
  _customUploaded = false,
): PianoNote[] {
  const notes: PianoNote[] = [];
  // Root row — pick from rows 10–25 (mid-range) for melody
  const rootRow = role === 'bass' ? rand(38, 50) : rand(10, 22);
  const scaleRows = buildScaleRows(rootRow, genre.scaleIntervals, role === 'bass' ? 18 : 24);
  if (scaleRows.length === 0) return notes;

  // For arp: fast 16th notes through the scale
  if (role === 'arp') {
    let patRow = 0;
    for (let col = 0; col < numCols; col++) {
      if (chance(0.7)) {
        const row = scaleRows[patRow % scaleRows.length];
        notes.push({
          id: generateMusicId(),
          col,
          row,
          duration: 1,
          velocity: 0.5 + Math.random() * 0.4,
        });
        patRow++;
      }
    }
    return notes;
  }

  // For bass: simple root / fifth pattern
  if (role === 'bass') {
    const step = Math.max(2, Math.floor(numCols / 8));
    for (let col = 0; col < numCols; col += step) {
      if (chance(0.75)) {
        const row = chance(0.7) ? scaleRows[0] : scaleRows[Math.min(4, scaleRows.length - 1)];
        const dur = chance(0.5) ? step : Math.max(1, step - 1);
        notes.push({
          id: generateMusicId(),
          col,
          row,
          duration: dur,
          velocity: 0.6 + Math.random() * 0.3,
        });
      }
    }
    return notes;
  }

  // Melody / Harmony: phrase-based generation
  const phraseLen = 8;
  let col = 0;
  let lastRow = scaleRows[rand(0, Math.min(3, scaleRows.length - 1))];

  while (col < numCols) {
    if (chance(0.85)) {
      // Step size: mostly small steps (±1-2 scale degrees), occasionally larger
      const stepDir = chance(0.5) ? 1 : -1;
      const stepSize = chance(0.6) ? 1 : chance(0.8) ? 2 : rand(3, 4);
      const idx = scaleRows.indexOf(lastRow);
      const newIdx = Math.max(0, Math.min(scaleRows.length - 1, idx + stepDir * stepSize));
      lastRow = scaleRows[newIdx];

      // Note duration: eigths, quarters, dotted quarters, half notes
      const durOptions = [1, 1, 2, 2, 3, 4];
      let dur = pick(durOptions);
      dur = Math.min(dur, numCols - col);

      notes.push({
        id: generateMusicId(),
        col,
        row: lastRow,
        duration: dur,
        velocity: 0.55 + Math.random() * 0.4,
      });

      col += dur;

      // Occasional rest
      if (chance(0.25)) col += rand(1, 2);

      // Phrase cadence: small pause at phrase boundaries
      if (col % phraseLen === 0 && chance(0.4)) col += 1;
    } else {
      col++;
    }
  }

  // Harmony: add parallel notes (3rds or 5ths in scale)
  if (role === 'harmony' && notes.length > 0) {
    const harmNotes: PianoNote[] = [];
    for (const n of notes) {
      if (chance(0.5)) {
        const idx = scaleRows.indexOf(n.row);
        const harmIdx = idx + rand(2, 4);
        if (harmIdx < scaleRows.length) {
          harmNotes.push({
            id: generateMusicId(),
            col: n.col,
            row: scaleRows[harmIdx],
            duration: n.duration,
            velocity: n.velocity * 0.75,
          });
        }
      }
    }
    return [...notes, ...harmNotes];
  }

  return notes;
}

/** Generate a full music project for a given genre */
export function generateRandomMusic(
  genre: MusicGenrePreset,
  numCols = 32,
  existingCustomTracks: InstrumentTrack[] = [],
  _useGenreInstruments = true,
  fixedInstrumentKey?: string,
): Partial<MusicProject> {
  const bpmVariation = rand(-5, 5);
  const bpm = Math.max(
    genre.bpmRange[0],
    Math.min(genre.bpmRange[1], genre.bpm + bpmVariation)
  );

  const tracks: InstrumentTrack[] = [];
  const roles: Array<'melody' | 'harmony' | 'bass' | 'arp'> = ['melody', 'harmony', 'bass'];
  if (chance(0.5)) roles.push('arp');

  // Decide instruments
  const instrKeys = fixedInstrumentKey
    ? [fixedInstrumentKey, ...genre.instrumentKeys.slice(0, roles.length - 1)]
    : genre.instrumentKeys.slice(0, roles.length);

  roles.forEach((role, i) => {
    const instrKey = instrKeys[i] || 'piano';
    const preset = INSTRUMENT_PRESETS[instrKey] || INSTRUMENT_PRESETS['piano'];
    const color = TRACK_COLORS[i % TRACK_COLORS.length];

    const track: InstrumentTrack = {
      id: generateMusicId(),
      name: `${preset.name} (${role})`,
      instrumentKey: instrKey,
      color,
      notes: generateTrackNotes(genre, numCols, role),
      fadeIn: chance(0.3),
      fadeOut: chance(0.2),
      echo: chance(0.25),
      echoDelay: pick([150, 200, 250, 300, 375]),
      echoFeedback: 0.2 + Math.random() * 0.3,
      volume: role === 'bass' ? 0.7 : role === 'harmony' ? 0.6 : 0.85,
      muted: false,
    };
    tracks.push(track);
  });

  // Sprinkle random notes on any custom uploaded tracks too
  existingCustomTracks.forEach((ct, i) => {
    const randomRole = pick<'melody' | 'harmony' | 'bass'>(['melody', 'harmony', 'bass']);
    const color = TRACK_COLORS[(tracks.length + i) % TRACK_COLORS.length];
    tracks.push({
      ...ct,
      color,
      notes: generateTrackNotes(genre, numCols, randomRole, true),
    });
  });

  return { bpm, numCols, tracks };
}

export { MUSIC_GENRES };
