import './Archives.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Icon, Text } from '../../../components/ui';
import {
  clearAllDocuments,
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
  const navigate = useNavigate();
  const [language, setLanguage] = useState(getStoredUserLanguage);
  const translations = getUserTranslations(language);
  const archiveText = translations.archives;
  const [documents, setDocuments] = useState(() => fetchExportedDocuments());
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState(null);
  const [isPendingReset, setIsPendingReset] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

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
    setActionMessage(archiveText.deleted);
  }

  function confirmResetAll() {
    clearAllDocuments();
    setDocuments([]);
    setIsPendingReset(false);
    setActionMessage(archiveText.resetDone ?? 'Archives réinitialisées.');
  }

  function openExportedDocument(documentId) {
    window.open(`/export-pdf/${encodeURIComponent(documentId)}`, '_blank', 'noopener,noreferrer');
  }

  function handleDocumentKeyDown(event, documentId) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openExportedDocument(documentId);
  }

  return (
    <div className="workspace-page invoices-page">
      {/* ── En-tête ── */}
      <div className="workspace-heading invoices-page__heading">
        <div>
          <h1>{archiveText.title}</h1>
          <p className="invoices-page__subtitle">
            Retrouvez ici tous les documents PDF exportés et enregistrés.
          </p>
        </div>
        <div className="invoices-page__actions">
          <Button
            type="button"
            variant="outline"
            icon={<Icon name="ReceiptLong" size="sm" />}
            onClick={() => navigate('/simulations-exportees')}
          >
            Simulations exportées
          </Button>
          {documents.length > 0 && (
            <Button
              type="button"
              variant="danger"
              icon={<Icon name="Delete" size="sm" />}
              onClick={() => setIsPendingReset(true)}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      

      {/* ── Alert succès ── */}
      {actionMessage && (
        <Alert
          variant="success"
          layout="inline"
          autoCloseMs={4000}
          onClose={() => setActionMessage('')}
        >
          {actionMessage}
        </Alert>
      )}

      {/* ── Liste ou état vide ── */}
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
                {/* Icône PDF */}
                <span className="invoices-list__icon invoices-list__icon--pdf" aria-hidden="true">
                  <Icon name="ReceiptLong" size="sm"/>
                </span>

                {/* Nom + date */}
                <div>
                  <h5>{displayName}</h5>
                  <p>{formatDate(document.exportedAt)}</p>
                </div>

               

                {/* Montant + articles */}
                <div className="invoices-list__amount">
                  <strong>{formatFCFA(document.amount)}</strong>
                  <small>{archiveText.articles(document.itemCount || 0)}</small>
                </div>

                {/* Boutons download + delete */}
                <div className="invoices-list__actions">
                  
                  <button
                    type="button"
                    className="invoices-list__action-btn invoices-list__action-btn--delete"
                    aria-label={`Supprimer ${displayName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDeleteDocument(document);
                    }}
                  >
                    <Icon name="Delete" size="sm" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      

      {/* ── Modale suppression individuelle ── */}
      {pendingDeleteDocument && (
        <div className="archives-delete-modal" role="presentation">
          <section
            className="archives-delete-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archives-delete-title"
          >
            <Alert variant="danger" title={archiveText.deleteConfirmTitle} layout="inline">
              {archiveText.deleteConfirmBody}
            </Alert>
            <p id="archives-delete-title">
              {pendingDeleteDocument.fileName || pendingDeleteDocument.projectName}
            </p>
            <footer>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDeleteDocument(null)}
              >
                {archiveText.cancel}
              </Button>
              <Button type="button" variant="danger" onClick={confirmDeleteDocument}>
                {archiveText.confirm}
              </Button>
            </footer>
          </section>
        </div>
      )}

      {/* ── Modale reset global ── */}
      {isPendingReset && (
        <div className="archives-delete-modal" role="presentation">
          <section
            className="archives-delete-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archives-reset-title"
          >
            <Alert variant="danger" title="Réinitialiser les archives" layout="inline">
              Cette action supprime définitivement toutes les archives de la liste. Elle est irréversible.
            </Alert>
            <p id="archives-reset-title">
              {documents.length} archive{documents.length > 1 ? 's' : ''} seront supprimée{documents.length > 1 ? 's' : ''}.
            </p>
            <footer>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPendingReset(false)}
              >
                {archiveText.cancel}
              </Button>
              <Button type="button" variant="danger" onClick={confirmResetAll}>
                Tout supprimer
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
