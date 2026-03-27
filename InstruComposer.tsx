import React, {
  useState, useRef, useCallback, useEffect, useMemo, memo,
} from 'react';
import type { InstrumentTrack, PianoNote, MusicProject, MusicGenrePreset } from '../types/music';
import {
  PITCH_ROWS, INSTRUMENT_PRESETS, TRACK_COLORS, MUSIC_GENRES,
} from '../types/music';
import { instrumentEngine } from '../utils/instrumentEngine';
import { generateRandomMusic } from '../utils/randomMusic';
import { saveMusicProject, generateMusicId } from '../utils/musicStorage';

// ─── Layout constants ──────────────────────────────────────────────────────────
const CELL_W   = 38;   // px per column
const CELL_H   = 22;   // px per row
const LABEL_W  = 68;   // left label column
const HEADER_H = 24;   // top column-number bar
const TOTAL_PITCH_ROWS = PITCH_ROWS.length; // 60

// ─── Colors ───────────────────────────────────────────────────────────────────
const BG_BLACK    = '#010a0f';
const BG_BLACK_KEY = '#060606';
const BG_WHITE_KEY = '#020e14';
const LINE_BEAT   = 'rgba(0,229,255,0.18)';
const LINE_CELL   = 'rgba(255,255,255,0.04)';
const LINE_C      = 'rgba(0,229,255,0.25)';
const LINE_H      = 'rgba(0,229,255,0.06)';
const LABEL_C     = '#00e5ff';
const LABEL_DIM   = '#2a3a3a';
const LABEL_BLACK = '#1a2a2a';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeTrack(instrKey: string, idx: number): InstrumentTrack {
  const preset = INSTRUMENT_PRESETS[instrKey] || INSTRUMENT_PRESETS['piano'];
  return {
    id: generateMusicId(),
    name: preset.name,
    instrumentKey: instrKey,
    color: TRACK_COLORS[idx % TRACK_COLORS.length],
    notes: [],
    fadeIn: false, fadeOut: false,
    echo: false, echoDelay: 250, echoFeedback: 0.3,
    volume: 0.85, muted: false,
  };
}

