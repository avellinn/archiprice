import './clientModal.css';
import { Alert, Icon } from '../../../components/ui';

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

export default function ClientModal({
  client,
  onClose,
  onDelete,
}) {
  if (!client) return null;

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
              <strong>{client.clientName || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Profession</span>
              <strong>{client.clientProfession || 'Non renseignée'}</strong>
            </article>
            <article>
              <span>Email</span>
              <strong>{client.clientEmail || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Numéro</span>
              <strong>{client.clientPhone || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Projet</span>
              <strong>{client.projectName || 'Projet non renseigné'}</strong>
            </article>
            <article>
              <span>Simulation</span>
              <strong>{client.simulationTotalLabel || 'Simulation non renseignée'}</strong>
            </article>
            <article>
              <span>Date</span>
              <strong>{client.createdAtLabel || formatDateTime(client.createdAt)}</strong>
            </article>
            <article>
              <span>Statut</span>
              <strong>{client.status || 'Nouveau'}</strong>
            </article>
          </div>
        </section>

        <section className="client-modal__images">
          <h3>Images des articles choisis</h3>
          {client.articleImages?.length ? (
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
