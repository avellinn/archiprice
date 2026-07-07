import './clientModal.css';
import { Alert, Icon, Loader } from '../../../components/ui';
import { getProjectStatusLabel } from '../../../utils/projectStatus';

function formatDateTime(value) {
  if (!value) return 'Non renseignée';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatFCFA(amount) {
  const amountValue = typeof amount === 'number' ? amount : Number(String(amount || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(amountValue) && amountValue > 0
    ? `${new Intl.NumberFormat('fr-FR').format(amountValue)} FCFA`
    : 'Non renseigné';
}

export default function ClientModal({
  client,
  clientDetails,
  isLoadingDetails,
  onClose,
  onDelete,
}) {
  const demandes = clientDetails?.demandes || [];
  const projects = clientDetails?.projects || [];
  const simulations = clientDetails?.simulations || [];

  function getConversationSummary(demande) {
    const lastMessage = demande?.lastMessage;

    if (!lastMessage) {
      return 'Conversation';
    }

    if (lastMessage.senderRole === 'supplier') {
      return lastMessage.readByUserAt ? 'Lu par le client' : 'En attente de lecture';
    }

    return lastMessage.readBySupplierAt ? 'Lu par vous' : 'Nouveau';
  }

  return (
    <div className="client-modal-backdrop" role="presentation">
      <section className="client-modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title">
        <header>
          <h2 id="client-modal-title">Informations du client</h2>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <section className="client-modal__card">
          <h3>Profil client</h3>
          <div className="client-modal__detail-grid">
            <article>
              <span>Nom</span>
              <strong>{client?.clientName || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Profession</span>
              <strong>{client?.clientProfession || 'Non renseignée'}</strong>
            </article>
            <article>
              <span>Email</span>
              <strong>{client?.clientEmail || 'Non renseigné'}</strong>
            </article>
            
            <article>
              <span>Projet</span>
              <strong>{client?.projectName || ''}</strong>
            </article>
           
            
          </div>
        </section>

        {isLoadingDetails ? (
          <div className="client-modal__loader">
            <Loader label="Chargement des détails du client..." />
          </div>
        ) : (
          <>
            <section className="client-modal__card">
              <h3>Conversations</h3>
              {demandes.length === 0 ? (
                <Alert variant="info">Aucune conversation enregistrée.</Alert>
              ) : (
                <ul className="client-modal__list">
                  {demandes.map((demande) => (
                    <li key={demande.id} className="client-modal__list-item">
                      <div className="client-modal__list-main">
                        <strong>Demande #{demande.id.slice(-6)}</strong>
                        <span>{getConversationSummary(demande)}</span>
                      </div>
                      {demande.lastMessage && (
                        <small>
                          {demande.lastMessage.senderRole === 'supplier' ? 'Vous' : 'Client'} : {demande.lastMessage.message}
                          {demande.lastMessage.createdAt && (
                            <time dateTime={demande.lastMessage.createdAt}>{formatDateTime(demande.lastMessage.createdAt)}</time>
                          )}
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

           

            
          </>
        )}

        <section className="client-modal__images">
          <h3>Images des articles choisis</h3>
          {client?.articleImages?.length ? (
            <div className="client-modal__image-links">
              {client.articleImages.map((image, index) => (
                <a
                  key={`${image.secure_url}-${index}`}
                  href={image.secure_url}
                  target="_blank"
                  rel="noreferrer"
                  title={image.name}
                >
                  Image {index + 1}
                </a>
              ))}
            </div>
          ) : (
            <Alert variant="info">Aucune image Cloudinary liée à ce client.</Alert>
          )}
        </section>

        <footer>
          <button type="button" className="client-modal__close" onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            className="client-modal__delete"
            onClick={() => onDelete(client)}
          >
            Supprimer
          </button>
        </footer>
      </section>
    </div>
  );
}
