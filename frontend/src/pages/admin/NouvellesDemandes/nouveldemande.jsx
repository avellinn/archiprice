import './nouveldemande.css';
import { Badge, Icon } from '../../../components/ui';

export default function NouvelleDemandeModal({
  request,
  rejectionReason,
  onRejectionReasonChange,
  onClose,
  onApprove,
  onReject,
}) {
  if (!request) return null;

  return (
    <div className="nouvelle-demande-modal-backdrop" role="presentation">
      <section className="nouvelle-demande-modal" role="dialog" aria-modal="true" aria-labelledby="nouvelle-demande-title">
        <header className="nouvelle-demande-modal__header">
          <div className="nouvelle-demande-modal__title">
            <Icon name="Workspaces" size="sm" />
            <div>
              <span>Demande fournisseur</span>
              <h2 id="nouvelle-demande-title">{request.companyName || 'Boutique sans nom'}</h2>
            </div>
            <Badge tone="warning">En attente</Badge>
          </div>
          <button type="button" className="nouvelle-demande-modal__close" onClick={onClose} aria-label="Fermer">
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <section className="nouvelle-demande-modal__card">
          <div className="nouvelle-demande-modal__card-header">
            <h3>Profil de la demande</h3>
            <div className="nouvelle-demande-modal__actions">
              <button type="button" title="Valider" onClick={() => onApprove(request.id)}>
                <Icon name="Check" size="sm" />
              </button>
              <button type="button" className="is-danger" title="Refuser" onClick={() => onReject(request.id)}>
                <Icon name="Close" size="sm" />
              </button>
            </div>
          </div>

          <div className="nouvelle-demande-modal__owner">
            <span className="nouvelle-demande-modal__avatar">
              <Icon name="Workspaces" size="sm" />
            </span>
            <div>
              <strong>{request.companyName || 'Boutique sans nom'}</strong>
              <small>{request.email || 'Email non renseigné'} · {request.phone || 'Aucun téléphone'}</small>
            </div>
          </div>
        </section>

        <section className="nouvelle-demande-modal__card">
          <h3>Informations fournisseur</h3>
          <div className="nouvelle-demande-modal__grid">
            <article>
              <span>Nom boutique</span>
              <strong>{request.companyName || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Email</span>
              <strong>{request.email || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Téléphone</span>
              <strong>{request.phone || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Catégories</span>
              <strong>{request.categories?.length ? request.categories.join(', ') : 'Non renseignées'}</strong>
            </article>
          </div>
        </section>

        <section className="nouvelle-demande-modal__card">
          <h3>Justification de refus</h3>
          <label className="nouvelle-demande-modal__reason">
            <span>Motif envoyé au fournisseur</span>
            <textarea
              value={rejectionReason}
              onChange={(event) => onRejectionReasonChange(event.target.value)}
              placeholder="Expliquez brièvement pourquoi la demande est refusée."
              rows={5}
            />
          </label>
        </section>

        <footer className="nouvelle-demande-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" onClick={() => onReject(request.id)}>Refuser</button>
          <button type="button" onClick={() => onApprove(request.id)}>Valider</button>
        </footer>
      </section>
    </div>
  );
}
