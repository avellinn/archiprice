import { API_ROUTES } from '../constants/api';
import api from './api';

export async function fetchProjects() {
  const { data } = await api.get(API_ROUTES.projects.list);
  return data.projects;
}

export async function createProject(payload) {
  const { data } = await api.post(API_ROUTES.projects.list, payload);
  return data.project;
}

export async function updateProject(id, payload) {
  const { data } = await api.put(API_ROUTES.projects.detail(id), payload);
  return data.project;
}

export async function deleteProject(id) {
  const { data } = await api.delete(API_ROUTES.projects.detail(id));
  return data;
}
