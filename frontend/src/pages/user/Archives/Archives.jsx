import './Archives.css';
import { useEffect, useState } from 'react';
import { Alert, Button, Icon, Text } from '../../../components/ui';
import {
  fetchExportedDocuments,
  removeExportedDocument,
  subscribeExportedDocumentsChange,
} from '../../../services/exportedDocuments';
import { getStoredUserLanguage, getUserTranslations } from '../../../utils/userLanguage';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function Archives() {
  const [language, setLanguage] = useState(getStoredUserLanguage);
  const translations = getUserTranslations(language);
  const archiveText = translations.archives;
  const [documents, setDocuments] = useState(() => fetchExportedDocuments());
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState('');

  useEffect(() => subscribeExportedDocumentsChange(setDocuments), []);

  useEffect(() => {
    const syncLanguage = () => setLanguage(getStoredUserLanguage());
    window.addEventListener('archiprice:user-profile-change', syncLanguage);
    return () => window.removeEventListener('archiprice:user-profile-change', syncLanguage);
  }, []);

  function confirmDeleteDocument() {
    const documentId = pendingDeleteDocument?.id;
    if (!documentId) return;

    removeExportedDocument(documentId);
    setDocuments(fetchExportedDocuments());
    setPendingDeleteDocument(null);
    setDeleteMessage(archiveText.deleted);
  }

  function handleDocumentKeyDown(event, documentId) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    window.open(`/export-pdf/${encodeURIComponent(documentId)}`, '_blank', 'noopener,noreferrer');
  }

  function openExportedDocument(documentId) {
    window.open(`/export-pdf/${encodeURIComponent(documentId)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="workspace-page invoices-page">
      <div className="workspace-heading">
        <div>
          <h1>{archiveText.title}</h1>
        </div>
      </div>

      {documents.length === 0 ? (
        <section className="workspace-card invoices-empty">
          <Text as="strong" variant="bold" size="md">
            {archiveText.emptyTitle}
          </Text>
          <Text className="muted">
            {archiveText.emptyDescription}
          </Text>
        </section>
      ) : (
        <section className="invoices-list" aria-label="Liste des archives">
          {documents.map((document) => {
            const displayName = document.fileName || document.projectName || archiveText.title;

            return (
            <article
              key={document.id}
              className="invoices-list__item"
              role="button"
              tabIndex={0}
              onClick={() => openExportedDocument(document.id)}
              onKeyDown={(event) => handleDocumentKeyDown(event, document.id)}
            >
              <span className="invoices-list__icon" aria-hidden="true">
                <Icon name="ReceiptLong" size="sm" />
              </span>
              <div>
                <h2>{displayName}</h2>
                <p>
                  {document.projectName} · {formatDate(document.exportedAt)}
                </p>
              </div>
              <strong>{formatFCFA(document.amount)}</strong>
              <small>{archiveText.articles(document.itemCount || 0)}</small>
              <button
                type="button"
                aria-label={`Supprimer ${displayName}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDeleteDocument(document);
                }}
              >
                <Icon name="Delete" size="sm" />
              </button>
            </article>
            );
          })}
        </section>
      )}

      {deleteMessage && (
        <Alert variant="success" className="archives-delete-alert" onClose={() => setDeleteMessage('')}>
          {deleteMessage}
        </Alert>
      )}

      {pendingDeleteDocument && (
        <div className="archives-delete-modal" role="presentation">
          <section className="archives-delete-card" role="dialog" aria-modal="true" aria-labelledby="archives-delete-title">
            <Alert variant="danger" title={archiveText.deleteConfirmTitle} layout="inline">
              {archiveText.deleteConfirmBody}
            </Alert>
            <p id="archives-delete-title">{pendingDeleteDocument.fileName || pendingDeleteDocument.projectName}</p>
            <footer>
              <Button type="button" variant="outline" onClick={() => setPendingDeleteDocument(null)}>
                {archiveText.cancel}
              </Button>
              <Button type="button" variant="danger" onClick={confirmDeleteDocument}>
                {archiveText.confirm}
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
