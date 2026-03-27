import React, { useState } from 'react';
import HomePage from './components/HomePage';
import BeatMaker from './components/BeatMaker';
import DraftsPage from './components/DraftsPage';
import InstruComposer from './components/InstruComposer';
import { getProjectById } from './utils/storage';
import { getMusicProjectById } from './utils/musicStorage';
import type { BeatProject } from './types/beat';
import type { MusicProject } from './types/music';

type Page = 'home' | 'beatmaker' | 'drafts' | 'instrucomposer';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [openBeatProject, setOpenBeatProject] = useState<BeatProject | null>(null);
  const [openMusicProject, setOpenMusicProject] = useState<MusicProject | null>(null);

  const handleNavigate = (target: 'beatmaker' | 'drafts' | 'instrucomposer') => {
    if (target === 'beatmaker') setOpenBeatProject(null);
    if (target === 'instrucomposer') setOpenMusicProject(null);
    setPage(target);
  };

  const handleOpenBeatProject = (projectId: string) => {
    const project = getProjectById(projectId);
    if (project) {
      setOpenBeatProject(project);
      setPage('beatmaker');
    }
  };

  const handleOpenMusicProject = (projectId: string) => {
    const project = getMusicProjectById(projectId);
    if (project) {
      setOpenMusicProject(project);
      setPage('instrucomposer');
    }
  };

  const handleBackToHome = () => {
    setOpenBeatProject(null);
    setOpenMusicProject(null);
    setPage('home');
  };

  const handleNewBeat = () => {
    setOpenBeatProject(null);
    setPage('beatmaker');
  };

  const handleNewMusic = () => {
    setOpenMusicProject(null);
    setPage('instrucomposer');
  };

  return (
    <>
      {page === 'home' && (
        <HomePage
          onNavigate={handleNavigate}
          onOpenProject={handleOpenBeatProject}
          onOpenMusicProject={handleOpenMusicProject}
        />
      )}
      {page === 'beatmaker' && (
        <BeatMaker
          onBack={handleBackToHome}
          initialProject={openBeatProject}
        />
      )}
      {page === 'instrucomposer' && (
        <InstruComposer
          onBack={handleBackToHome}
          initialProject={openMusicProject}
        />
      )}
      {page === 'drafts' && (
        <DraftsPage
          onBack={handleBackToHome}
          onOpenProject={handleOpenBeatProject}
          onOpenMusicProject={handleOpenMusicProject}
          onNewBeat={handleNewBeat}
          onNewMusic={handleNewMusic}
        />
      )}
    </>
  );
};

export default App;
