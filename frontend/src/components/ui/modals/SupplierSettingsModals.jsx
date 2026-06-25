import { useState } from 'react';
import Alert from '../Alert';
import Icon from '../Icon';
import { DEFAULT_POLICY_PAGES, getPolicySections, localizePolicy } from '../../../services/policies';

export function SupplierPolicyModal({ onClose, policies = DEFAULT_POLICY_PAGES, language = 'fr' }) {
  const [activePolicyId, setActivePolicyId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const visiblePolicies = (Array.isArray(policies) ? policies : DEFAULT_POLICY_PAGES)
    .map((policy) => localizePolicy(policy, language));
  const activePolicy = visiblePolicies.find((policy) => policy.id === activePolicyId);


  return (
    <div className="supplier-settings-modal-backdrop" role="presentation">
      <section className="supplier-settings-modal supplier-settings-modal--policy" role="dialog" aria-modal="true" aria-labelledby="supplier-policy-title">
        <header className="supplier-settings-modal__header">
          <div className="supplier-policy-header-title">
            {activePolicy && (
              <button type="button" className="supplier-policy-back" aria-label="Retour aux politiques" onClick={() => setActivePolicyId(null)}>
                <Icon name="ChevronLeft" size="sm" />
              </button>
            )}
            <h2 id="supplier-policy-title">{activePolicy?.title || 'Politiques'}</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        {activePolicy ? (
          <div className="supplier-policy-page">
            <p>{activePolicy.summary}</p>
            <div className="supplier-policy-page__content">
              {getPolicySections(activePolicy).map((section) => (
                <article key={section.title}>
                  <h3>{section.title}</h3>
                  <p>{section.content}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="supplier-policy-list">
            {visiblePolicies.map((policy) => (
              <button type="button" key={policy.id} className="supplier-policy-row" onClick={() => setActivePolicyId(policy.id)}>
                <Icon name={policy.icon} size="sm" />
                <span>
                  <strong>{policy.title}</strong>
                  <small>{policy.summary}</small>
                </span>
                <Icon name="ChevronRight" size="sm" />
              </button>
            ))}
          </div>
        )}

        {actionMessage && (
          <Alert variant="success" onClose={() => setActionMessage('')}>
            {actionMessage}
          </Alert>
        )}

        
      </section>
    </div>
  );
}

export function SupplierShopModal({ shopProfile, onChange, onClose, onSave }) {
  const [actionMessage, setActionMessage] = useState('');

  function saveShopSettings() {
    setActionMessage('Coordonnées sauvegardées.');
    window.setTimeout(onSave, 350);
  }

  return (
    <div className="supplier-settings-modal-backdrop" role="presentation">
      <section className="supplier-settings-modal supplier-settings-modal--shop" role="dialog" aria-modal="true" aria-labelledby="supplier-shop-modal-title">
        <header className="supplier-settings-modal__titlebar">
          <Icon name="Workspaces" size="sm" />
          <Icon name="ChevronRight" size="sm" />
          <h2 id="supplier-shop-modal-title">Coordonnées de la boutique</h2>
        </header>

        <div className="supplier-settings-modal-card">
          <h3>Nom de la boutique</h3>
          <label>
            <span>Nom de la boutique</span>
            <input value={shopProfile.name} onChange={(event) => onChange('name', event.target.value)} />
            <small>S’affiche sur votre boutique en ligne</small>
          </label>
        </div>

        <div className="supplier-settings-modal-card">
          <h3>Coordonnées de la boutique</h3>
          <label>
            <span>E-mail de la boutique</span>
            <input type="email" value={shopProfile.email} onChange={(event) => onChange('email', event.target.value)} />
            <small>Reçoit les messages concernant votre boutique. Pour l’adresse e-mail de contact, accédez aux paramètres de notification.</small>
          </label>
          <label>
            <span>Téléphone de la boutique</span>
            <input value={shopProfile.phone || ''} onChange={(event) => onChange('phone', event.target.value)} />
          </label>
        </div>

        {actionMessage && (
          <Alert variant="success" onClose={() => setActionMessage('')}>
            {actionMessage}
          </Alert>
        )}

        <footer className="supplier-settings-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" className="is-primary" onClick={saveShopSettings}>Sauvegarder</button>
        </footer>
      </section>
    </div>
  );
}

export function SupplierLocationModal({
  settings,
  cityOptions,
  neighborhoodOptions,
  onChange,
  onClose,
  onSave,
}) {
  const canSave = Boolean(settings.companyName.trim() || settings.address.trim() || settings.neighborhood.trim() || settings.city.trim());
  const [actionMessage, setActionMessage] = useState('');

  function saveLocationSettings() {
    setActionMessage('Emplacement sauvegardé.');
    window.setTimeout(onSave, 350);
  }

  return (
    <div className="supplier-settings-modal-backdrop" role="presentation">
      <section className="supplier-settings-modal supplier-settings-modal--location" role="dialog" aria-modal="true" aria-labelledby="supplier-location-modal-title">
        <header className="supplier-settings-modal__header">
          <h2 id="supplier-location-modal-title">Emplacements</h2>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="supplier-location-form">
          
          <label>
            <span>Pays/région</span>
            <select value={settings.location} onChange={(event) => onChange('location', event.target.value)} disabled>
              <option value="Bénin">Bénin</option>
            </select>
            
          </label>
          <label>
            <span>Adresse</span>
            <input value={settings.address} onChange={(event) => onChange('address', event.target.value)} placeholder="⌕" />
          </label>
          <label>
            <span>Quartier</span>
            <input
              list="supplier-neighborhood-options"
              value={settings.neighborhood}
              onChange={(event) => onChange('neighborhood', event.target.value)}
            />
            <datalist id="supplier-neighborhood-options">
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

        {actionMessage && (
          <Alert variant="success" onClose={() => setActionMessage('')}>
            {actionMessage}
          </Alert>
        )}

        <footer className="supplier-settings-modal__footer supplier-settings-modal__footer--sticky">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" className="is-primary" onClick={saveLocationSettings} disabled={!canSave}>
            Sauvegarder
          </button>
        </footer>
      </section>
    </div>
  );
}
