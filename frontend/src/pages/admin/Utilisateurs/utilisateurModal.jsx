import './utilisateurModal.css';
import { Badge, Icon } from '../../../components/ui';

const ROLE_LABELS = {
  admin: 'Admin',
  supplier: 'Supplier',
  user: 'User',
};

function getUserRole(user) {
  if (String(user?.role || '').toLowerCase() === 'admin' || user?.type === 'Admin') return 'admin';
  if (String(user?.role || '').toLowerCase() === 'supplier' || user?.type === 'Fournisseur') return 'supplier';
  return 'user';
}

function getUserName(user) {
  return user?.name || user?.email || 'Utilisateur';
}

function getStatusTone(status) {
  if (status === 'Actif') return 'success';
  if (status === 'Bloqué') return 'warning';
  return 'danger';
}

export default function UtilisateurModal({
  user,
  form,
  isCreating = false,
  onChange,
  onClose,
  onSubmit,
  onToggleStatus,
  onBlock,
  onDelete,
}) {
  if (!user) return null;

  const userStatus = user.status || 'Actif';
  const userRole = getUserRole(user);

  return (
    <div className="admin-user-detail-backdrop" role="presentation">
      <form className="admin-user-detail admin-user-detail-modal" role="dialog" aria-modal="true" aria-labelledby="admin-user-detail-title" onSubmit={onSubmit}>
        <header className="admin-user-detail__header">
          <div className="admin-user-detail__title">
            <Icon name="Workspaces" size="sm" />
            <div>
              <span>Compte utilisateur</span>
              <h2 id="admin-user-detail-title">{isCreating ? 'Ajouter un utilisateur' : getUserName(user)}</h2>
            </div>
            <Badge tone={getStatusTone(userStatus)}>{userStatus}</Badge>
          </div>
          <button type="button" className="admin-user-detail__close" onClick={onClose} aria-label="Fermer">
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <section className="admin-user-detail__card">
          <div className="admin-user-detail__card-header">
            <h3>Profil utilisateur</h3>
            {!isCreating && (
              <div className="admin-user-detail__actions">
                <button type="button" title={userStatus === 'Actif' ? 'Désactiver' : 'Activer'} onClick={() => onToggleStatus(user)}>
                  <Icon name="Visibility" size="sm" />
                </button>
                <button type="button" title="Bloquer" onClick={() => onBlock(user)}>
                  <Icon name="VisibilityOff" size="sm" />
                </button>
                <button type="button" className="is-danger" title="Supprimer" onClick={() => onDelete(user.id)}>
                  <Icon name="Delete" size="sm" />
                </button>
              </div>
            )}
          </div>

          <div className="admin-user-detail__owner">
            <span className="admin-user-detail__avatar">
              <Icon name="Workspaces" size="sm" />
            </span>
            <div>
              <strong>{user.email || 'Email non renseigné'}</strong>
              <small>{getUserName(user)} · {user.phone || 'Aucun téléphone'}</small>
            </div>
          </div>
        </section>

        <section className="admin-user-detail__card">
          <h3>Modifier les informations</h3>
          <div className="admin-user-detail__form-grid">
            <label>
              <span>Nom</span>
              <input required value={form.name} onChange={(event) => onChange('name', event.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input required type="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} />
            </label>
            <label>
              <span>Téléphone</span>
              <input value={form.phone} onChange={(event) => onChange('phone', event.target.value)} />
            </label>
            {isCreating && (
              <label>
                <span>Rôle</span>
                <select value={form.role} onChange={(event) => onChange('role', event.target.value)}>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            )}
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

        <section className="admin-user-detail__card">
          <h3>Informations utilisateur</h3>
          <div className="admin-user-detail__grid">
            <article>
              <span>Rôle</span>
              <strong>{ROLE_LABELS[userRole] || userRole}</strong>
            </article>
            <article>
              <span>Type</span>
              <strong>{user.type || ROLE_LABELS[userRole] || '-'}</strong>
            </article>
            <article>
              <span>Simulations</span>
              <strong>{userRole === 'admin' ? '-' : user.simulations || 0}</strong>
            </article>
            <article>
              <span>Abonnement</span>
              <strong>{user.subscription || '-'}</strong>
            </article>
            <article>
              <span>Inscription</span>
              <strong>{user.inscription || 'Non renseignée'}</strong>
            </article>
            <article>
              <span>Impact du statut</span>
              <strong>{userStatus === 'Bloqué' ? 'Accès interdit et données conservées' : userStatus === 'Inactif' ? 'Accès temporairement retiré' : 'Compte opérationnel'}</strong>
            </article>
          </div>
        </section>

        <footer className="admin-user-detail__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="submit">{isCreating ? 'Créer' : 'Sauvegarder'}</button>
        </footer>
      </form>
    </div>
  );
}
