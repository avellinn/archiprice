import api from './api';

const BASE = '/api/simulation-exports';

/**
 * Crée un enregistrement SimulationExport au moment du clic "Exporter PDF".
 * Représente un instantané du projet — indépendant de toute évolution future.
 */
export async function createSimulationExport(payload) {
  const { data } = await api.post(BASE, payload, { skipUnauthorizedHandler: true });
  return data.simulationExport;
}

/**
 * Retourne tous les exports de l'utilisateur connecté, triés du plus récent.
 */
export async function fetchMySimulationExports() {
  const { data } = await api.get(BASE);
  return Array.isArray(data.simulationExports) ? data.simulationExports : [];
}

/**
 * Compteur total d'exports — utilisé par le Dashboard.
 */
export async function fetchSimulationExportCount() {
  const { data } = await api.get(`${BASE}/count`);
  return Number(data.count || 0);
}

/**
 * Historique des exports pour un projet précis.
 */
export async function fetchProjectSimulationExports(projectId) {
  const { data } = await api.get(`${BASE}/project/${encodeURIComponent(projectId)}`);
  return Array.isArray(data.simulationExports) ? data.simulationExports : [];
}

/**
 * Met à jour l'URL du PDF stocké (après génération Cloudinary, etc.).
 */
export async function updateSimulationExportPdf(id, pdfUrl) {
  const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}/pdf`, { pdfUrl });
  return data.simulationExport;
}

/**
 * Supprime un export. Le projet source n'est jamais affecté.
 */
export async function deleteSimulationExport(id) {
  const { data } = await api.delete(`${BASE}/${encodeURIComponent(id)}`);
  return data;
}