function makeDefaultProject(): MusicProject {
  return {
    id: generateMusicId(),
    name: 'Untitled Instrumental',
    bpm: 100,
    numCols: 32,
    tracks: [makeTrack('piano', 0)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    type: 'music',
  };
}

type NoteMap = Map<string, PianoNote>;
function buildNoteMap(notes: PianoNote[]): NoteMap {
  const m = new Map<string, PianoNote>();
  for (const n of notes) {
    for (let dc = 0; dc < n.duration; dc++) {
      m.set(`${n.col + dc}-${n.row}`, n);
    }
  }
  return m;
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type EditTool = 'draw' | 'erase' | 'select';

interface Props {
  onBack: () => void;
  initialProject?: MusicProject | null;
}

// ─── Scheduler constants ───────────────────────────────────────────────────────
const SCHEDULE_AHEAD = 0.1;
const LOOK_INTERVAL  = 30;

// ─── Canvas Grid Component ────────────────────────────────────────────────────
// Renders the entire piano-roll grid on a <canvas> — zero DOM nodes per cell.
interface CanvasGridProps {
  project: MusicProject;
  activeTrackIdx: number;
  noteMaps: NoteMap[];
  selectedIds: Set<string>;
  tool: EditTool;
  playColRef: React.RefObject<number>;
  isPlayingRef: React.RefObject<boolean>;
  onMouseDown: (col: number, row: number, e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (col: number, row: number) => void;
  onMouseUp: () => void;
}

const CanvasGrid = memo<CanvasGridProps>(({
  project, activeTrackIdx, noteMaps, selectedIds, tool,
  playColRef, isPlayingRef, onMouseDown, onMouseMove, onMouseUp,
}) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const lastColRef = useRef<number>(-2);

  // Full redraw function — called imperatively, never from React renders
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { numCols, tracks } = project;
    const activeTrack = tracks[activeTrackIdx];
    const W = LABEL_W + numCols * CELL_W;
    const H = HEADER_H + TOTAL_PITCH_ROWS * CELL_H;

    // Resize if needed
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W;
      canvas.height = H;
    }

    ctx.clearRect(0, 0, W, H);

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = BG_BLACK;
    ctx.fillRect(0, 0, W, H);

    // ── Column header bg ────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,5,10,0.98)';
    ctx.fillRect(0, 0, W, HEADER_H);

    // ── Draw rows ────────────────────────────────────────────────────────────
    for (let ri = 0; ri < TOTAL_PITCH_ROWS; ri++) {
      const pitch = PITCH_ROWS[ri];
      const y = HEADER_H + ri * CELL_H;
      const isC = pitch.note === 'C';
      const isBlack = pitch.isBlack;

      // Row background
      ctx.fillStyle = isBlack ? BG_BLACK_KEY : BG_WHITE_KEY;
      ctx.fillRect(LABEL_W, y, numCols * CELL_W, CELL_H);

      // Horizontal grid line
      ctx.strokeStyle = isC ? LINE_C : LINE_H;
      ctx.lineWidth   = isC ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(LABEL_W, y + CELL_H);
      ctx.lineTo(W, y + CELL_H);
      ctx.stroke();

      // Label area background
      ctx.fillStyle = isBlack ? 'rgba(0,0,0,0.7)' : 'rgba(0,5,8,0.9)';
      ctx.fillRect(0, y, LABEL_W, CELL_H);

      // Label border
      ctx.strokeStyle = isC ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.04)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + CELL_H);
      ctx.lineTo(LABEL_W, y + CELL_H);
      ctx.stroke();

      // Label text
      if (isC || !isBlack) {
        ctx.fillStyle = isC ? LABEL_C : isBlack ? LABEL_BLACK : LABEL_DIM;
        ctx.font = `${isC ? 'bold ' : ''}9px Orbitron, monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(pitch.label, LABEL_W - 6, y + CELL_H / 2);
      }

      // Mini piano key indicator
      ctx.fillStyle = isBlack ? '#111' : '#1a2a2a';
      ctx.fillRect(LABEL_W - 5, y + 3, 4, CELL_H - 6);
    }

    // ── Vertical grid lines ─────────────────────────────────────────────────
    for (let ci = 0; ci <= numCols; ci++) {
      const x = LABEL_W + ci * CELL_W;
      const isBeat = ci % 4 === 0;
      ctx.strokeStyle = isBeat ? LINE_BEAT : LINE_CELL;
      ctx.lineWidth   = isBeat ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, HEADER_H);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // ── Label column right border ───────────────────────────────────────────
    ctx.strokeStyle = 'rgba(0,229,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LABEL_W, 0);
    ctx.lineTo(LABEL_W, H);
    ctx.stroke();

    // ── Column numbers ──────────────────────────────────────────────────────
    ctx.font = '9px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let ci = 0; ci < numCols; ci++) {
      if (ci % 4 === 0) {
        const x = LABEL_W + ci * CELL_W + CELL_W / 2;
        ctx.fillStyle = 'rgba(0,229,255,0.5)';
        ctx.fillText(String(ci / 4 + 1), x, HEADER_H / 2);
      }
    }

    // ── Notes: other tracks (dim) ───────────────────────────────────────────
    for (let ti = 0; ti < tracks.length; ti++) {
      if (ti === activeTrackIdx) continue;
      const track  = tracks[ti];
      const noteMap = noteMaps[ti];
      if (!noteMap) continue;
      ctx.fillStyle = hexToRgba(track.color, 0.22);
      for (const note of track.notes) {
        if (note.col < 0 || note.col >= numCols) continue;
        const y = HEADER_H + note.row * CELL_H + 2;
        const x = LABEL_W + note.col * CELL_W + 1;
        const w = note.duration * CELL_W - 2;
        const h = CELL_H - 4;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(w, 3), h, 2);
        ctx.fill();
      }
    }

    // ── Notes: active track ─────────────────────────────────────────────────
    if (activeTrack) {
      for (const note of activeTrack.notes) {
        if (note.col < 0 || note.col >= numCols) continue;
        const isSelected = selectedIds.has(note.id);
        const y = HEADER_H + note.row * CELL_H + 1;
        const x = LABEL_W + note.col * CELL_W + 1;
        const w = note.duration * CELL_W - 2;
        const h = CELL_H - 2;

        // Note fill
        ctx.fillStyle = isSelected ? 'rgba(255,255,100,0.92)' : activeTrack.color;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(w, 3), h, 3);
        ctx.fill();

        // Note glow
        ctx.shadowColor  = isSelected ? 'rgba(255,255,0,0.6)' : activeTrack.color;
        ctx.shadowBlur   = 6;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(w, 3), h, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Note label inside (if wide enough)
        if (note.duration >= 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.font = '7px Orbitron, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(PITCH_ROWS[note.row]?.label ?? '', x + 4, y + h / 2);
        }

        // Resize handle (right edge)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + w - 5, y, 5, h);
      }
    }

    // ── Playhead ────────────────────────────────────────────────────────────
    const col = playColRef.current ?? -1;
    if (isPlayingRef.current && col >= 0 && col < numCols) {
      const px = LABEL_W + col * CELL_W;
      ctx.fillStyle = 'rgba(0,229,255,0.08)';
      ctx.fillRect(px, HEADER_H, CELL_W, H - HEADER_H);
      ctx.strokeStyle = 'rgba(0,229,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, HEADER_H);
      ctx.lineTo(px, H);
      ctx.stroke();
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur  = 10;
      ctx.beginPath();
      ctx.moveTo(px, HEADER_H);
      ctx.lineTo(px, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [project, activeTrackIdx, noteMaps, selectedIds, playColRef, isPlayingRef]);

  // Redraw when data changes
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Smooth playhead via RAF — only re-draws when the column actually changes
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const col = playColRef.current ?? -1;
      if (col !== lastColRef.current) {
        lastColRef.current = col;
        redraw();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [redraw, playColRef]);

  // Hit-test: canvas pixel → (col, row)
  const hitTest = (e: React.MouseEvent<HTMLCanvasElement>): { col: number; row: number } | null => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx < LABEL_W || my < HEADER_H) return null;
    const col = Math.floor((mx - LABEL_W) / CELL_W);
    const row = Math.floor((my - HEADER_H) / CELL_H);
    if (col < 0 || col >= project.numCols) return null;
    if (row < 0 || row >= TOTAL_PITCH_ROWS) return null;
    return { col, row };
  };

  const cursor = tool === 'erase' ? 'crosshair' : tool === 'select' ? 'default' : 'cell';

  const totalW = LABEL_W + project.numCols * CELL_W;
  const totalH = HEADER_H + TOTAL_PITCH_ROWS * CELL_H;

  return (
    <canvas
      ref={canvasRef}
      width={totalW}
      height={totalH}
      style={{ display: 'block', cursor, imageRendering: 'pixelated' }}
      onMouseDown={e => {
        const hit = hitTest(e);
        if (hit) onMouseDown(hit.col, hit.row, e);
      }}
      onMouseMove={e => {
        const hit = hitTest(e);
        if (hit) onMouseMove(hit.col, hit.row);
      }}
      onMouseUp={onMouseUp}
      onContextMenu={e => e.preventDefault()}
    />
  );
}, (prev, next) =>
  prev.project === next.project &&
  prev.activeTrackIdx === next.activeTrackIdx &&
  prev.noteMaps === next.noteMaps &&
  prev.selectedIds === next.selectedIds &&
  prev.tool === next.tool
);

// ─── Main Component ───────────────────────────────────────────────────────────
const InstruComposer: React.FC<Props> = ({ onBack, initialProject }) => {
  // ── Project ──────────────────────────────────────────────────────────────
  const [project, setProject] = useState<MusicProject>(initialProject ?? makeDefaultProject());
  const projectRef = useRef(project);
  useEffect(() => { projectRef.current = project; }, [project]);

  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const activeTrack = project.tracks[activeTrackIdx] ?? project.tracks[0];

  // ── View ─────────────────────────────────────────────────────────────────
  const [tool, setTool]         = useState<EditTool>('draw');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [volume, setVolume]     = useState(0.8);
  const volumeRef               = useRef(volume);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // ── Playback (ref-only for column — no React re-render during play) ──────
  const isPlayingRef  = useRef(false);
  const [isPlayingState, setIsPlayingState] = useState(false);
  const playColRef    = useRef(-1);
  const schedulerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextNoteTime  = useRef(0);
  const currentStep   = useRef(0);

  // ── Note maps (O(1) lookup) ───────────────────────────────────────────────
  const noteMaps = useMemo<NoteMap[]>(
    () => project.tracks.map(t => buildNoteMap(t.notes)),
    [project.tracks]
  );
  const activeNoteMap = noteMaps[activeTrackIdx] ?? new Map<string, PianoNote>();

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomGenre,     setRandomGenre]     = useState<MusicGenrePreset>(MUSIC_GENRES[0]);
  const [randomUseGenreInstr, setRandomUseGenreInstr] = useState(true);
  const [randomAutoBpm,   setRandomAutoBpm]   = useState(true);
  const [showInstrModal,  setShowInstrModal]  = useState(false);
  const [showFxPanel,     setShowFxPanel]     = useState(false);
  const [saveMsg,         setSaveMsg]         = useState('');
  const [projectName,     setProjectName]     = useState(project.name);
  const [editingName,     setEditingName]     = useState(false);
  const instrCategories = useMemo(() => {
    const cats: Record<string, typeof INSTRUMENT_PRESETS[string][]> = {};
    Object.values(INSTRUMENT_PRESETS).forEach(p => {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    return cats;
  }, []);

  // ── Drag state (refs — no re-render) ────────────────────────────────────
  const isDragging       = useRef(false);
  const drawStart        = useRef<{ col: number; row: number } | null>(null);
  const activeDrawNoteId = useRef<string | null>(null);
  const dragNoteRef      = useRef<{ noteId: string; startCol: number } | null>(null);
  const eraseMode        = useRef(false);

  // ── Scheduler ──────────────────────────────────────────────────────────────
  const scheduleNote = useCallback((col: number, time: number) => {
    const p   = projectRef.current;
    const vol = volumeRef.current;
    const stepSecs = 60 / p.bpm / 4;
    for (const track of p.tracks) {
      if (track.muted) continue;
      for (const note of track.notes) {
        if (note.col === col) {
          const freq = PITCH_ROWS[note.row]?.frequency ?? 440;
          instrumentEngine.playNote(track, freq, time, note.duration * stepSecs, vol);
        }
      }
    }
  }, []);

  const startPlayback = useCallback(async () => {
    await instrumentEngine.resume();
    const ctx = instrumentEngine.getCtxPublic();
    nextNoteTime.current = ctx.currentTime + 0.05;
    currentStep.current  = 0;
    isPlayingRef.current = true;
    setIsPlayingState(true);

    schedulerRef.current = setInterval(() => {
      const p   = projectRef.current;
      const sps = 60 / p.bpm / 4;
      const ctx2 = instrumentEngine.getCtxPublic();
      while (nextNoteTime.current < ctx2.currentTime + SCHEDULE_AHEAD) {
        const col = currentStep.current % p.numCols;
        playColRef.current = col;
        scheduleNote(col, nextNoteTime.current);
        nextNoteTime.current += sps;
        currentStep.current++;
      }
    }, LOOK_INTERVAL);
  }, [scheduleNote]);

  const stopPlayback = useCallback(() => {
    if (schedulerRef.current) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
    isPlayingRef.current = false;
    playColRef.current   = -1;
    setIsPlayingState(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) stopPlayback();
    else startPlayback();
  }, [startPlayback, stopPlayback]);

  // Restart on BPM change
  const bpmRef = useRef(project.bpm);
  useEffect(() => {
    if (bpmRef.current !== project.bpm) {
      bpmRef.current = project.bpm;
      if (isPlayingRef.current) { stopPlayback(); startPlayback(); }
    }
  }, [project.bpm, startPlayback, stopPlayback]);

  useEffect(() => { instrumentEngine.setMasterVolume(volume); }, [volume]);
  useEffect(() => () => stopPlayback(), [stopPlayback]);

  // Spacebar / Delete shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedIds.size > 0) {
        deleteSelectedNotes();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, selectedIds]);

  // ── Project mutations ────────────────────────────────────────────────────
  const updateTrack = useCallback((idx: number, fn: (t: InstrumentTrack) => InstrumentTrack) => {
    setProject(p => {
      const tracks = [...p.tracks];
      tracks[idx] = fn(tracks[idx]);
      return { ...p, tracks, updatedAt: Date.now() };
    });
  }, []);

  const updateActiveNotes = useCallback((fn: (n: PianoNote[]) => PianoNote[]) => {
    setProject(p => {
      const tracks = [...p.tracks];
      const idx = activeTrackIdx < tracks.length ? activeTrackIdx : 0;
      tracks[idx] = { ...tracks[idx], notes: fn(tracks[idx].notes) };
      return { ...p, tracks, updatedAt: Date.now() };
    });
  }, [activeTrackIdx]);

  // ── Note operations ──────────────────────────────────────────────────────
  const addNote = useCallback((col: number, row: number): string => {
    const id = generateMusicId();
    updateActiveNotes(notes => {
      const filtered = notes.filter(n => !(n.col === col && n.row === row));
      return [...filtered, { id, col, row, duration: 1, velocity: 0.8 }];
    });
    return id;
  }, [updateActiveNotes]);

  const removeNoteAt = useCallback((col: number, row: number) => {
    updateActiveNotes(notes => {
      const hit = notes.find(n => {
        for (let dc = 0; dc < n.duration; dc++) {
          if (n.col + dc === col && n.row === row) return true;
        }
        return false;
      });
      if (!hit) return notes;
      return notes.filter(n => n.id !== hit.id);
    });
  }, [updateActiveNotes]);

  const extendNote = useCallback((noteId: string, newDur: number) => {
    updateActiveNotes(notes =>
      notes.map(n => n.id === noteId ? { ...n, duration: Math.max(1, newDur) } : n)
    );
  }, [updateActiveNotes]);

  const deleteSelectedNotes = useCallback(() => {
    const ids = selectedIds;
    updateActiveNotes(notes => notes.filter(n => !ids.has(n.id)));
    setSelectedIds(new Set());
  }, [selectedIds, updateActiveNotes]);

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((col: number, row: number, e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDragging.current = true;
    eraseMode.current  = false;

    if (e.button === 2 || tool === 'erase') {
      eraseMode.current = true;
      removeNoteAt(col, row);
      return;
    }

    if (tool === 'select') {
      const existing = activeNoteMap.get(`${col}-${row}`);
      if (existing) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(existing.id)) next.delete(existing.id);
          else next.add(existing.id);
          return next;
        });
      } else {
        setSelectedIds(new Set());
      }
      return;
    }

    // DRAW
    const existing = activeNoteMap.get(`${col}-${row}`);
    if (existing) {
      if (existing.col === col) {
        // Start of a note — drag to extend
        dragNoteRef.current = { noteId: existing.id, startCol: existing.col };
      }
      // else: clicked inside extended span — do nothing
    } else {
      const id = addNote(col, row);
      activeDrawNoteId.current = id;
      drawStart.current = { col, row };
      // Preview only when looper is OFF
      if (!isPlayingRef.current && activeTrack) {
        instrumentEngine.previewNote(activeTrack, PITCH_ROWS[row]?.frequency ?? 440);
      }
    }
  }, [tool, activeNoteMap, removeNoteAt, addNote, activeTrack]);

  const handleMouseMove = useCallback((col: number, row: number) => {
    if (!isDragging.current) return;

    if (eraseMode.current) {
      removeNoteAt(col, row);
      return;
    }

    if (tool === 'draw') {
      if (activeDrawNoteId.current && drawStart.current) {
        const dur = Math.max(1, col - drawStart.current.col + 1);
        extendNote(activeDrawNoteId.current, dur);
      } else if (dragNoteRef.current) {
        const dur = Math.max(1, col - dragNoteRef.current.startCol + 1);
        extendNote(dragNoteRef.current.noteId, dur);
      }
    }
  }, [tool, removeNoteAt, extendNote]);

  const handleMouseUp = useCallback(() => {
    isDragging.current       = false;
    dragNoteRef.current      = null;
    activeDrawNoteId.current = null;
    drawStart.current        = null;
    eraseMode.current        = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // ── Track management ──────────────────────────────────────────────────────
  const addTrack = useCallback((instrKey = 'piano') => {
    setProject(p => {
      const track = makeTrack(instrKey, p.tracks.length);
      return { ...p, tracks: [...p.tracks, track], updatedAt: Date.now() };
    });
  }, []);

  const removeTrack = useCallback((idx: number) => {
    setProject(p => {
      if (p.tracks.length <= 1) return p;
      const tracks = p.tracks.filter((_, i) => i !== idx);
      return { ...p, tracks, updatedAt: Date.now() };
    });
    setActiveTrackIdx(i => Math.max(0, i >= idx ? i - 1 : i));
  }, []);

  const handleCustomUpload = useCallback(async (trackIdx: number, file: File) => {
    const name = await instrumentEngine.loadCustomBuffer(projectRef.current.tracks[trackIdx].id, file);
    updateTrack(trackIdx, t => ({ ...t, customFileName: name }));
  }, [updateTrack]);

  // ── Random generation ────────────────────────────────────────────────────
  const handleGenerateRandom = useCallback(() => {
    const customTracks = projectRef.current.tracks.filter(t => t.customFileName);
    const result = generateRandomMusic(
      randomGenre, projectRef.current.numCols,
      randomUseGenreInstr ? [] : customTracks,
      randomUseGenreInstr,
    );
    setProject(p => ({
      ...p,
      bpm: randomAutoBpm ? (result.bpm ?? p.bpm) : p.bpm,
      tracks: result.tracks ?? p.tracks,
      updatedAt: Date.now(),
    }));
    setActiveTrackIdx(0);
    setShowRandomModal(false);
  }, [randomGenre, randomUseGenreInstr, randomAutoBpm]);

  // ── Save / Draft / Export ──────────────────────────────────────────────────
  const doSave = useCallback((asDraft = false) => {
    const p: MusicProject = { ...projectRef.current, name: projectName, updatedAt: Date.now() };
    saveMusicProject(p);
    setProject(p);
    setSaveMsg(asDraft ? '📝 Draft saved!' : '💾 Project saved!');
    setTimeout(() => setSaveMsg(''), 2500);
  }, [projectName]);

  const handleExport = useCallback(async () => {
    const p = projectRef.current;
    const stepSecs = 60 / p.bpm / 4;
    const totalSecs = p.numCols * stepSecs + 2;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(44100 * totalSecs), 44100);

    for (const track of p.tracks) {
      if (track.muted) continue;
      for (const note of track.notes) {
        const freq  = PITCH_ROWS[note.row]?.frequency ?? 440;
        const start = note.col * stepSecs;
        const dur   = note.duration * stepSecs;
        const preset = INSTRUMENT_PRESETS[track.instrumentKey] || INSTRUMENT_PRESETS['piano'];
        const osc = offlineCtx.createOscillator();
        osc.type = preset.oscillatorType as OscillatorType;
        osc.frequency.value = freq;
        const env = offlineCtx.createGain();
        const vol = track.volume * note.velocity * volume;
        const attackEnd = start + preset.attackTime;
        const decayEnd  = attackEnd + preset.decayTime;
        const relStart  = start + Math.max(dur, preset.attackTime + preset.decayTime);
        const relEnd    = relStart + preset.releaseTime;
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(vol, attackEnd);
        env.gain.linearRampToValueAtTime(preset.sustainLevel * vol, decayEnd);
        env.gain.setValueAtTime(preset.sustainLevel * vol, relStart);
        env.gain.linearRampToValueAtTime(0.001, relEnd);
        osc.connect(env);
        env.connect(offlineCtx.destination);
        osc.start(start);
        osc.stop(relEnd + 0.05);
      }
    }

    try {
      const buf = await offlineCtx.startRendering();
      const wav = encodeWav(buf);
      const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${projectName.replace(/\s+/g, '_')}.wav`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Export failed', err); }
  }, [projectName, volume]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col select-none"
      style={{ background: 'linear-gradient(-45deg,#020d14,#021a20,#010d0f,#001a1f)', backgroundSize: '400% 400%', animation: 'gradientShift 12s ease infinite' }}
      onMouseUp={handleMouseUp}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(0,229,255,0.2)', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)' }}>
        <button onClick={onBack}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors font-rajdhani text-sm px-2 py-1 rounded hover:bg-white/5">
          ← HOME
        </button>
        <div className="w-px h-5" style={{ background: 'rgba(0,229,255,0.25)' }} />

        {editingName ? (
          <input autoFocus
            className="font-orbitron text-sm text-white bg-transparent border-b outline-none px-1"
            style={{ borderColor: '#00e5ff' }}
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
          />
        ) : (
          <button onClick={() => setEditingName(true)}
            className="font-orbitron text-sm text-white hover:opacity-70 transition-opacity">
            {projectName} <span className="text-xs ml-1" style={{ color: '#00e5ff' }}>✎</span>
          </button>
        )}

        <div className="px-2 py-0.5 rounded text-xs font-orbitron"
          style={{ background: 'rgba(0,229,255,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)' }}>
          INSTRUCOMPOSER
        </div>

        {isPlayingState && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00e5ff' }} />
            <span className="text-xs font-rajdhani" style={{ color: '#00e5ff' }}>PLAYING</span>
          </div>
        )}

        <div className="flex-1" />

        {saveMsg && (
          <span className="text-xs font-rajdhani px-3 py-1 rounded"
            style={{ background: 'rgba(0,229,255,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)' }}>
            {saveMsg}
          </span>
        )}

        <button onClick={() => doSave(true)}
          className="px-3 py-1.5 text-xs font-orbitron rounded-lg transition-all hover:opacity-90"
          style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}>
          📝 DRAFT
        </button>
        <button onClick={() => doSave(false)}
          className="px-3 py-1.5 text-xs font-orbitron rounded-lg transition-all hover:opacity-90"
          style={{ background: 'rgba(0,229,255,0.2)', border: '1px solid rgba(0,229,255,0.5)', color: '#00e5ff' }}>
          💾 SAVE
        </button>
        <button onClick={handleExport}
          className="px-3 py-1.5 text-xs font-orbitron rounded-lg transition-all hover:opacity-90"
          style={{ background: 'rgba(0,180,200,0.15)', border: '1px solid rgba(0,180,200,0.4)', color: '#80deea' }}>
          ⬇ WAV
        </button>
      </header>

      {/* ── TOOLBAR ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap border-b flex-shrink-0"
        style={{ borderColor: 'rgba(0,229,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>

        <button onClick={togglePlay}
          className="px-4 py-1.5 rounded-lg font-orbitron text-xs font-bold transition-all"
          style={{
            background: isPlayingState ? 'rgba(220,20,60,0.2)' : 'rgba(0,229,255,0.2)',
            border: `1px solid ${isPlayingState ? 'rgba(220,20,60,0.6)' : 'rgba(0,229,255,0.6)'}`,
            color: isPlayingState ? '#ff4466' : '#00e5ff',
            boxShadow: isPlayingState ? '0 0 15px rgba(220,20,60,0.3)' : '0 0 12px rgba(0,229,255,0.25)',
          }}>
          {isPlayingState ? '⏹ STOP' : '▶ PLAY'}
        </button>

        <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(0,229,255,0.15)' }} />

        {/* BPM */}
        <div className="flex items-center gap-1">
          <button onClick={() => setProject(p => ({ ...p, bpm: Math.max(40, p.bpm - 1) }))}
            className="w-6 h-6 rounded text-xs flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: '#00e5ff' }}>−</button>
          <input type="number" min={40} max={280} value={project.bpm}
            onChange={e => setProject(p => ({ ...p, bpm: Math.max(40, Math.min(280, +e.target.value)) }))}
            className="w-14 text-center text-sm font-orbitron bg-transparent outline-none border rounded py-0.5"
            style={{ borderColor: 'rgba(0,229,255,0.3)', color: '#00e5ff' }} />
          <button onClick={() => setProject(p => ({ ...p, bpm: Math.min(280, p.bpm + 1) }))}
            className="w-6 h-6 rounded text-xs flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: '#00e5ff' }}>+</button>
          <span className="text-xs font-rajdhani text-gray-500">BPM</span>
        </div>

        {/* BPM presets */}
        <div className="flex gap-1 flex-wrap">
          {[{l:'Ambient',v:60},{l:'Lo-Fi',v:75},{l:'Hip-Hop',v:90},{l:'Pop',v:120},{l:'Rock',v:130},{l:'House',v:128},{l:'D&B',v:174}].map(({l,v}) => (
            <button key={l} onClick={() => setProject(p => ({ ...p, bpm: v }))}
              className="px-2 py-0.5 rounded text-xs font-rajdhani transition-all hover:opacity-80"
              style={{
                background: project.bpm === v ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.05)',
                color: project.bpm === v ? '#00e5ff' : '#666',
                border: '1px solid rgba(0,229,255,0.15)',
              }}>{l}</button>
          ))}
        </div>

        <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(0,229,255,0.15)' }} />

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">🔊</span>
          <input type="range" min={0} max={1} step={0.01} value={volume}
            onChange={e => setVolume(+e.target.value)} className="w-20 accent-cyan-400" />
          <span className="text-xs font-orbitron" style={{ color: '#00e5ff' }}>{Math.round(volume * 100)}%</span>
        </div>

        <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(0,229,255,0.15)' }} />

        {/* Steps */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 font-rajdhani">STEPS</span>
          <button onClick={() => setProject(p => ({ ...p, numCols: Math.max(8, p.numCols - 8) }))}
            className="w-6 h-6 rounded text-xs flex items-center justify-center hover:bg-white/10" style={{ color: '#00e5ff' }}>−</button>
          <span className="text-xs font-orbitron w-8 text-center" style={{ color: '#00e5ff' }}>{project.numCols}</span>
          <button onClick={() => setProject(p => ({ ...p, numCols: Math.min(128, p.numCols + 8) }))}
            className="w-6 h-6 rounded text-xs flex items-center justify-center hover:bg-white/10" style={{ color: '#00e5ff' }}>+</button>
        </div>

        <div className="flex-1" />

        {/* Edit tools */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(0,229,255,0.25)' }}>
          {([['draw','✏ DRAW'],['erase','✕ ERASE'],['select','▣ SELECT']] as [EditTool,string][]).map(([t,l]) => (
            <button key={t} onClick={() => setTool(t)}
              className="px-2.5 py-1.5 text-xs font-orbitron transition-all"
              style={{ background: tool === t ? 'rgba(0,229,255,0.2)' : 'transparent', color: tool === t ? '#00e5ff' : '#555' }}>
              {l}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <button onClick={deleteSelectedNotes}
            className="px-3 py-1.5 text-xs font-orbitron rounded-lg"
            style={{ background: 'rgba(220,20,60,0.15)', border: '1px solid rgba(220,20,60,0.4)', color: '#ff4466' }}>
            🗑 DEL ({selectedIds.size})
          </button>
        )}

        <button onClick={() => setShowRandomModal(true)}
          className="px-3 py-1.5 text-xs font-orbitron rounded-lg transition-all"
          style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.35)', color: '#00e5ff', boxShadow: '0 0 10px rgba(0,229,255,0.15)' }}>
          🎲 RANDOM
        </button>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col border-r flex-shrink-0"
          style={{ width: 192, background: 'rgba(0,0,0,0.45)', borderColor: 'rgba(0,229,255,0.15)' }}>

          {/* Sidebar header */}
          <div className="px-3 py-2 flex items-center justify-between border-b flex-shrink-0"
            style={{ borderColor: 'rgba(0,229,255,0.1)' }}>
            <span className="font-orbitron text-xs" style={{ color: '#00e5ff' }}>TRACKS</span>
            <button onClick={() => setShowInstrModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-orbitron transition-all hover:opacity-80"
              style={{ background: 'rgba(0,229,255,0.15)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)' }}
              title="Add Track">
              + ADD
            </button>
          </div>

          {/* Track list */}
          <div className="flex-1 overflow-y-auto">
            {project.tracks.map((track, idx) => (
              <TrackItem
                key={track.id}
                track={track}
                isActive={activeTrackIdx === idx}
                onSelect={() => setActiveTrackIdx(idx)}
                onMute={() => updateTrack(idx, t => ({ ...t, muted: !t.muted }))}
                onFx={() => { setActiveTrackIdx(idx); setShowFxPanel(true); }}
                onRemove={project.tracks.length > 1 ? () => removeTrack(idx) : undefined}
                onUpload={file => handleCustomUpload(idx, file)}
                onVolumeChange={v => updateTrack(idx, t => ({ ...t, volume: v }))}
                onInstrChange={() => { setActiveTrackIdx(idx); setShowFxPanel(true); }}
              />
            ))}
          </div>

          {/* Active track info footer */}
          {activeTrack && (
            <div className="p-2 border-t flex-shrink-0"
              style={{ borderColor: 'rgba(0,229,255,0.1)', background: 'rgba(0,229,255,0.03)' }}>
              <p className="text-xs font-rajdhani" style={{ color: activeTrack.color }}>
                {INSTRUMENT_PRESETS[activeTrack.instrumentKey]?.emoji} {activeTrack.name}
              </p>
              <p className="text-xs text-gray-600 font-rajdhani">{activeTrack.notes.length} notes</p>
            </div>
          )}
        </div>

        {/* ── CANVAS GRID AREA ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto" style={{ background: '#010a0f' }}>
          <CanvasGrid
            project={project}
            activeTrackIdx={activeTrackIdx}
            noteMaps={noteMaps}
            selectedIds={selectedIds}
            tool={tool}
            playColRef={playColRef}
            isPlayingRef={isPlayingRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
      </div>

      {/* ── STATUS BAR ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-1.5 flex items-center gap-4 text-xs border-t flex-shrink-0"
        style={{ borderColor: 'rgba(0,229,255,0.1)', background: 'rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlayingState ? 'animate-pulse' : ''}`}
            style={{ background: isPlayingState ? '#00e5ff' : '#333' }} />
          <span className="font-rajdhani" style={{ color: isPlayingState ? '#00e5ff' : '#555' }}>
            {isPlayingState
              ? `▶ PLAYING · ${project.bpm} BPM · Preview sounds DISABLED`
              : '⏹ STOPPED · Draw notes · Right-click or Erase tool to delete · Preview sounds ACTIVE'}
          </span>
        </div>
        <div className="flex-1" />
        <span className="font-rajdhani text-gray-600">
          {activeTrack?.notes.length ?? 0} notes · {project.tracks.length} tracks · {project.numCols} steps
        </span>
        <span className="font-rajdhani text-gray-700">Space=Play · Del=Erase selected</span>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────────── */}
      {showRandomModal && (
        <RandomModal
          genres={MUSIC_GENRES}
          selectedGenre={randomGenre}
          onSelectGenre={setRandomGenre}
          useGenreInstruments={randomUseGenreInstr}
          onToggleGenreInstr={setRandomUseGenreInstr}
          autoBpm={randomAutoBpm}
          onToggleAutoBpm={setRandomAutoBpm}
          onGenerate={handleGenerateRandom}
          onClose={() => setShowRandomModal(false)}
          hasCustomTracks={project.tracks.some(t => t.customFileName)}
        />
      )}

      {showInstrModal && (
        <InstrumentModal
          categories={instrCategories}
          onSelect={key => { addTrack(key); setShowInstrModal(false); }}
          onClose={() => setShowInstrModal(false)}
        />
      )}

      {showFxPanel && activeTrack && (
        <FxPanel
          track={activeTrack}
          onChange={t => updateTrack(activeTrackIdx, () => t)}
          onClose={() => setShowFxPanel(false)}
          instrCategories={instrCategories}
        />
      )}
    </div>
  );
};

// ─── Track Item (memoized) ─────────────────────────────────────────────────────
interface TrackItemProps {
  track: InstrumentTrack;
  isActive: boolean;
  onSelect: () => void;
  onMute: () => void;
  onFx: () => void;
  onRemove?: () => void;
  onUpload: (f: File) => void;
  onVolumeChange: (v: number) => void;
  onInstrChange: () => void;
}

const TrackItem = memo<TrackItemProps>(({
  track, isActive, onSelect, onMute, onFx, onRemove, onUpload, onVolumeChange,
}) => (
  <div
    onClick={onSelect}
    className="group relative flex flex-col px-3 py-2 cursor-pointer border-b transition-all"
    style={{
      borderColor: 'rgba(0,229,255,0.07)',
      background: isActive ? 'rgba(0,229,255,0.09)' : 'transparent',
      borderLeft: `3px solid ${isActive ? track.color : 'transparent'}`,
    }}
  >
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: track.color }} />
      <span className="font-rajdhani text-xs text-white truncate flex-1" style={{ maxWidth: 100 }}>
        {track.name}
      </span>
      <button onClick={e => { e.stopPropagation(); onMute(); }}
        className="w-5 h-5 rounded text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        style={{ color: track.muted ? '#ff4466' : '#888' }}
        title={track.muted ? 'Unmute' : 'Mute'}>
        {track.muted ? '🔇' : '🔊'}
      </button>
    </div>

    <span className="text-gray-600 text-xs truncate mt-0.5">
      {INSTRUMENT_PRESETS[track.instrumentKey]?.emoji} {INSTRUMENT_PRESETS[track.instrumentKey]?.name}
      {track.customFileName && <span style={{ color: '#00b4c8' }}> ✦</span>}
    </span>

    <input type="range" min={0} max={1} step={0.01} value={track.volume}
      onChange={e => { e.stopPropagation(); onVolumeChange(+e.target.value); }}
      onClick={e => e.stopPropagation()}
      className="w-full mt-1 accent-cyan-400"
      style={{ height: 4 }} />

    {/* Hover buttons */}
    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
      <button onClick={e => { e.stopPropagation(); onFx(); }}
        className="w-5 h-5 rounded text-xs flex items-center justify-center hover:bg-white/10"
        title="FX & Instrument" style={{ color: '#00e5ff' }}>✦</button>
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          className="w-5 h-5 rounded text-xs flex items-center justify-center hover:bg-red-900/30"
          title="Remove" style={{ color: '#ff4466' }}>✕</button>
      )}
    </div>

    {/* Upload */}
    <label onClick={e => e.stopPropagation()}
      className="mt-1 flex items-center gap-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-all">
      <span className="text-xs" style={{ color: '#00b4c8' }}>🎵</span>
      <span className="text-xs text-gray-600">
        {track.customFileName ? track.customFileName.slice(0, 14) + '…' : 'Upload sound'}
      </span>
      <input type="file" accept="audio/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
    </label>
  </div>
));

