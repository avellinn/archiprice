import './adminparModal.css';
import { useState } from 'react';
import { Icon } from '../../../components/ui';

function makePolicyId() {
  return `admin-policy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const EMPTY_POLICY = {
  id: '',
  icon: 'ReceiptLong',
  title: '',
  summary: '',
  content: '',
};

export function AdminProfileModal({ adminProfile, onChange, onClose, onSave }) {
  return (
    <div className="admin-param-modal-backdrop" role="presentation">
      <section className="admin-param-modal admin-param-modal--profile" role="dialog" aria-modal="true" aria-labelledby="admin-profile-modal-title">
        <header className="admin-param-modal__titlebar">
          <Icon name="Workspaces" size="sm" />
          <Icon name="ChevronRight" size="sm" />
          <h2 id="admin-profile-modal-title">Coordonnées administrateur</h2>
        </header>

        <div className="admin-param-modal-card">
          <h3>Informations générales</h3>
          <label>
            <span>Nom complet</span>
            <input value={adminProfile.name} onChange={(event) => onChange('name', event.target.value)} />
          </label>
          <label>
            <span>Adresse e-mail</span>
            <input type="email" value={adminProfile.email} onChange={(event) => onChange('email', event.target.value)} />
          </label>
          <label>
            <span>Téléphone</span>
            <input value={adminProfile.phone || ''} onChange={(event) => onChange('phone', event.target.value)} />
          </label>
        </div>

        <div className="admin-param-modal-card">
          <h3>Contexte du compte</h3>
          <div className="admin-param-modal__grid">
            <article>
              <span>Rôle</span>
              <strong>Super Administrateur</strong>
            </article>
            <article>
              <span>Portée</span>
              <strong>Catalogue, utilisateurs, fournisseurs et simulations</strong>
            </article>
          </div>
        </div>

        <footer className="admin-param-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" className="is-primary" onClick={onSave}>Sauvegarder</button>
        </footer>
      </section>
    </div>
  );
}

export function AdminLocationModal({
  settings,
  cityOptions,
  neighborhoodOptions,
  onChange,
  onClose,
  onSave,
}) {
  const canSave = Boolean(settings.companyName.trim() || settings.address.trim() || settings.neighborhood.trim() || settings.city.trim());

  return (
    <div className="admin-param-modal-backdrop" role="presentation">
      <section className="admin-param-modal admin-param-modal--location" role="dialog" aria-modal="true" aria-labelledby="admin-location-modal-title">
        <header className="admin-param-modal__header">
          <h2 id="admin-location-modal-title">Emplacements admin</h2>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="admin-location-form">
          <label>
            <span>Nom de l'organisation</span>
            <input value={settings.companyName} onChange={(event) => onChange('companyName', event.target.value)} />
          </label>
          <label>
            <span>Pays/région</span>
            <select value={settings.location} onChange={(event) => onChange('location', event.target.value)} disabled>
              <option value="Bénin">Bénin</option>
            </select>
          </label>
          <label>
            <span>Adresse</span>
            <input value={settings.address} onChange={(event) => onChange('address', event.target.value)} placeholder="Adresse du bureau admin" />
          </label>
          <label>
            <span>Quartier</span>
            <input
              list="admin-neighborhood-options"
              value={settings.neighborhood}
              onChange={(event) => onChange('neighborhood', event.target.value)}
            />
            <datalist id="admin-neighborhood-options">
              {neighborhoodOptions.map((neighborhood) => (
                <option key={neighborhood} value={neighborhood} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Ville</span>
            <select value={settings.city} onChange={(event) => onChange('city', event.target.value)}>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
        </div>

        <footer className="admin-param-modal__footer admin-param-modal__footer--sticky">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" className="is-primary" onClick={onSave} disabled={!canSave}>
            Sauvegarder
          </button>
        </footer>
      </section>
    </div>
  );
}

export function AdminPolicyModal({ policies, onPoliciesChange, onClose }) {
  const [activePolicyId, setActivePolicyId] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const activePolicy = policies.find((policy) => policy.id === activePolicyId);

  function openCreatePolicy() {
    setActivePolicyId(null);
    setEditingPolicy({ ...EMPTY_POLICY, id: makePolicyId() });
  }

  function openEditPolicy(policy, event) {
    event.stopPropagation();
    setActivePolicyId(null);
    setEditingPolicy({ ...policy });
  }

  function deletePolicy(policyId, event) {
    event.stopPropagation();
    onPoliciesChange(policies.filter((policy) => policy.id !== policyId));
    if (activePolicyId === policyId) setActivePolicyId(null);
  }

  function updateEditingPolicy(field, value) {
    setEditingPolicy((currentPolicy) => ({
      ...currentPolicy,
      [field]: value,
    }));
  }

  function saveEditingPolicy(event) {
    event.preventDefault();
    const nextPolicy = {
      ...editingPolicy,
      title: editingPolicy.title.trim(),
      summary: editingPolicy.summary.trim(),
      content: editingPolicy.content.trim(),
    };

    if (!nextPolicy.title) return;

    const exists = policies.some((policy) => policy.id === nextPolicy.id);
    onPoliciesChange(exists
      ? policies.map((policy) => (policy.id === nextPolicy.id ? nextPolicy : policy))
      : [nextPolicy, ...policies]);
    setEditingPolicy(null);
  }

  return (
    <div className="admin-param-modal-backdrop" role="presentation">
      <section className="admin-param-modal admin-param-modal--policy" role="dialog" aria-modal="true" aria-labelledby="admin-policy-title">
        <header className="admin-param-modal__header">
          <div className="admin-policy-header-title">
            {(activePolicy || editingPolicy) && (
              <button
                type="button"
                className="admin-policy-back"
                aria-label="Retour aux politiques"
                onClick={() => {
                  setActivePolicyId(null);
                  setEditingPolicy(null);
                }}
              >
                <Icon name="ChevronLeft" size="sm" />
              </button>
            )}
            <h2 id="admin-policy-title">{editingPolicy ? 'Modifier une politique' : activePolicy?.title || 'Politiques admin'}</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        {editingPolicy ? (
          <form className="admin-policy-form" onSubmit={saveEditingPolicy}>
            <label>
              <span>Titre <b>*</b></span>
              <input value={editingPolicy.title} onChange={(event) => updateEditingPolicy('title', event.target.value)} required autoFocus />
            </label>
            <label>
              <span>Résumé</span>
              <input value={editingPolicy.summary} onChange={(event) => updateEditingPolicy('summary', event.target.value)} />
            </label>
            <label>
              <span>Contenu</span>
              <textarea rows={8} value={editingPolicy.content} onChange={(event) => updateEditingPolicy('content', event.target.value)} />
            </label>
            <div className="admin-policy-form__actions">
              <button type="button" onClick={() => setEditingPolicy(null)}>Annuler</button>
              <button type="submit">Enregistrer</button>
            </div>
          </form>
        ) : activePolicy ? (
          <div className="admin-policy-page">
            <p>{activePolicy.summary}</p>
            <article>
              <h3>{activePolicy.title}</h3>
              <p>{activePolicy.content || 'Aucun contenu renseigné.'}</p>
            </article>
          </div>
        ) : (
          <div className="admin-policy-list">
            <button type="button" className="admin-policy-add" onClick={openCreatePolicy}>
              <Icon name="Add" size="sm" />
              Ajouter une politique
            </button>
            {policies.length ? policies.map((policy) => (
              <button type="button" key={policy.id} className="admin-policy-row" onClick={() => setActivePolicyId(policy.id)}>
                <Icon name={policy.icon || 'ReceiptLong'} size="sm" />
                <span>
                  <strong>{policy.title}</strong>
                  <small>{policy.summary || 'Aucun résumé renseigné.'}</small>
                </span>
                <span className="admin-policy-row__actions" aria-label="Actions">
                  <span role="button" tabIndex={0} title="Modifier" onClick={(event) => openEditPolicy(policy, event)} onKeyDown={(event) => event.key === 'Enter' && openEditPolicy(policy, event)}>
                    <Icon name="Edit" size="sm" />
                  </span>
                  <span role="button" tabIndex={0} title="Supprimer" className="is-danger" onClick={(event) => deletePolicy(policy.id, event)} onKeyDown={(event) => event.key === 'Enter' && deletePolicy(policy.id, event)}>
                    <Icon name="Delete" size="sm" />
                  </span>
                </span>
                <Icon name="ChevronRight" size="sm" />
              </button>
            )) : (
              <p className="admin-policy-empty">Aucune politique configurée.</p>
            )}
          </div>
        )}

        
      </section>
    </div>
  );
}
