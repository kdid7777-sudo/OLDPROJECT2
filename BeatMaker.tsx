import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { saveProject, generateId } from '../utils/storage';
import type { BeatProject, BeatRow } from '../types/beat';
import { DEFAULT_INSTRUMENTS, BPM_PRESETS } from '../types/beat';
import { generateRandomBeat, GENRE_CONFIGS, type Genre } from '../utils/randomBeat';

interface BeatMakerProps {
  onBack: () => void;
  initialProject?: BeatProject | null;
}

// Custom audio buffers stored in memory (not serializable to localStorage)
const customAudioBuffers: Map<string, AudioBuffer> = new Map();

function createDefaultRows(numCols: number): BeatRow[] {
  return DEFAULT_INSTRUMENTS.map((name) => ({
    id: generateId(),
    name,
    cells: Array(numCols).fill(false),
  }));
}

function createDefaultProject(existingProject?: BeatProject | null): BeatProject {
  if (existingProject) return existingProject;
  const numCols = 16;
  return {
    id: generateId(),
    name: 'Untitled Beat',
    bpm: 120,
    numCols,
    rows: createDefaultRows(numCols),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const BeatMaker: React.FC<BeatMakerProps> = ({ onBack, initialProject }) => {
  const [project, setProject] = useState<BeatProject>(() => createDefaultProject(initialProject));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCol, setCurrentCol] = useState(-1);
  const [bpmInput, setBpmInput] = useState(String(initialProject?.bpm ?? 120));
  const [showBpmPresets, setShowBpmPresets] = useState(false);
  const [showSaveNotif, setShowSaveNotif] = useState<string | null>(null);
  const [showDownloading, setShowDownloading] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowName, setEditingRowName] = useState('');
  const [projectNameEdit, setProjectNameEdit] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);
  const [showAddInstrument, setShowAddInstrument] = useState(false);
  const [newInstrumentName, setNewInstrumentName] = useState('');
  const [selectedPresetInstrument, setSelectedPresetInstrument] = useState(DEFAULT_INSTRUMENTS[0]);
  const [volume, setVolume] = useState(0.8);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);

  // ── Random Beat Modal ──
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomGenre, setRandomGenre] = useState<Genre>('Hip-Hop');
  const [randomApplyBpm, setRandomApplyBpm] = useState(true);
  const [randomPreview, setRandomPreview] = useState<{ genre: Genre; bpm: number } | null>(null);
  const [randomConfirmOverwrite, setRandomConfirmOverwrite] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentColRef = useRef(-1);
  const projectRef = useRef(project);
  const volumeRef = useRef(volume);
  const isPlayingRef = useRef(isPlaying);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // BPM to interval
  const getBeatInterval = useCallback((bpm: number) => {
    return (60 / bpm / 4) * 1000;
  }, []);

  // Play / Stop
  const togglePlay = useCallback(async () => {
    await audioEngine.resume();

    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
      setCurrentCol(-1);
      currentColRef.current = -1;
    } else {
      setIsPlaying(true);
      currentColRef.current = -1;

      const tick = () => {
        const proj = projectRef.current;
        const nextCol = (currentColRef.current + 1) % proj.numCols;
        currentColRef.current = nextCol;
        setCurrentCol(nextCol);

        proj.rows.forEach((row) => {
          if (row.cells[nextCol]) {
            const customBuffer = customAudioBuffers.get(row.id);
            audioEngine.playSound(row.name, customBuffer, volumeRef.current);
          }
        });
      };

      tick();
      intervalRef.current = setInterval(tick, getBeatInterval(project.bpm));
    }
  }, [isPlaying, project.bpm, getBeatInterval]);

  // Update interval when BPM changes while playing
  useEffect(() => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const tick = () => {
        const proj = projectRef.current;
        const nextCol = (currentColRef.current + 1) % proj.numCols;
        currentColRef.current = nextCol;
        setCurrentCol(nextCol);
        proj.rows.forEach((row) => {
          if (row.cells[nextCol]) {
            const customBuffer = customAudioBuffers.get(row.id);
            audioEngine.playSound(row.name, customBuffer, volumeRef.current);
          }
        });
      };
      intervalRef.current = setInterval(tick, getBeatInterval(project.bpm));
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [project.bpm, isPlaying, getBeatInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Toggle a cell
  const toggleCell = useCallback((rowId: string, colIndex: number) => {
    setProject(prev => ({
      ...prev,
      rows: prev.rows.map(row =>
        row.id === rowId
          ? { ...row, cells: row.cells.map((c, i) => i === colIndex ? !c : c) }
          : row
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  /**
   * Handle cell click:
   * - Always toggles the cell
   * - ONLY plays preview sound if looper is NOT running
   *   (so the preview doesn't distract while the beat is playing)
   */
  const handleCellClick = useCallback((rowId: string, colIndex: number, rowName: string) => {
    toggleCell(rowId, colIndex);

    // Only play preview when the looper is stopped
    if (!isPlayingRef.current) {
      const customBuffer = customAudioBuffers.get(rowId);
      audioEngine.resume().then(() => {
        audioEngine.playSound(rowName, customBuffer, volumeRef.current);
      });
    }
  }, [toggleCell]);

  // BPM change
  const applyBpm = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 20 && num <= 300) {
      setProject(prev => ({ ...prev, bpm: num, updatedAt: Date.now() }));
      setBpmInput(String(num));
    }
  };

  // Add column
  const addColumn = () => {
    setProject(prev => ({
      ...prev,
      numCols: prev.numCols + 1,
      rows: prev.rows.map(row => ({ ...row, cells: [...row.cells, false] })),
      updatedAt: Date.now(),
    }));
  };

  // Remove last column (min 4)
  const removeColumn = () => {
    if (project.numCols <= 4) return;
    setProject(prev => ({
      ...prev,
      numCols: prev.numCols - 1,
      rows: prev.rows.map(row => ({ ...row, cells: row.cells.slice(0, -1) })),
      updatedAt: Date.now(),
    }));
  };

  // Add row
  const addRow = (name?: string) => {
    const rowName = name || newInstrumentName || selectedPresetInstrument || 'New Track';
    const newRow: BeatRow = {
      id: generateId(),
      name: rowName,
      cells: Array(project.numCols).fill(false),
    };
    setProject(prev => ({
      ...prev,
      rows: [...prev.rows, newRow],
      updatedAt: Date.now(),
    }));
    setShowAddInstrument(false);
    setNewInstrumentName('');
  };

  // Remove row
  const removeRow = (rowId: string) => {
    if (project.rows.length <= 1) return;
    customAudioBuffers.delete(rowId);
    setProject(prev => ({
      ...prev,
      rows: prev.rows.filter(r => r.id !== rowId),
      updatedAt: Date.now(),
    }));
  };

  // Rename row
  const startEditRow = (row: BeatRow) => {
    setEditingRowId(row.id);
    setEditingRowName(row.name);
  };

  const saveRowName = () => {
    if (!editingRowId || !editingRowName.trim()) return;
    setProject(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === editingRowId ? { ...r, name: editingRowName.trim() } : r),
      updatedAt: Date.now(),
    }));
    setEditingRowId(null);
  };

  // Upload custom sound for a row
  const handleFileUpload = async (rowId: string, file: File) => {
    try {
      await audioEngine.resume();
      const buffer = await audioEngine.loadAudioFile(file);
      customAudioBuffers.set(rowId, buffer);
      setProject(prev => ({
        ...prev,
        rows: prev.rows.map(r => r.id === rowId ? { ...r, customFileName: file.name } : r),
        updatedAt: Date.now(),
      }));
      // Preview only plays if looper is stopped
      if (!isPlayingRef.current) {
        audioEngine.playCustomSound(buffer, volumeRef.current);
      }
    } catch (err) {
      console.error('Failed to load audio file:', err);
      alert('Failed to load audio file. Please try a different file.');
    }
  };

  // Remove custom sound
  const removeCustomSound = (rowId: string) => {
    customAudioBuffers.delete(rowId);
    setProject(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === rowId ? { ...r, customFileName: undefined } : r),
      updatedAt: Date.now(),
    }));
  };

  // Clear all cells in a row
  const clearRow = (rowId: string) => {
    setProject(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === rowId ? { ...r, cells: r.cells.map(() => false) } : r),
      updatedAt: Date.now(),
    }));
  };

  // Save project
  const handleSave = () => {
    const updatedProject = { ...project, updatedAt: Date.now() };
    saveProject(updatedProject);
    setProject(updatedProject);
    setShowSaveNotif('Project saved!');
    setTimeout(() => setShowSaveNotif(null), 2000);
  };

  // Save as draft
  const handleSaveDraft = () => {
    const updatedProject = { ...project, updatedAt: Date.now() };
    saveProject(updatedProject);
    setProject(updatedProject);
    setShowSaveNotif('Draft saved!');
    setTimeout(() => setShowSaveNotif(null), 2000);
  };

  // Download beat
  const handleDownload = async () => {
    try {
      setShowDownloading(true);
      await audioEngine.resume();
      const blob = await audioEngine.recordBeat(
        project.rows.map(r => ({
          name: r.name,
          cells: r.cells,
          customBuffer: customAudioBuffers.get(r.id),
        })),
        project.bpm,
        project.numCols
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_${project.bpm}bpm.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setShowDownloading(false);
    }
  };

  // Clear all
  const handleClearAll = () => {
    if (!confirm('Clear all beats? This cannot be undone.')) return;
    setProject(prev => ({
      ...prev,
      rows: prev.rows.map(r => ({ ...r, cells: r.cells.map(() => false) })),
      updatedAt: Date.now(),
    }));
  };

  // Rename project
  const saveProjectName = () => {
    if (!projectNameInput.trim()) return;
    setProject(prev => ({ ...prev, name: projectNameInput.trim(), updatedAt: Date.now() }));
    setProjectNameEdit(false);
  };

  // ── Random Beat Logic ──
  const openRandomModal = () => {
    setRandomPreview(null);
    setRandomConfirmOverwrite(false);
    setShowRandomModal(true);
  };

  const previewRandomBeat = () => {
    const config = GENRE_CONFIGS.find(g => g.label === randomGenre)!;
    const bpmVariation = config.bpm + Math.floor(Math.random() * 11) - 5;
    setRandomPreview({ genre: randomGenre, bpm: bpmVariation });
  };

  const applyRandomBeat = () => {
    const hasActiveCells = project.rows.some(r => r.cells.some(Boolean));
    if (hasActiveCells && !randomConfirmOverwrite) {
      setRandomConfirmOverwrite(true);
      return;
    }
    _doApplyRandomBeat();
  };

  const _doApplyRandomBeat = () => {
    const rowNames = project.rows.map(r => r.name);
    const { patternMap, bpm } = generateRandomBeat(randomGenre, project.numCols, rowNames);

    setProject(prev => ({
      ...prev,
      bpm: randomApplyBpm ? bpm : prev.bpm,
      rows: prev.rows.map(row => ({
        ...row,
        cells: patternMap[row.name] ?? Array(prev.numCols).fill(false),
      })),
      updatedAt: Date.now(),
    }));

    if (randomApplyBpm) {
      setBpmInput(String(bpm));
    }

    setShowRandomModal(false);
    setRandomConfirmOverwrite(false);
    setRandomPreview(null);

    setShowSaveNotif(`🎲 ${randomGenre} beat generated!`);
    setTimeout(() => setShowSaveNotif(null), 2500);
  };

  // Column beat groups (groups of 4)
  const getColGroupClass = (colIndex: number) => {
    const group = Math.floor(colIndex / 4) % 2;
    return group === 0 ? 'bg-white/[0.02]' : 'bg-transparent';
  };

  // Keyboard shortcut: Spacebar to play/stop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'Escape') {
        setShowRandomModal(false);
        setShowBpmPresets(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay]);

  const activeCount = project.rows.reduce((acc, row) => acc + row.cells.filter(Boolean).length, 0);
  const selectedGenreConfig = GENRE_CONFIGS.find(g => g.label === randomGenre)!;

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col" style={{ fontFamily: "'Rajdhani', sans-serif" }}>

      {/* ===== HEADER ===== */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-red-950/50 bg-[#0a0a14]/90 backdrop-blur-md sticky top-0 z-50 flex-wrap gap-y-2">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm font-semibold"
        >
          <span>←</span> <span className="hidden sm:inline">HOME</span>
        </button>
        <div className="h-5 w-px bg-red-900/40" />

        {/* Project name */}
        {projectNameEdit ? (
          <div className="flex items-center gap-2">
            <input
              className="kdmph-input px-2 py-1 text-sm font-orbitron w-40"
              value={projectNameInput}
              onChange={e => setProjectNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveProjectName(); if (e.key === 'Escape') setProjectNameEdit(false); }}
              autoFocus
            />
            <button onClick={saveProjectName} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-950/40 rounded">✓</button>
            <button onClick={() => setProjectNameEdit(false)} className="text-gray-500 hover:text-gray-400 text-xs px-2 py-1 bg-gray-800/40 rounded">✕</button>
          </div>
        ) : (
          <button
            onClick={() => { setProjectNameEdit(true); setProjectNameInput(project.name); }}
            className="font-orbitron text-sm font-bold text-white hover:text-red-400 transition-colors flex items-center gap-1.5"
          >
            {project.name} <span className="text-xs text-gray-600">✏️</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Looper status indicator */}
        <div className={`hidden md:flex items-center gap-1.5 text-[10px] font-orbitron px-2 py-1 rounded-full border ${
          isPlaying
            ? 'text-red-400 border-red-800/60 bg-red-950/30'
            : 'text-gray-600 border-gray-800/40 bg-gray-900/30'
        }`}>
          {isPlaying ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" /> LOOPING</>
          ) : (
            <><span className="w-1.5 h-1.5 rounded-full bg-gray-700 inline-block" /> STOPPED · PREVIEW ON</>
          )}
        </div>

        {/* Active steps */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-600">
          <span className="text-red-500 font-bold">{activeCount}</span> active steps
        </div>

        {/* Save Notification */}
        {showSaveNotif && (
          <div className="px-3 py-1.5 bg-green-900/60 border border-green-700/50 text-green-400 text-xs font-orbitron rounded-lg animate-pulse">
            ✓ {showSaveNotif}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSaveDraft}
            className="px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 text-gray-300 font-orbitron text-xs rounded-lg transition-all"
            title="Save as Draft"
          >
            📝 DRAFT
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-900/70 hover:bg-blue-800 border border-blue-700/50 text-blue-300 font-orbitron text-xs rounded-lg transition-all"
            title="Save (overwrites existing)"
          >
            💾 SAVE
          </button>
          <button
            onClick={handleDownload}
            disabled={showDownloading}
            className="px-3 py-1.5 bg-green-900/70 hover:bg-green-800 border border-green-700/50 text-green-300 font-orbitron text-xs rounded-lg transition-all disabled:opacity-50"
            title="Download WAV"
          >
            {showDownloading ? '⏳ ...' : '⬇️ WAV'}
          </button>
        </div>
      </header>

      {/* ===== CONTROLS BAR ===== */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#0d0d1a] border-b border-gray-900/60 flex-wrap gap-y-3">

        {/* Play / Stop */}
        <button
          onClick={togglePlay}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-orbitron text-sm font-bold transition-all ${
            isPlaying
              ? 'bg-red-800 hover:bg-red-700 text-white pulse-glow'
              : 'bg-red-700 hover:bg-red-600 text-white btn-glow'
          }`}
        >
          {isPlaying ? '⏹ STOP' : '▶ PLAY'}
        </button>
        <span className="text-gray-700 text-[10px] font-orbitron hidden md:block">SPACE</span>

        <div className="h-7 w-px bg-gray-800" />

        {/* BPM Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 text-xs font-orbitron">BPM</span>
          <div className="relative">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const v = Math.max(20, project.bpm - 1);
                  setProject(p => ({ ...p, bpm: v })); setBpmInput(String(v));
                }}
                className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm flex items-center justify-center"
              >−</button>
              <input
                type="number"
                className="kdmph-input w-16 text-center py-1 text-sm font-orbitron font-bold text-red-400"
                value={bpmInput}
                min={20} max={300}
                onChange={e => setBpmInput(e.target.value)}
                onBlur={e => applyBpm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyBpm(bpmInput); }}
              />
              <button
                onClick={() => {
                  const v = Math.min(300, project.bpm + 1);
                  setProject(p => ({ ...p, bpm: v })); setBpmInput(String(v));
                }}
                className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm flex items-center justify-center"
              >+</button>
            </div>
          </div>

          {/* BPM Presets */}
          <div className="relative">
            <button
              onClick={() => setShowBpmPresets(p => !p)}
              className="px-3 py-1.5 bg-gray-800/70 hover:bg-gray-700 border border-gray-700/50 text-gray-400 text-xs font-orbitron rounded-lg transition-all"
            >
              PRESETS ▾
            </button>
            {showBpmPresets && (
              <div className="absolute top-full left-0 mt-1 bg-[#111125] border border-red-900/40 rounded-xl shadow-2xl z-50 min-w-36 overflow-hidden">
                {BPM_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setProject(p => ({ ...p, bpm: preset.bpm }));
                      setBpmInput(String(preset.bpm));
                      setShowBpmPresets(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-red-900/30 text-sm font-rajdhani font-semibold flex justify-between items-center gap-4 transition-colors"
                  >
                    <span className="text-white">{preset.label}</span>
                    <span className="text-red-400 font-orbitron text-xs">{preset.bpm}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-7 w-px bg-gray-800" />

        {/* Volume */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs font-orbitron">VOL</span>
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-20 accent-red-600 cursor-pointer"
          />
          <span className="text-red-400 text-xs font-orbitron w-8">{Math.round(volume * 100)}%</span>
        </div>

        <div className="h-7 w-px bg-gray-800" />

        {/* Columns controls */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs font-orbitron">STEPS</span>
          <button
            onClick={removeColumn}
            disabled={project.numCols <= 4}
            className="w-7 h-7 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white rounded text-sm flex items-center justify-center"
          >−</button>
          <span className="text-white font-orbitron text-sm w-6 text-center">{project.numCols}</span>
          <button
            onClick={addColumn}
            className="w-7 h-7 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm flex items-center justify-center"
          >+</button>
        </div>

        <div className="h-7 w-px bg-gray-800 hidden lg:block" />

        {/* Pattern shortcuts */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 text-xs font-orbitron hidden lg:block">FILL:</span>
          <button
            onClick={() => {
              setProject(prev => ({
                ...prev,
                rows: prev.rows.map((r, ri) => ri === 0 ? {
                  ...r, cells: r.cells.map((_, i) => i % 2 === 0)
                } : r),
                updatedAt: Date.now(),
              }));
            }}
            className="px-2 py-1.5 bg-gray-900/60 hover:bg-gray-800 border border-gray-800/50 text-gray-500 hover:text-white font-orbitron text-[10px] rounded transition-all"
            title="Fill kick on every 2 steps"
          >2x</button>
          <button
            onClick={() => {
              setProject(prev => ({
                ...prev,
                rows: prev.rows.map((r, ri) => ri === 0 ? {
                  ...r, cells: r.cells.map((_, i) => i % 4 === 0)
                } : r),
                updatedAt: Date.now(),
              }));
            }}
            className="px-2 py-1.5 bg-gray-900/60 hover:bg-gray-800 border border-gray-800/50 text-gray-500 hover:text-white font-orbitron text-[10px] rounded transition-all"
            title="Fill kick on every 4 steps"
          >4x</button>
        </div>

        <div className="flex-1" />

        {/* 🎲 RANDOM BEAT BUTTON */}
        <button
          onClick={openRandomModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-900/80 to-purple-900/80 hover:from-violet-800/90 hover:to-purple-800/90 border border-violet-700/50 hover:border-violet-500/70 text-violet-300 hover:text-white font-orbitron text-xs rounded-xl transition-all shadow-lg hover:shadow-violet-900/40"
          title="Generate a random beat by genre"
        >
          <span className="text-base">🎲</span>
          <span>RANDOM BEAT</span>
        </button>

        {/* Clear all */}
        <button
          onClick={handleClearAll}
          className="px-3 py-1.5 bg-gray-900/60 hover:bg-red-950/40 border border-gray-800/50 hover:border-red-900/40 text-gray-500 hover:text-red-400 font-orbitron text-xs rounded-lg transition-all"
        >
          🗑 CLEAR ALL
        </button>
      </div>

      {/* ===== PREVIEW SOUND HINT BAR ===== */}
      <div className={`flex items-center justify-center gap-2 px-4 py-1.5 transition-all duration-500 ${
        isPlaying
          ? 'bg-red-950/20 border-b border-red-900/20'
          : 'bg-emerald-950/20 border-b border-emerald-900/20'
      }`}>
        {isPlaying ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
            <span className="text-[10px] font-orbitron text-red-400/80">
              LOOPER ACTIVE — Click cells to toggle patterns silently · Preview sounds disabled while looping
            </span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-[10px] font-orbitron text-emerald-400/80">
              LOOPER STOPPED — Click any cell to hear its preview sound
            </span>
          </>
        )}
      </div>

      {/* ===== BEAT GRID ===== */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div ref={gridRef} className="flex-1 overflow-auto beat-grid-scroll p-4">

          {/* Column numbers header */}
          <div className="flex mb-1 sticky top-0 z-20 bg-[#080810]/90">
            {/* Row label spacer */}
            <div className="flex-shrink-0" style={{ width: '160px' }} />
            {/* Action spacer */}
            <div className="flex-shrink-0 w-8" />
            {/* Column numbers */}
            <div className="flex gap-1">
              {Array.from({ length: project.numCols }).map((_, colIndex) => {
                const isBeat = colIndex % 4 === 0;
                const beatNum = Math.floor(colIndex / 4) + 1;
                const isActive = currentCol === colIndex;
                return (
                  <div
                    key={colIndex}
                    className={`col-number flex-shrink-0 flex items-center justify-center rounded-sm transition-colors ${
                      isActive
                        ? 'text-red-400 bg-red-950/30'
                        : isBeat
                        ? 'text-gray-500'
                        : 'text-gray-700'
                    }`}
                    style={{ width: '48px', height: '20px' }}
                  >
                    {isBeat ? beatNum : '·'}
                  </div>
                );
              })}
            </div>
            {/* Add column btn */}
            <div className="flex-shrink-0 w-10" />
          </div>

          {/* Beat rows */}
          <div className="flex flex-col gap-1.5 relative">
            {project.rows.map((row) => (
              <div
                key={row.id}
                className={`flex items-center gap-1 group transition-all duration-150 ${
                  highlightedRow === row.id ? 'ring-1 ring-red-600/30 rounded-lg' : ''
                }`}
                onMouseEnter={() => setHighlightedRow(row.id)}
                onMouseLeave={() => setHighlightedRow(null)}
              >
                {/* Row label */}
                <div
                  className="row-label flex-shrink-0 flex items-center justify-between gap-1 px-2 py-1"
                  style={{ width: '160px', minHeight: '44px' }}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    {editingRowId === row.id ? (
                      <input
                        className="kdmph-input px-1 py-0.5 text-xs w-full"
                        value={editingRowName}
                        onChange={e => setEditingRowName(e.target.value)}
                        onBlur={saveRowName}
                        onKeyDown={e => { if (e.key === 'Enter') saveRowName(); if (e.key === 'Escape') setEditingRowId(null); }}
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => startEditRow(row)}
                        className="text-left text-xs font-semibold text-white truncate hover:text-red-400 transition-colors"
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                      >
                        {row.name}
                      </button>
                    )}
                    {row.customFileName ? (
                      <div className="flex items-center gap-1">
                        <span className="text-green-400 text-[10px] truncate max-w-[90px]">🎵 {row.customFileName}</span>
                        <button
                          onClick={() => removeCustomSound(row.id)}
                          className="text-red-600 hover:text-red-400 text-[10px]"
                          title="Remove custom sound"
                        >✕</button>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-[10px]">default</span>
                    )}
                  </div>

                  {/* Upload sound button */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => {
                        const input = fileInputRefs.current.get(row.id);
                        if (input) input.click();
                      }}
                      className="text-gray-600 hover:text-yellow-400 transition-colors text-sm"
                      title="Upload custom sound"
                    >
                      🎵
                    </button>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      ref={el => {
                        if (el) fileInputRefs.current.set(row.id, el);
                      }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(row.id, file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>

                {/* Clear row / remove row buttons (show on hover) */}
                <div className="flex-shrink-0 w-8 flex flex-col gap-0.5 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => clearRow(row.id)}
                    className="text-gray-700 hover:text-yellow-500 text-xs transition-colors"
                    title="Clear row"
                  >⚡</button>
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-gray-700 hover:text-red-500 text-xs transition-colors"
                    title="Remove row"
                  >✕</button>
                </div>

                {/* CELLS */}
                <div className="flex gap-1 relative">
                  {row.cells.map((active, colIndex) => {
                    const isCurrentCol = currentCol === colIndex;
                    const groupClass = getColGroupClass(colIndex);
                    const isBeat = colIndex % 4 === 0;
                    return (
                      <button
                        key={colIndex}
                        className={`beat-cell flex-shrink-0 ${active ? 'active' : ''} ${isCurrentCol ? 'playing' : ''} ${groupClass}`}
                        style={{
                          width: '48px',
                          height: '44px',
                          borderTopWidth: isBeat ? '2px' : '1px',
                          borderTopColor: isBeat ? 'rgba(220,20,60,0.15)' : undefined,
                        }}
                        onClick={() => handleCellClick(row.id, colIndex, row.name)}
                        aria-label={`${row.name} step ${colIndex + 1} ${active ? 'on' : 'off'}`}
                      >
                        {/* Dot indicator for active */}
                        {active && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2 h-2 rounded-full bg-white/40" />
                          </div>
                        )}
                        {/* Playhead column highlight */}
                        {isCurrentCol && (
                          <div className="absolute inset-0 bg-white/10 pointer-events-none rounded-sm" />
                        )}
                        {/* Beat marker dot at top */}
                        {isBeat && !active && (
                          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-900/50 pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Add column + button at end of row (only first row) */}
                {row.id === project.rows[0]?.id && (
                  <button
                    onClick={addColumn}
                    className="flex-shrink-0 w-9 h-11 ml-1 bg-gray-900/60 hover:bg-gray-800 border border-gray-800/50 hover:border-red-800/50 text-gray-600 hover:text-red-400 rounded-lg text-lg transition-all font-bold flex items-center justify-center"
                    title="Add column"
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Row Button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setShowAddInstrument(p => !p)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800/60 hover:border-red-800/50 text-gray-400 hover:text-red-400 font-orbitron text-xs rounded-xl transition-all"
            >
              <span className="text-lg font-bold">+</span> ADD TRACK
            </button>

            {showAddInstrument && (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedPresetInstrument}
                  onChange={e => setSelectedPresetInstrument(e.target.value)}
                  className="kdmph-input px-3 py-2 text-sm text-white"
                >
                  {DEFAULT_INSTRUMENTS.map(inst => (
                    <option key={inst} value={inst} className="bg-[#111125]">{inst}</option>
                  ))}
                  <option value="__custom__" className="bg-[#111125]">Custom Name...</option>
                </select>
                {selectedPresetInstrument === '__custom__' && (
                  <input
                    className="kdmph-input px-3 py-2 text-sm w-36"
                    placeholder="Track name..."
                    value={newInstrumentName}
                    onChange={e => setNewInstrumentName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addRow(); }}
                  />
                )}
                <button
                  onClick={() => addRow(selectedPresetInstrument !== '__custom__' ? selectedPresetInstrument : undefined)}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-orbitron text-xs rounded-lg transition-all btn-glow"
                >
                  ADD
                </button>
                <button
                  onClick={() => setShowAddInstrument(false)}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition-all"
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playhead indicator at bottom */}
      {isPlaying && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#0d0d1a]/90 border border-red-900/50 rounded-full shadow-2xl z-50 backdrop-blur-md">
          <div className="flex gap-1 items-end">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  animationDelay: `${i * 0.12}s`,
                  animationDuration: `${0.6 + i * 0.1}s`,
                  height: '12px',
                }}
              />
            ))}
          </div>
          <span className="font-orbitron text-xs text-red-400">PLAYING · {project.bpm} BPM</span>
          <span className="font-orbitron text-xs text-gray-600">STEP {currentCol + 1}/{project.numCols}</span>
          <div className="flex gap-1 items-end">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  animationDelay: `${i * 0.12 + 0.6}s`,
                  animationDuration: `${0.6 + i * 0.1}s`,
                  height: '12px',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Close BPM presets on outside click */}
      {showBpmPresets && (
        <div className="fixed inset-0 z-40" onClick={() => setShowBpmPresets(false)} />
      )}

      {/* ===== RANDOM BEAT MODAL ===== */}
      {showRandomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => { setShowRandomModal(false); setRandomConfirmOverwrite(false); setRandomPreview(null); }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl bg-[#0d0d1e] border border-violet-900/50 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-violet-900/30 bg-gradient-to-r from-violet-950/60 to-purple-950/60">
              <div>
                <h2 className="font-orbitron text-lg font-bold text-white flex items-center gap-2">
                  🎲 <span>RANDOM BEAT GENERATOR</span>
                </h2>
                <p className="text-gray-500 text-xs mt-0.5 font-rajdhani">Pick a genre and generate an authentic beat pattern</p>
              </div>
              <button
                onClick={() => { setShowRandomModal(false); setRandomConfirmOverwrite(false); setRandomPreview(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
              >✕</button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">

              {/* Genre Grid */}
              <div>
                <p className="text-xs text-gray-500 font-orbitron mb-3 uppercase tracking-widest">Select Genre</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {GENRE_CONFIGS.map((gc) => (
                    <button
                      key={gc.label}
                      onClick={() => { setRandomGenre(gc.label); setRandomPreview(null); setRandomConfirmOverwrite(false); }}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-orbitron transition-all ${
                        randomGenre === gc.label
                          ? `bg-gradient-to-br ${gc.color} border-violet-500/70 text-white shadow-lg scale-105`
                          : 'bg-gray-900/50 border-gray-800/50 text-gray-500 hover:border-gray-600/70 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}
                    >
                      <span className="text-xl">{gc.emoji}</span>
                      <span className="leading-tight text-center" style={{ fontSize: '9px' }}>{gc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Genre Info */}
              {selectedGenreConfig && (
                <div className={`p-4 rounded-xl border border-violet-900/30 bg-gradient-to-r ${selectedGenreConfig.color} bg-opacity-10`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{selectedGenreConfig.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-orbitron text-sm font-bold text-white">{selectedGenreConfig.label}</span>
                        <span className="font-orbitron text-xs text-violet-300 bg-violet-900/40 px-2 py-0.5 rounded-full">
                          ~{selectedGenreConfig.bpm} BPM
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs font-rajdhani">{selectedGenreConfig.description}</p>
                      <p className="text-gray-600 text-[10px] font-rajdhani mt-1">
                        Works with all rows including your custom uploaded sounds
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setRandomApplyBpm(p => !p)}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      randomApplyBpm ? 'bg-violet-600' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      randomApplyBpm ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-xs text-gray-400 font-rajdhani font-semibold">Auto-set BPM to genre tempo</span>
                </label>

                <div className="text-xs text-gray-600 font-rajdhani">
                  Every click generates a <span className="text-violet-400">unique variation</span> — no two beats are the same
                </div>
              </div>

              {/* Preview info */}
              {randomPreview && (
                <div className="flex items-center gap-2 px-4 py-3 bg-violet-950/30 border border-violet-800/40 rounded-xl">
                  <span className="text-violet-400 text-sm">✓</span>
                  <span className="text-violet-300 text-xs font-orbitron">
                    Preview: {randomPreview.genre} — {randomPreview.bpm} BPM
                  </span>
                  <span className="text-gray-600 text-xs font-rajdhani ml-2">Click GENERATE to apply to your grid</span>
                </div>
              )}

              {/* Overwrite warning */}
              {randomConfirmOverwrite && (
                <div className="flex items-center gap-3 px-4 py-3 bg-orange-950/40 border border-orange-700/50 rounded-xl">
                  <span className="text-orange-400 text-sm">⚠️</span>
                  <div className="flex-1">
                    <p className="text-orange-300 text-xs font-orbitron">This will overwrite your current beat pattern.</p>
                    <p className="text-gray-500 text-[10px] font-rajdhani">Save your draft first if you want to keep it!</p>
                  </div>
                  <button
                    onClick={handleSaveDraft}
                    className="px-3 py-1.5 bg-blue-900/60 border border-blue-700/50 text-blue-300 font-orbitron text-[10px] rounded-lg transition-all hover:bg-blue-800/60"
                  >
                    SAVE DRAFT FIRST
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-violet-900/30 bg-[#0a0a18]/80 gap-3 flex-wrap">
              <div className="text-[10px] text-gray-700 font-rajdhani">
                Custom uploaded sounds will also receive genre-matched random patterns
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowRandomModal(false); setRandomConfirmOverwrite(false); setRandomPreview(null); }}
                  className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-500 hover:text-gray-300 font-orbitron text-xs rounded-xl transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={previewRandomBeat}
                  className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 text-gray-300 font-orbitron text-xs rounded-xl transition-all"
                >
                  🔍 PREVIEW INFO
                </button>
                <button
                  onClick={applyRandomBeat}
                  className={`px-5 py-2 font-orbitron text-xs rounded-xl transition-all shadow-lg font-bold ${
                    randomConfirmOverwrite
                      ? 'bg-orange-700 hover:bg-orange-600 text-white border border-orange-500/50'
                      : 'bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 text-white border border-violet-500/50'
                  }`}
                >
                  {randomConfirmOverwrite ? '⚠️ OVERWRITE & GENERATE' : '🎲 GENERATE BEAT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeatMaker;