// ─── Random Modal ──────────────────────────────────────────────────────────────
interface RandomModalProps {
  genres: MusicGenrePreset[];
  selectedGenre: MusicGenrePreset;
  onSelectGenre: (g: MusicGenrePreset) => void;
  useGenreInstruments: boolean;
  onToggleGenreInstr: (v: boolean) => void;
  autoBpm: boolean;
  onToggleAutoBpm: (v: boolean) => void;
  onGenerate: () => void;
  onClose: () => void;
  hasCustomTracks: boolean;
}

const RandomModal: React.FC<RandomModalProps> = ({
  genres, selectedGenre, onSelectGenre,
  useGenreInstruments, onToggleGenreInstr,
  autoBpm, onToggleAutoBpm,
  onGenerate, onClose, hasCustomTracks,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={onClose}>
    <div className="rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      style={{ background: 'rgba(0,10,18,0.97)', border: '1px solid rgba(0,229,255,0.3)', boxShadow: '0 0 60px rgba(0,229,255,0.2)' }}
      onClick={e => e.stopPropagation()}>

      <div className="flex items-center justify-between mb-5">
        <h2 className="font-orbitron text-lg font-bold" style={{ color: '#00e5ff' }}>🎲 RANDOM INSTRUMENTAL</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
      </div>

      <p className="text-xs font-rajdhani text-gray-500 mb-3 tracking-widest">SELECT GENRE</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-5">
        {genres.map(g => (
          <button key={g.key} onClick={() => onSelectGenre(g)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
            style={{
              background: selectedGenre.key === g.key ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedGenre.key === g.key ? 'rgba(0,229,255,0.7)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: selectedGenre.key === g.key ? '0 0 15px rgba(0,229,255,0.3)' : 'none',
            }}>
            <span className="text-xl">{g.emoji}</span>
            <span className="font-orbitron text-xs" style={{ color: selectedGenre.key === g.key ? '#00e5ff' : '#666' }}>{g.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{selectedGenre.emoji}</span>
          <div>
            <h3 className="font-orbitron text-sm font-bold" style={{ color: '#00e5ff' }}>{selectedGenre.label}</h3>
            <p className="text-gray-400 text-xs font-rajdhani">{selectedGenre.description}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-orbitron text-sm" style={{ color: '#00e5ff' }}>{selectedGenre.bpm} BPM</p>
            <p className="text-gray-500 text-xs font-rajdhani">{selectedGenre.bpmRange[0]}–{selectedGenre.bpmRange[1]}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedGenre.instrumentKeys.map(k => (
            <span key={k} className="px-2 py-0.5 rounded text-xs font-rajdhani"
              style={{ background: 'rgba(0,229,255,0.1)', color: '#80deea', border: '1px solid rgba(0,229,255,0.2)' }}>
              {INSTRUMENT_PRESETS[k]?.emoji} {INSTRUMENT_PRESETS[k]?.name ?? k}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <Toggle label="Choose instruments as per genre" sub="Auto-selects best instruments for this genre"
          value={useGenreInstruments} onChange={onToggleGenreInstr} />
        {hasCustomTracks && !useGenreInstruments && (
          <div className="pl-4 p-3 rounded-lg" style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}>
            <p className="text-xs font-rajdhani" style={{ color: '#00e5ff' }}>✓ Custom uploaded sounds also get generated patterns</p>
          </div>
        )}
        <Toggle label="Auto-set BPM to genre tempo" sub={`Sets BPM to ${selectedGenre.bpm} ±5 (${selectedGenre.label})`}
          value={autoBpm} onChange={onToggleAutoBpm} />
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-orbitron text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#666' }}>
          CANCEL
        </button>
        <button onClick={onGenerate} className="flex-1 py-2.5 rounded-xl font-orbitron text-sm font-bold"
          style={{ background: 'rgba(0,229,255,0.2)', border: '1px solid rgba(0,229,255,0.6)', color: '#00e5ff', boxShadow: '0 0 20px rgba(0,229,255,0.3)' }}>
          🎲 GENERATE
        </button>
      </div>
    </div>
  </div>
);

// ─── Toggle ────────────────────────────────────────────────────────────────────
const Toggle: React.FC<{ label: string; sub: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, sub, value, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div onClick={() => onChange(!value)}
      className="w-10 h-5 rounded-full relative transition-all flex-shrink-0"
      style={{ background: value ? '#00e5ff' : '#333' }}>
      <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
    </div>
    <div>
      <p className="text-sm font-rajdhani text-white">{label}</p>
      <p className="text-xs text-gray-500 font-rajdhani">{sub}</p>
    </div>
  </label>
);

// ─── Instrument Modal ──────────────────────────────────────────────────────────
const InstrumentModal: React.FC<{
  categories: Record<string, typeof INSTRUMENT_PRESETS[string][]>;
  onSelect: (k: string) => void;
  onClose: () => void;
}> = ({ categories, onSelect, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={onClose}>
    <div className="rounded-2xl p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto"
      style={{ background: 'rgba(0,10,18,0.97)', border: '1px solid rgba(0,229,255,0.3)', boxShadow: '0 0 60px rgba(0,229,255,0.15)' }}
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-orbitron text-base font-bold" style={{ color: '#00e5ff' }}>➕ ADD INSTRUMENT TRACK</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
      </div>

      {/* Empty track option */}
      <button onClick={() => onSelect('piano')}
        className="w-full flex items-center gap-3 p-3 rounded-xl mb-4 transition-all hover:scale-[1.01]"
        style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', color: '#80deea' }}>
        <span className="text-2xl">🎵</span>
        <div className="text-left">
          <p className="font-orbitron text-sm" style={{ color: '#00e5ff' }}>Empty Track (Piano)</p>
          <p className="font-rajdhani text-xs text-gray-500">Start with a blank piano track</p>
        </div>
      </button>

      {Object.entries(categories).map(([cat, presets]) => (
        <div key={cat} className="mb-4">
          <p className="text-xs font-rajdhani text-gray-500 mb-2 tracking-widest">{cat.toUpperCase()}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map(p => (
              <button key={p.key} onClick={() => onSelect(p.key)}
                className="flex items-center gap-2 p-2.5 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', color: '#80deea' }}>
                <span className="text-xl">{p.emoji}</span>
                <span className="font-rajdhani text-sm text-white">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── FX Panel ─────────────────────────────────────────────────────────────────
const FxPanel: React.FC<{
  track: InstrumentTrack;
  onChange: (t: InstrumentTrack) => void;
  onClose: () => void;
  instrCategories: Record<string, typeof INSTRUMENT_PRESETS[string][]>;
}> = ({ track, onChange, onClose, instrCategories }) => {
  const up = (patch: Partial<InstrumentTrack>) => onChange({ ...track, ...patch });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center modal-backdrop" onClick={onClose}>
      <div className="rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        style={{ background: 'rgba(0,10,18,0.97)', border: '1px solid rgba(0,229,255,0.3)', boxShadow: '0 0 60px rgba(0,229,255,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-orbitron text-base font-bold" style={{ color: '#00e5ff' }}>
            ✦ FX — <span style={{ color: track.color }}>{track.name}</span>
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-4">
          {/* Volume */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-rajdhani text-gray-400">VOLUME</span>
              <span className="text-xs font-orbitron" style={{ color: '#00e5ff' }}>{Math.round(track.volume * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={track.volume}
              onChange={e => up({ volume: +e.target.value })} className="w-full accent-cyan-400" />
          </div>

          <FxToggle label="Fade In" sub="Notes fade in from silence" value={track.fadeIn} onChange={v => up({ fadeIn: v })} />
          <FxToggle label="Fade Out" sub="Notes fade out to silence" value={track.fadeOut} onChange={v => up({ fadeOut: v })} />
          <FxToggle label="Echo / Delay" sub="Adds repeating echo effect" value={track.echo} onChange={v => up({ echo: v })} />

          {track.echo && (
            <div className="pl-4 space-y-3" style={{ borderLeft: '2px solid rgba(0,229,255,0.2)' }}>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-rajdhani text-gray-400">DELAY TIME</span>
                  <span className="text-xs font-orbitron" style={{ color: '#00e5ff' }}>{track.echoDelay}ms</span>
                </div>
                <input type="range" min={50} max={800} step={25} value={track.echoDelay}
                  onChange={e => up({ echoDelay: +e.target.value })} className="w-full accent-cyan-400" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-rajdhani text-gray-400">FEEDBACK</span>
                  <span className="text-xs font-orbitron" style={{ color: '#00e5ff' }}>{Math.round(track.echoFeedback * 100)}%</span>
                </div>
                <input type="range" min={0} max={0.8} step={0.01} value={track.echoFeedback}
                  onChange={e => up({ echoFeedback: +e.target.value })} className="w-full accent-cyan-400" />
              </div>
            </div>
          )}

          {/* Change Instrument */}
          <div>
            <p className="text-xs font-rajdhani text-gray-400 mb-2 tracking-widest">CHANGE INSTRUMENT</p>
            {Object.entries(instrCategories).map(([cat, presets]) => (
              <div key={cat} className="mb-3">
                <p className="text-xs font-rajdhani text-gray-600 mb-1">{cat}</p>
                <div className="grid grid-cols-3 gap-1">
                  {presets.map(p => (
                    <button key={p.key} onClick={() => up({ instrumentKey: p.key, name: p.name })}
                      className="flex items-center gap-1 p-1.5 rounded-lg text-xs transition-all"
                      style={{
                        background: track.instrumentKey === p.key ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${track.instrumentKey === p.key ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.06)'}`,
                        color: track.instrumentKey === p.key ? '#00e5ff' : '#666',
                      }}>
                      <span>{p.emoji}</span>
                      <span className="font-rajdhani truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-xl font-orbitron text-sm"
          style={{ background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff' }}>
          DONE ✓
        </button>
      </div>
    </div>
  );
};

const FxToggle: React.FC<{ label: string; sub: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, sub, value, onChange }) => (
  <label className="flex items-center justify-between cursor-pointer">
    <div>
      <p className="text-sm font-rajdhani text-white">{label}</p>
      <p className="text-xs text-gray-500 font-rajdhani">{sub}</p>
    </div>
    <div onClick={() => onChange(!value)}
      className="w-10 h-5 rounded-full relative transition-all flex-shrink-0 ml-4"
      style={{ background: value ? '#00e5ff' : '#333' }}>
      <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
    </div>
  </label>
);

// ─── WAV encoder ───────────────────────────────────────────────────────────────
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh = buffer.numberOfChannels;
  const sr    = buffer.sampleRate;
  const samples = buffer.length;
  const dataSize = samples * numCh * 2;
  const ab   = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const ws   = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true); view.setUint16(34, 16, true);
  ws(36, 'data'); view.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return ab;
}

export default InstruComposer;
