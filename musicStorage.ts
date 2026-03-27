import type { MusicProject } from '../types/music';

const MUSIC_KEY = 'kdmph_music_projects';

export function saveMusicProject(project: MusicProject): void {
  const all = getAllMusicProjects();
  const idx = all.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    all[idx] = project;
  } else {
    all.push(project);
  }
  localStorage.setItem(MUSIC_KEY, JSON.stringify(all));
}

export function getAllMusicProjects(): MusicProject[] {
  try {
    const raw = localStorage.getItem(MUSIC_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MusicProject[];
  } catch {
    return [];
  }
}

export function getMusicProjectById(id: string): MusicProject | null {
  return getAllMusicProjects().find(p => p.id === id) || null;
}

export function deleteMusicProject(id: string): void {
  const all = getAllMusicProjects().filter(p => p.id !== id);
  localStorage.setItem(MUSIC_KEY, JSON.stringify(all));
}

export function generateMusicId(): string {
  return `kdmph_music_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
