import type { BeatProject } from '../types/beat';

const STORAGE_KEY = 'kdmph_projects';
const DRAFT_KEY = 'kdmph_current_draft';

export function saveProject(project: BeatProject): void {
  const projects = getAllProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getAllProjects(): BeatProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BeatProject[];
  } catch {
    return [];
  }
}

export function getProjectById(id: string): BeatProject | null {
  const projects = getAllProjects();
  return projects.find(p => p.id === id) || null;
}

export function deleteProject(id: string): void {
  const projects = getAllProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function saveDraft(project: BeatProject): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(project));
}

export function getDraft(): BeatProject | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BeatProject;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function generateId(): string {
  return `kdmph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
