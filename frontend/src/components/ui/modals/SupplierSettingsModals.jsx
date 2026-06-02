import Icon from '../Icon';

const POLICY_ROWS = [
  { icon: 'Info', title: 'Politique de confidentialité', status: 'Automatisée', tone: 'success' },
  { icon: 'ReceiptLong', title: 'Conditions de service', status: 'Aucune politique définie' },
  { icon: 'Logout', title: 'Politique d’expédition', status: 'Aucune politique définie' },
  { icon: 'Workspaces', title: 'Coordonnées', status: 'Obligatoire', tone: 'warning' },
  { icon: 'Folder', title: 'Mention légale', status: 'Aucune politique définie' },
];

export function SupplierPolicyModal({ onClose, onSave }) {
  return (
    <div className="supplier-settings-modal-backdrop" role="presentation">
      <section className="supplier-settings-modal supplier-settings-modal--policy" role="dialog" aria-modal="true" aria-labelledby="supplier-policy-title">
        <header className="supplier-settings-modal__header">
          <h2 id="supplier-policy-title">Politiques</h2>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="supplier-policy-list">
          {POLICY_ROWS.map((policy) => (
            <button type="button" key={policy.title} className="supplier-policy-row">
              <Icon name={policy.icon} size="sm" />
              <strong>{policy.title}</strong>
              <span className={['supplier-policy-status', policy.tone ? `supplier-policy-status--${policy.tone}` : ''].filter(Boolean).join(' ')}>
                {policy.tone === 'success' && <i />}
                {policy.status}
              </span>
              <Icon name="ChevronRight" size="sm" />
            </button>
          ))}
        </div>

        <footer className="supplier-settings-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" className="is-primary" onClick={onSave}>Sauvegarder</button>
        </footer>
      </section>
    </div>
  );
}

export function SupplierShopModal({ shopProfile, onChange, onClose, onSave }) {
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
            <input value={shopProfile.phone === 'Aucun numéro de téléphone' ? '' : shopProfile.phone} onChange={(event) => onChange('phone', event.target.value || 'Aucun numéro de téléphone')} />
          </label>
        </div>

        <footer className="supplier-settings-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" className="is-primary" onClick={onSave}>Sauvegarder</button>
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
            <span>Nom de l’entreprise</span>
            <input value={settings.companyName} onChange={(event) => onChange('companyName', event.target.value)} />
          </label>
          <label>
            <span>Pays/région</span>
            <select value={settings.location} onChange={(event) => onChange('location', event.target.value)} disabled>
              <option value="Bénin">Bénin</option>
            </select>
            <small>Changer de pays dans <u>informations sur l’entreprise</u></small>
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

        <footer className="supplier-settings-modal__footer supplier-settings-modal__footer--sticky">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" className="is-primary" onClick={onSave} disabled={!canSave}>
            Sauvegarder
          </button>
        </footer>
      </section>
    </div>
  );
}
