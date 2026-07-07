import { getCurrentStorageScope, getScopedStorageKey } from './scopedStorage';

const EXPORTED_DOCUMENTS_KEY = 'archiprice_exported_documents';
const EXPORTED_DOCUMENTS_EVENT = 'archiprice:exported-documents-change';

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readDocuments() {
  if (!canUseBrowserStorage()) return [];

  try {
    const storageScope = getCurrentStorageScope();
    const storageKey = storageScope === 'anonymous'
      ? EXPORTED_DOCUMENTS_KEY
      : getScopedStorageKey(EXPORTED_DOCUMENTS_KEY);
    const documents = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(documents) ? documents : [];
  } catch {
    return [];
  }
}

function writeDocuments(documents) {
  if (!canUseBrowserStorage()) return;

  window.localStorage.setItem(getScopedStorageKey(EXPORTED_DOCUMENTS_KEY), JSON.stringify(documents));
  window.dispatchEvent(new CustomEvent(EXPORTED_DOCUMENTS_EVENT, { detail: documents }));
}

export function fetchExportedDocuments() {
  return readDocuments().sort((left, right) => new Date(right.exportedAt || 0) - new Date(left.exportedAt || 0));
}

export function fetchExportedDocument(id) {
  return fetchExportedDocuments().find((document) => String(document.id) === String(id)) || null;
}

function buildArchiveFileName(projectName, suffix = 'archive') {
  const safeName = String(projectName || 'projet')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'projet';
  return `${safeName}-${suffix}.pdf`;
}

export function addExportedDocument(document) {
  const exportedAt = new Date().toISOString();
  const nextDocument = {
    id: document.id || `export-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    exportedAt,
    fileName: document.fileName || buildArchiveFileName(document.projectName, 'recapitulatif'),
    ...document,
  };
  const documents = fetchExportedDocuments();
  writeDocuments([nextDocument, ...documents]);
  return nextDocument;
}

export function upsertProjectArchive(document) {
  const documents = fetchExportedDocuments();
  const projectId = String(document.projectId || '');
  const existingIndex = projectId
    ? documents.findIndex((item) => String(item.projectId) === projectId)
    : -1;
  const exportedAt = document.exportedAt || new Date().toISOString();
  const nextDocument = {
    id: existingIndex >= 0
      ? documents[existingIndex].id
      : document.id || `export-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    exportedAt,
    fileName: document.fileName || buildArchiveFileName(document.projectName, document.status === 'Succès' ? 'recapitulatif' : 'projet'),
    ...document,
  };

  if (existingIndex >= 0) {
    const nextDocuments = [...documents];
    nextDocuments[existingIndex] = { ...documents[existingIndex], ...nextDocument };
    writeDocuments(nextDocuments);
    return nextDocuments[existingIndex];
  }

  writeDocuments([nextDocument, ...documents]);
  return nextDocument;
}

export function removeExportedDocument(id) {
  writeDocuments(fetchExportedDocuments().filter((document) => document.id !== id));
}

export function clearAllDocuments() {
  writeDocuments([]);
}

export function subscribeExportedDocumentsChange(callback) {
  if (typeof window === 'undefined') return () => {};

  function handleChange(event) {
    if (event.type === 'storage'
      && event.key !== EXPORTED_DOCUMENTS_KEY
      && event.key !== getScopedStorageKey(EXPORTED_DOCUMENTS_KEY)) return;
    callback(fetchExportedDocuments());
  }

  window.addEventListener(EXPORTED_DOCUMENTS_EVENT, handleChange);
  window.addEventListener('storage', handleChange);

  return () => {
    window.removeEventListener(EXPORTED_DOCUMENTS_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}
