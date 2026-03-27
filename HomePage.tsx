import React from 'react';
import { getAllProjects } from '../utils/storage';
import { getAllMusicProjects } from '../utils/musicStorage';

interface HomePageProps {
  onNavigate: (page: 'beatmaker' | 'drafts' | 'instrucomposer') => void;
  onOpenProject: (projectId: string) => void;
  onOpenMusicProject: (projectId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenProject, onOpenMusicProject }) => {
  const beatProjects = getAllProjects().sort((a, b) => b.updatedAt - a.updatedAt);
  const musicProjects = getAllMusicProjects().sort((a, b) => b.updatedAt - a.updatedAt);
  const allRecent = [
    ...beatProjects.map(p => ({ ...p, kind: 'beat' as const })),
    ...musicProjects.map(p => ({ ...p, kind: 'music' as const })),
  ].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  const totalDrafts = beatProjects.length + musicProjects.length;

  const menuItems = [
    {
      id: 'beatmaker',
      icon: '🥁',
      title: 'MAKE A BEAT',
      subtitle: 'Launch the Beat Sequencer',
      description: 'Create rhythms with our powerful grid-based beat maker. Layer drums, bass, and more.',
      color: 'from-red-900/40 to-red-950/60',
      borderColor: 'border-red-800/40',
      glowColor: 'rgba(220,20,60,0.4)',
      accent: '#dc143c',
      action: () => onNavigate('beatmaker'),
    },
    {
      id: 'instrucomposer',
      icon: '🎹',
      title: 'INSTRUCOMPOSER',
      subtitle: 'Compose Instrumental Music',
      description: 'Craft melodies and harmonies with our piano roll & grid editor. Multiple instruments, FX, and random generation.',
      color: 'from-cyan-900/40 to-cyan-950/60',
      borderColor: 'border-cyan-800/40',
      glowColor: 'rgba(0,229,255,0.35)',
      accent: '#00e5ff',
      action: () => onNavigate('instrucomposer'),
    },
    {
      id: 'drafts',
      icon: '📁',
      title: 'MY DRAFTS',
      subtitle: `${totalDrafts} Saved Project${totalDrafts !== 1 ? 's' : ''}`,
      description: 'Access all your saved beats and instrumentals. Continue where you left off.',
      color: 'from-purple-900/40 to-purple-950/60',
      borderColor: 'border-purple-800/40',
      glowColor: 'rgba(128,0,255,0.3)',
      accent: '#a855f7',
      action: () => onNavigate('drafts'),
    },
    {
      id: 'coming2',
      icon: '🎚️',
      title: 'MIXER',
      subtitle: 'Coming Soon',
      description: 'Mix your tracks with professional-grade EQ, compression, and effects.',
      color: 'from-green-900/30 to-green-950/50',
      borderColor: 'border-green-800/30',
      glowColor: 'rgba(30,200,100,0.2)',
      accent: '#22c55e',
      action: null,
    },
    {
      id: 'coming3',
      icon: '🎙️',
      title: 'VOCAL BOOTH',
      subtitle: 'Coming Soon',
      description: 'Record, layer, and process vocals directly in your browser.',
      color: 'from-yellow-900/30 to-yellow-950/50',
      borderColor: 'border-yellow-800/30',
      glowColor: 'rgba(255,180,0,0.2)',
      accent: '#eab308',
      action: null,
    },
    {
      id: 'coming4',
      icon: '📀',
      title: 'SAMPLE LIBRARY',
      subtitle: 'Coming Soon',
      description: 'Browse and use a curated library of premium samples and loops.',
      color: 'from-pink-900/30 to-pink-950/50',
      borderColor: 'border-pink-800/30',
      glowColor: 'rgba(255,50,150,0.2)',
      accent: '#ec4899',
      action: null,
    },
  ];

  return (
    <div className="min-h-screen animated-gradient grid-bg relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-900/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 -translate-x-1/2 -translate-y-1/2 bg-purple-900/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="text-center pt-12 pb-8 px-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.15}s`, height: '16px' }} />
              ))}
            </div>
            <div>
              <h1 className="font-orbitron text-4xl md:text-5xl lg:text-6xl font-black text-white glow-text tracking-wider">
                KD<span className="text-red-500">'S</span>
              </h1>
            </div>
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.15 + 0.6}s`, height: '16px' }} />
              ))}
            </div>
          </div>

          <h2 className="font-orbitron text-xl md:text-2xl lg:text-3xl font-bold text-red-400 glow-text-subtle tracking-widest mb-2">
            MUSIC PRODUCTION HUB
          </h2>
          <p className="font-orbitron text-xs md:text-sm text-red-600/70 tracking-[0.4em] mb-6">KDMPH</p>

          <div className="flex justify-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-400 text-xs font-rajdhani font-semibold tracking-wider">
              🥁 BEAT MAKER
            </span>
            <span className="px-3 py-1 rounded-full border text-xs font-rajdhani font-semibold tracking-wider" style={{ background: 'rgba(0,229,255,0.08)', borderColor: 'rgba(0,229,255,0.25)', color: '#00e5ff' }}>
              🎹 INSTRUCOMPOSER
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-900/60 border border-gray-700/40 text-gray-400 text-xs font-rajdhani font-semibold tracking-wider">
              🔥 IN BROWSER
            </span>
          </div>

          <div className="mt-6 w-48 h-px mx-auto bg-gradient-to-r from-transparent via-red-600 to-transparent" />
        </header>

        {/* Menu Grid */}
        <main className="flex-1 px-4 md:px-8 lg:px-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`home-card rounded-2xl p-6 ${item.color} ${item.borderColor} border relative overflow-hidden ${item.action ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                onClick={() => item.action?.()}
                style={item.action ? {
                  boxShadow: `0 0 0 0 ${item.glowColor}`,
                  borderColor: item.action != null ? `${item.accent}33` : undefined,
                } : {}}
              >
                {/* Glow accent top edge */}
                {item.action && (
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${item.accent}66, transparent)` }} />
                )}

                {/* Coming soon badge */}
                {!item.action && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-gray-800/80 rounded text-gray-500 text-xs font-orbitron tracking-wider">
                    SOON
                  </div>
                )}

                {/* Icon */}
                <div className="text-5xl mb-4">{item.icon}</div>

                {/* Title */}
                <h3 className="font-orbitron text-xl font-bold text-white mb-1 tracking-wider">
                  {item.title}
                </h3>
                <p className="text-sm font-semibold mb-3" style={{ color: item.action ? item.accent : '#666' }}>
                  {item.subtitle}
                </p>

                {/* Description */}
                <p className="text-gray-400 text-sm font-rajdhani leading-relaxed">
                  {item.description}
                </p>

                {/* Arrow for active items */}
                {item.action && (
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold font-rajdhani" style={{ color: item.accent }}>
                    <span>OPEN</span>
                    <span className="text-lg">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recent Projects */}
          {allRecent.length > 0 && (
            <div className="max-w-6xl mx-auto mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-900/40" />
                <h3 className="font-orbitron text-sm text-gray-500 tracking-widest">RECENT PROJECTS</h3>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-900/40" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {allRecent.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-xl p-4 border cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{
                      background: project.kind === 'beat'
                        ? 'rgba(220,20,60,0.06)'
                        : 'rgba(0,229,255,0.06)',
                      borderColor: project.kind === 'beat'
                        ? 'rgba(220,20,60,0.25)'
                        : 'rgba(0,229,255,0.25)',
                    }}
                    onClick={() => project.kind === 'beat'
                      ? onOpenProject(project.id)
                      : onOpenMusicProject(project.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{project.kind === 'beat' ? '🥁' : '🎹'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-orbitron text-xs text-white truncate">{project.name}</p>
                        <p className="text-xs" style={{ color: project.kind === 'beat' ? '#dc143c' : '#00e5ff' }}>
                          {project.bpm} BPM
                        </p>
                      </div>
                    </div>
                    {/* Kind badge */}
                    <div className="text-center">
                      <span
                        className="text-xs font-orbitron px-2 py-0.5 rounded-full"
                        style={{
                          background: project.kind === 'beat' ? 'rgba(220,20,60,0.15)' : 'rgba(0,229,255,0.15)',
                          color: project.kind === 'beat' ? '#dc143c' : '#00e5ff',
                          border: `1px solid ${project.kind === 'beat' ? 'rgba(220,20,60,0.3)' : 'rgba(0,229,255,0.3)'}`,
                        }}
                      >
                        {project.kind === 'beat' ? 'BEAT' : 'INSTRUMENTAL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-red-950/30">
          <p className="font-orbitron text-xs text-gray-700 tracking-widest">
            KD'S MUSIC PRODUCTION HUB © {new Date().getFullYear()} — KDMPH
          </p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
