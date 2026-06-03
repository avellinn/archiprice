import './Invoices.css';
import { useEffect, useState } from 'react';
import { Icon, Text } from '../../../components/ui';
import {
  fetchExportedDocuments,
  removeExportedDocument,
  subscribeExportedDocumentsChange,
} from '../../../services/exportedDocuments';

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

export default function Invoices() {
  const [documents, setDocuments] = useState(() => fetchExportedDocuments());
  const [selectedDocumentId, setSelectedDocumentId] = useState('');

  useEffect(() => subscribeExportedDocumentsChange(setDocuments), []);

  function deleteDocument(documentId) {
    removeExportedDocument(documentId);
    setDocuments(fetchExportedDocuments());
    if (selectedDocumentId === documentId) setSelectedDocumentId('');
  }

  const selectedDocument = documents.find((document) => document.id === selectedDocumentId);
  function handleDocumentKeyDown(event, documentId) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setSelectedDocumentId(documentId);
  }

  return (
    <div className="workspace-page invoices-page">
      <div className="workspace-heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="workspace-eyebrow">
            Exports
          </Text>
          <h1>Estimations exportées</h1>
        </div>
      </div>

      {documents.length === 0 ? (
        <section className="workspace-card invoices-empty">
          <Text as="strong" variant="bold" size="md">
            Aucune estimation exportée disponible
          </Text>
          <Text className="muted">
            Les estimations exportées liées aux projets validés apparaîtront ici.
          </Text>
        </section>
      ) : (
        <section className="invoices-list" aria-label="Liste des estimations exportées">
          {documents.map((document) => (
            <article
              key={document.id}
              className="invoices-list__item"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedDocumentId(document.id)}
              onKeyDown={(event) => handleDocumentKeyDown(event, document.id)}
            >
              <span className="invoices-list__icon" aria-hidden="true">
                <Icon name="ReceiptLong" size="sm" />
              </span>
              <div>
                <h2>{document.fileName}</h2>
                <p>
                  {document.projectName} · {formatDate(document.exportedAt)}
                </p>
              </div>
              <strong>{formatFCFA(document.amount)}</strong>
              <small>{document.itemCount || 0} article(s)</small>
              <button
                type="button"
                aria-label={`Retirer ${document.fileName}`}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteDocument(document.id);
                }}
              >
                <Icon name="Close" size="sm" />
              </button>
            </article>
          ))}
        </section>
      )}

      {selectedDocument && (
        <div className="invoices-detail-modal" role="dialog" aria-modal="true" aria-label="Articles sélectionnés">
          <section className="invoices-detail-card">
            <header>
              <div>
                <span>{selectedDocument.fileName}</span>
                <h2>Articles sélectionnés</h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setSelectedDocumentId('')}>
                <Icon name="Close" size="sm" />
              </button>
            </header>
            <div className="invoices-detail-list">
              {(selectedDocument.items || []).length === 0 ? (
                <p>Aucun article associé à ce document.</p>
              ) : (
                selectedDocument.items.map((item, index) => (
                  <article key={`${selectedDocument.id}-${item.name}-${index}`}>
                    <a
                      className={[
                        'invoices-detail-image',
                        item.imageUrl ? 'invoices-detail-image--available' : '',
                      ].filter(Boolean).join(' ')}
                      href={item.imageUrl || undefined}
                      target={item.imageUrl ? '_blank' : undefined}
                      rel="noreferrer"
                      aria-label={item.imageUrl ? `Voir l'image de ${item.name}` : undefined}
                      onClick={(event) => {
                        if (!item.imageUrl) event.preventDefault();
                      }}
                    >
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <Icon name="Tag" size="sm" />}
                    </a>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.category}</span>
                      {item.imageUrl && (
                        <a href={item.imageUrl} target="_blank" rel="noreferrer">
                          Voir image Cloudinary
                        </a>
                      )}
                    </div>
                    <small>Qté {item.quantity || 1}</small>
                    <b>{item.total || formatFCFA(item.rawPrice)}</b>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
