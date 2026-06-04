import './fournisseurModal.css';
import { Badge, Icon } from '../../../components/ui';

function getSupplierName(supplier) {
  return supplier?.companyName || supplier?.name || 'Fournisseur';
}

function getSupplierContact(supplier) {
  return supplier?.contact || supplier?.email || supplier?.phone || '-';
}

export default function FournisseurModal({
  supplier,
  form,
  isCreating = false,
  onChange,
  onClose,
  onSubmit,
  onToggleStatus,
  onBlock,
  onDelete,
}) {
  if (!supplier) return null;

  const supplierStatus = supplier.status || 'Actif';
  const statusTone = supplierStatus === 'Actif' ? 'success' : supplierStatus === 'Bloqué' ? 'warning' : 'danger';

  return (
    <div className="fournisseur-modal-backdrop" role="presentation">
      <form className="fournisseur-modal" role="dialog" aria-modal="true" aria-labelledby="fournisseur-modal-title" onSubmit={onSubmit}>
        <header className="fournisseur-modal__header">
          <div className="fournisseur-modal__title">
            <Icon name="Workspaces" size="sm" />
            <div>
              <span>Fournisseur</span>
              <h2 id="fournisseur-modal-title">{isCreating ? 'Ajouter un fournisseur' : getSupplierName(supplier)}</h2>
            </div>
            <Badge tone={statusTone}>{supplierStatus}</Badge>
          </div>
          <button type="button" className="fournisseur-modal__close" onClick={onClose} aria-label="Fermer">
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <section className="fournisseur-modal__card">
          <div className="fournisseur-modal__card-header">
            <h3>Profil fournisseur</h3>
            {!isCreating && (
              <div className="fournisseur-modal__actions">
                <button type="button" title={supplierStatus === 'Actif' ? 'Désactiver' : 'Activer'} onClick={() => onToggleStatus(supplier)}>
                  <Icon name="Visibility" size="sm" />
                </button>
                <button type="button" title="Bloquer" onClick={() => onBlock(supplier)}>
                  <Icon name="VisibilityOff" size="sm" />
                </button>
                <button type="button" className="is-danger" title="Supprimer" onClick={() => onDelete(supplier.id)}>
                  <Icon name="Delete" size="sm" />
                </button>
              </div>
            )}
          </div>

          <div className="fournisseur-modal__owner">
            <span className="fournisseur-modal__avatar">
              <Icon name="Workspaces" size="sm" />
            </span>
            <div>
              <strong>{getSupplierName(supplier)}</strong>
              <small>{getSupplierContact(supplier)} · {supplier.phone || 'Aucun téléphone'}</small>
            </div>
          </div>
        </section>

        <section className="fournisseur-modal__card">
          <h3>Modifier les informations</h3>
          <div className="fournisseur-modal__form-grid">
            <label>
              <span>Nom</span>
              <input required value={form.name} onChange={(event) => onChange('name', event.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} />
            </label>
            <label>
              <span>Téléphone</span>
              <input value={form.phone} onChange={(event) => onChange('phone', event.target.value)} />
            </label>
            <label>
              <span>Région</span>
              <input value={form.region} onChange={(event) => onChange('region', event.target.value)} />
            </label>
            <label>
              <span>Statut</span>
              <select value={form.status} onChange={(event) => onChange('status', event.target.value)}>
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
                <option value="Bloqué">Bloqué</option>
                <option value="Supprimé">Supprimé</option>
              </select>
            </label>
          </div>
        </section>

        <section className="fournisseur-modal__card">
          <h3>Informations fournisseur</h3>
          <div className="fournisseur-modal__grid">
            <article>
              <span>Articles liés</span>
              <strong>{supplier.products || 0}</strong>
            </article>
            <article>
              <span>Catégories</span>
              <strong>{supplier.categories?.length ? supplier.categories.join(', ') : 'Non renseignées'}</strong>
            </article>
            <article>
              <span>Identifiant</span>
              <strong>{isCreating ? 'Création en cours' : supplier.id || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Impact du statut</span>
              <strong>{supplierStatus === 'Bloqué' ? 'Catalogue masqué et accès interdit' : supplierStatus === 'Inactif' ? 'Accès temporairement retiré' : 'Compte opérationnel'}</strong>
            </article>
          </div>
        </section>

        <footer className="fournisseur-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="submit">{isCreating ? 'Créer' : 'Sauvegarder'}</button>
        </footer>
      </form>
    </div>
  );
}
