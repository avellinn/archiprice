import { useState } from 'react';
import Alert from '../Alert';
import Icon from '../Icon';

const POLICY_PAGES = [
  {
    id: 'terms',
    icon: 'ReceiptLong',
    title: "CONDITIONS GÉNÉRALES D'UTILISATION (CGU)",
    summary: 'Cadre d’utilisation de la boutique, des produits publiés et des services ArchiPrice.',
    sections: [
      {
        title: 'Utilisation de la plateforme',
        content: 'Le fournisseur utilise son espace pour créer, gérer et soumettre des produits liés à son activité commerciale.',
      },
      {
        title: 'Responsabilité des contenus',
        content: 'Les informations, prix, images et disponibilités transmis doivent être exacts, vérifiables et mis à jour régulièrement.',
      },
      {
        title: 'Validation et publication',
        content: 'ArchiPrice peut examiner, valider, refuser ou retirer une publication afin de protéger la qualité du catalogue.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: 'Info',
    title: 'POLITIQUE DE CONFIDENTIALITÉ',
    summary: 'Règles de collecte, d’utilisation et de protection des données liées au compte fournisseur.',
    sections: [
      {
        title: 'Données collectées',
        content: 'Les données de boutique, coordonnées, produits, fichiers et historiques de publication servent à opérer le service.',
      },
      {
        title: 'Confidentialité',
        content: 'Les données sensibles ne sont partagées qu’avec les rôles autorisés et selon les besoins de fonctionnement.',
      },
      {
        title: 'Sécurité',
        content: 'Les accès sont protégés par authentification et les fichiers médias sont stockés via des services sécurisés.',
      },
    ],
  },
  {
    id: 'supplier-conditions',
    icon: 'Workspaces',
    title: 'CONDITIONS FOURNISSEURS',
    summary: 'Engagements propres aux fournisseurs qui souhaitent publier leurs articles dans le catalogue.',
    sections: [
      {
        title: 'Qualité des articles',
        content: 'Chaque article doit inclure un nom clair, une description utile, un prix, une catégorie et des images conformes.',
      },
      {
        title: 'Disponibilité',
        content: 'Le fournisseur s’engage à signaler les ruptures, délais et conditions de commande dans les meilleurs délais.',
      },
      {
        title: 'Refus de publication',
        content: 'En cas de refus, une justification peut être transmise afin de permettre au fournisseur de corriger sa proposition.',
      },
    ],
  },
  {
    id: 'legal',
    icon: 'Folder',
    title: 'MENTIONS LÉGALES',
    summary: 'Informations légales relatives à la boutique et aux responsabilités de publication.',
    sections: [
      {
        title: 'Identification',
        content: 'La boutique doit renseigner une identité commerciale, une adresse de contact et des coordonnées exploitables.',
      },
      {
        title: 'Propriété des médias',
        content: 'Le fournisseur garantit disposer des droits nécessaires pour publier les images et fichiers associés aux articles.',
      },
      {
        title: 'Traçabilité',
        content: 'Les actions de publication, validation ou refus peuvent être enregistrées pour assurer le suivi opérationnel.',
      },
    ],
  },
];

export function SupplierPolicyModal({ onClose, onSave }) {
  const [activePolicyId, setActivePolicyId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const activePolicy = POLICY_PAGES.find((policy) => policy.id === activePolicyId);

  function savePolicySettings() {
    setActionMessage('Politiques sauvegardées.');
    window.setTimeout(onSave, 350);
  }

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
              {activePolicy.sections.map((section) => (
                <article key={section.title}>
                  <h3>{section.title}</h3>
                  <p>{section.content}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="supplier-policy-list">
            {POLICY_PAGES.map((policy) => (
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

        <footer className="supplier-settings-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="button" className="is-primary" onClick={savePolicySettings}>Sauvegarder</button>
        </footer>
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
