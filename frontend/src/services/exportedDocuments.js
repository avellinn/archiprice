const EXPORTED_DOCUMENTS_KEY = 'archiprice_exported_documents';
const EXPORTED_DOCUMENTS_EVENT = 'archiprice:exported-documents-change';

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readDocuments() {
  if (!canUseBrowserStorage()) return [];

  try {
    const documents = JSON.parse(window.localStorage.getItem(EXPORTED_DOCUMENTS_KEY) || '[]');
    return Array.isArray(documents) ? documents : [];
  } catch {
    return [];
  }
}

function writeDocuments(documents) {
  if (!canUseBrowserStorage()) return;

  window.localStorage.setItem(EXPORTED_DOCUMENTS_KEY, JSON.stringify(documents));
  window.dispatchEvent(new CustomEvent(EXPORTED_DOCUMENTS_EVENT, { detail: documents }));
}

export function fetchExportedDocuments() {
  return readDocuments().sort((left, right) => new Date(right.exportedAt || 0) - new Date(left.exportedAt || 0));
}

export function addExportedDocument(document) {
  const exportedAt = new Date().toISOString();
  const nextDocument = {
    id: document.id || `export-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    exportedAt,
    ...document,
  };
  const documents = fetchExportedDocuments();
  writeDocuments([nextDocument, ...documents]);
  return nextDocument;
}

export function removeExportedDocument(id) {
  writeDocuments(fetchExportedDocuments().filter((document) => document.id !== id));
}

export function subscribeExportedDocumentsChange(callback) {
  if (typeof window === 'undefined') return () => {};

  function handleChange(event) {
    if (event.type === 'storage' && event.key !== EXPORTED_DOCUMENTS_KEY) return;
    callback(fetchExportedDocuments());
  }

  window.addEventListener(EXPORTED_DOCUMENTS_EVENT, handleChange);
  window.addEventListener('storage', handleChange);

  return () => {
    window.removeEventListener(EXPORTED_DOCUMENTS_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}
