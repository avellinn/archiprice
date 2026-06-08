import { API_ROUTES } from '../constants/api';
import api from './api';
import { getCurrentStorageScope, getScopedStorageKey } from './scopedStorage';

const LOCAL_PROJECTS_KEY = 'archiprice_local_projects';

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readLocalProjects() {
  if (!canUseBrowserStorage()) return [];

  try {
    const storageScope = getCurrentStorageScope();
    const storageKey = storageScope === 'anonymous'
      ? LOCAL_PROJECTS_KEY
      : getScopedStorageKey(LOCAL_PROJECTS_KEY);
    const projects = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(projects) ? projects : [];
  } catch {
    return [];
  }
}

function writeLocalProjects(projects) {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(getScopedStorageKey(LOCAL_PROJECTS_KEY), JSON.stringify(projects));
  } catch {
    window.localStorage.removeItem(getScopedStorageKey(LOCAL_PROJECTS_KEY));
  }
}

function mergeProjects(remoteProjects = [], localProjects = []) {
  const projectsById = new Map();

  [...localProjects, ...remoteProjects].forEach((project) => {
    if (project?.id) projectsById.set(project.id, project);
  });

  return [...projectsById.values()].sort((left, right) => (
    new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0)
  ));
}

function createLocalProject(payload) {
  const now = new Date().toISOString();

  return {
    id: `local-project-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: payload.name,
    description: payload.description || '',
    clientName: payload.clientName || '',
    status: payload.status || 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export async function fetchProjects() {
  try {
    const { data } = await api.get(API_ROUTES.projects.list);
    return mergeProjects(data.projects || [], readLocalProjects());
  } catch {
    return readLocalProjects();
  }
}

export async function createProject(payload) {
  try {
    const { data } = await api.post(API_ROUTES.projects.list, payload);
    const nextProjects = mergeProjects([data.project], readLocalProjects());
    writeLocalProjects(nextProjects);
    return data.project;
  } catch {
    const project = createLocalProject(payload);
    writeLocalProjects([project, ...readLocalProjects()]);
    return project;
  }
}

export async function updateProject(id, payload) {
  const updateLocalProject = () => {
    const now = new Date().toISOString();
    const localProjects = readLocalProjects();
    const exists = localProjects.some((project) => project.id === id);
    const fallbackProject = {
      id,
      name: payload.name || 'Projet sans nom',
      description: payload.description || '',
      clientName: payload.clientName || '',
      status: payload.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };
    const nextProjects = (exists ? localProjects : [fallbackProject, ...localProjects]).map((project) => (
      project.id === id
        ? {
          ...project,
          ...payload,
          updatedAt: now,
        }
        : project
    ));
    const project = nextProjects.find((item) => item.id === id);
    writeLocalProjects(nextProjects);
    return project;
  };

  if (String(id).startsWith('local-project-')) {
    return updateLocalProject();
  }

  try {
    const { data } = await api.put(API_ROUTES.projects.detail(id), payload);
    const localProjects = readLocalProjects().map((project) => (
      project.id === id ? data.project : project
    ));
    writeLocalProjects(localProjects);
    return data.project;
  } catch {
    return updateLocalProject();
  }
}

export async function deleteProject(id) {
  const deleteLocalProject = () => {
    writeLocalProjects(readLocalProjects().filter((project) => project.id !== id));
    return { message: 'Projet supprimé' };
  };

  if (String(id).startsWith('local-project-')) {
    return deleteLocalProject();
  }

  try {
    const { data } = await api.delete(API_ROUTES.projects.detail(id));
    deleteLocalProject();
    return data;
  } catch {
    return deleteLocalProject();
  }
}

export async function downloadProjectRecapPdf(id) {
  const { data, headers } = await api.get(API_ROUTES.projects.recapPdf(id), {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });

  const disposition = headers['content-disposition'] || '';
  const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);

  return {
    blob: data,
    fileName: fileNameMatch?.[1] || 'recapitulatif.pdf',
  };
}
