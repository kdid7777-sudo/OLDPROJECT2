import React, { useState } from 'react';
import { getAllProjects, deleteProject } from '../utils/storage';
import { getAllMusicProjects, deleteMusicProject } from '../utils/musicStorage';
import type { BeatProject } from '../types/beat';
import type { MusicProject } from '../types/music';

type AnyProject = (BeatProject & { type: 'beat' }) | (MusicProject & { type: 'music' });

export interface DraftsPageProps {
  onBack: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenMusicProject: (projectId: string) => void;
  onNewBeat: () => void;
  onNewMusic: () => void;
}

const DraftsPage: React.FC<DraftsPageProps> = ({
  onBack, onOpenProject, onOpenMusicProject, onNewBeat, onNewMusic,
}) => {
  const load = (): AnyProject[] => {
    const beats = getAllProjects().map(p => ({ ...p, type: 'beat' as const }));
    const music = getAllMusicProjects().map(p => ({ ...p, type: 'music' as const }));
    return [...beats, ...music].sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const [projects, setProjects] = useState<AnyProject[]>(load);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'beat' | 'music'>('all');

  const handleDelete = (p: AnyProject) => {
    if (p.type === 'beat') deleteProject(p.id);
    else deleteMusicProject(p.id);
    setProjects(prev => prev.filter(x => x.id !== p.id));
    setDeleteConfirm(null);
  };

  const handleOpen = (p: AnyProject) => {
    if (p.type === 'beat') onOpenProject(p.id);
    else onOpenMusicProject(p.id);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const filtered = projects.filter(p => filter === 'all' || p.type === filter);
  const beatCount  = projects.filter(p => p.type === 'beat').length;
  const musicCount = projects.filter(p => p.type === 'music').length;

  return (
    <div className="min-h-screen animated-gradient grid-bg relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex items-center gap-4 px-6 py-5 border-b border-gray-800/50">
          <button onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-rajdhani font-semibold">
            <span className="text-xl">←</span>
            <span>HOME</span>
          </button>
          <div className="h-6 w-px bg-gray-700" />
          <div>
            <h1 className="font-orbitron text-xl font-bold text-white tracking-wider">MY DRAFTS</h1>
            <p className="text-gray-500 text-xs font-rajdhani">{projects.length} project{projects.length !== 1 ? 's' : ''} saved</p>
          </div>
          <div className="flex-1" />
          <button onClick={onNewMusic}
            className="px-4 py-2 font-orbitron text-xs rounded-lg transition-all"
            style={{ background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff', boxShadow: '0 0 12px rgba(0,229,255,0.15)' }}>
            + NEW MUSIC
          </button>
          <button onClick={onNewBeat}
            className="px-4 py-2 font-orbitron text-xs rounded-lg transition-all"
            style={{ background: 'rgba(220,20,60,0.15)', border: '1px solid rgba(220,20,60,0.4)', color: '#ff4466', boxShadow: '0 0 12px rgba(220,20,60,0.15)' }}>
            + NEW BEAT
          </button>
        </header>

        {/* ── Filter tabs ─────────────────────────────────────────────────── */}
        <div className="flex gap-2 px-6 pt-5 pb-2">
          {([
            { k: 'all',   label: `All (${projects.length})` },
            { k: 'beat',  label: `🥁 Beats (${beatCount})` },
            { k: 'music', label: `🎵 Instrumental (${musicCount})` },
          ] as const).map(({ k, label }) => (
            <button key={k} onClick={() => setFilter(k)}
              className="px-4 py-1.5 rounded-lg font-orbitron text-xs transition-all"
              style={{
                background: filter === k
                  ? k === 'beat' ? 'rgba(220,20,60,0.2)' : k === 'music' ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.04)',
                border: filter === k
                  ? k === 'beat' ? '1px solid rgba(220,20,60,0.5)' : k === 'music' ? '1px solid rgba(0,229,255,0.5)' : '1px solid rgba(255,255,255,0.2)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: filter === k
                  ? k === 'beat' ? '#ff4466' : k === 'music' ? '#00e5ff' : '#fff'
                  : '#666',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Project Grid ────────────────────────────────────────────────── */}
        <main className="flex-1 px-6 py-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-6xl mb-4">{filter === 'music' ? '🎵' : filter === 'beat' ? '🥁' : '📂'}</div>
              <h3 className="font-orbitron text-xl text-gray-500 mb-2">No {filter === 'all' ? 'Drafts' : filter === 'beat' ? 'Beats' : 'Instrumentals'} Yet</h3>
              <p className="text-gray-600 font-rajdhani mb-6">Start creating!</p>
              <div className="flex gap-3">
                <button onClick={onNewBeat}
                  className="px-6 py-3 font-orbitron text-sm rounded-xl transition-all"
                  style={{ background: 'rgba(220,20,60,0.2)', border: '1px solid rgba(220,20,60,0.5)', color: '#ff4466' }}>
                  🥁 MAKE A BEAT
                </button>
                <button onClick={onNewMusic}
                  className="px-6 py-3 font-orbitron text-sm rounded-xl transition-all"
                  style={{ background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff' }}>
                  🎵 COMPOSE MUSIC
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {filtered.map(project => {
                const isBeat  = project.type === 'beat';
                const accent  = isBeat ? '#dc143c' : '#00e5ff';
                const accentBg = isBeat ? 'rgba(220,20,60,0.08)' : 'rgba(0,229,255,0.08)';
                const accentBorder = isBeat ? 'rgba(220,20,60,0.25)' : 'rgba(0,229,255,0.2)';
                const tagColor = isBeat ? '#ff4466' : '#00e5ff';
                const tagBg   = isBeat ? 'rgba(220,20,60,0.15)' : 'rgba(0,229,255,0.12)';

                return (
                  <div key={project.id}
                    className="rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.01]"
                    style={{
                      background: 'rgba(5,8,12,0.8)',
                      border: `1px solid ${accentBorder}`,
                      boxShadow: `0 2px 20px ${accentBg}`,
                    }}>

                    {/* Card top accent */}
                    <div style={{ height: 3, background: `linear-gradient(to right, transparent, ${accent}88, transparent)` }} />

                    {/* Card header */}
                    <div className="px-5 pt-4 pb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                          {isBeat ? '🥁' : '🎵'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-orbitron text-sm font-bold text-white truncate">{project.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-rajdhani text-xs" style={{ color: accent }}>{project.bpm} BPM</span>
                            <span className="px-1.5 py-0.5 rounded text-xs font-orbitron"
                              style={{ background: tagBg, color: tagColor, border: `1px solid ${accentBorder}` }}>
                              {isBeat ? 'BEAT' : 'INSTRUMENTAL MUSIC'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="px-5 pb-3">
                      <div className="flex gap-4 text-xs text-gray-500 font-rajdhani">
                        {isBeat
                          ? <><span>🎼 {(project as BeatProject).rows.length} Tracks</span><span>📏 {project.numCols} Steps</span></>
                          : <><span>🎹 {(project as MusicProject).tracks.length} Instruments</span><span>📏 {project.numCols} Steps</span></>
                        }
                      </div>
                      <p className="text-gray-700 text-xs mt-1 font-rajdhani">Updated: {formatDate(project.updatedAt)}</p>
                    </div>

                    {/* Mini preview */}
                    <div className="px-5 pb-4">
                      {isBeat ? (
                        <div className="flex flex-col gap-0.5">
                          {(project as BeatProject).rows.slice(0, 4).map(row => (
                            <div key={row.id} className="flex gap-0.5">
                              {row.cells.slice(0, 16).map((active, ci) => (
                                <div key={ci}
                                  className="h-2 flex-1 rounded-sm transition-all"
                                  style={{ background: active ? accent : 'rgba(255,255,255,0.06)' }} />
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Music project: show a mini note visualization
                        <div className="flex flex-col gap-0.5">
                          {(project as MusicProject).tracks.slice(0, 4).map(track => {
                            const dots = new Array(16).fill(false);
                            track.notes.forEach(n => { if (n.col < 16) dots[n.col] = true; });
                            return (
                              <div key={track.id} className="flex gap-0.5">
                                {dots.map((on, ci) => (
                                  <div key={ci}
                                    className="h-2 flex-1 rounded-sm"
                                    style={{ background: on ? track.color : 'rgba(255,255,255,0.06)' }} />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button onClick={() => handleOpen(project)}
                        className="flex-1 py-2 font-orbitron text-xs rounded-lg transition-all"
                        style={{ background: isBeat ? 'rgba(220,20,60,0.2)' : 'rgba(0,229,255,0.15)', border: `1px solid ${accentBorder}`, color: tagColor }}>
                        OPEN
                      </button>
                      {deleteConfirm === project.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(project)}
                            className="px-3 py-2 font-orbitron text-xs rounded-lg transition-all"
                            style={{ background: 'rgba(220,20,60,0.2)', border: '1px solid rgba(220,20,60,0.4)', color: '#ff4466' }}>
                            CONFIRM
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 font-orbitron text-xs rounded-lg">
                            NO
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(project.id)}
                          className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-500 font-orbitron text-xs rounded-lg transition-all">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DraftsPage;
