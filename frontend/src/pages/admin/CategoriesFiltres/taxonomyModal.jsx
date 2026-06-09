import './taxonomyModal.css';
import { useState } from 'react';
import { Alert, Icon } from '../../../components/ui';

export default function TaxonomyModal({
  activeTab,
  item,
  value,
  onChange,
  onClose,
  onSubmit,
}) {
  const [actionMessage, setActionMessage] = useState('');
  const isEditing = Boolean(item);
  const title = isEditing ? `Modifier ${item.name}` : activeTab.addLabel;

  function submitTaxonomy(event) {
    setActionMessage(isEditing ? 'Modification du filtre en cours.' : 'Création du filtre en cours.');
    onSubmit(event);
  }

  return (
    <div className="taxonomy-modal-backdrop" role="presentation">
      <form className="taxonomy-modal" role="dialog" aria-modal="true" aria-labelledby="taxonomy-modal-title" onSubmit={submitTaxonomy}>
        <header className="taxonomy-modal__header">
          <div className="taxonomy-modal__title">
            <Icon name="Tag" size="sm" />
            <div>
              <span>{activeTab.label}</span>
              <h2 id="taxonomy-modal-title">{title}</h2>
            </div>
          </div>
          <button type="button" className="taxonomy-modal__close" onClick={onClose} aria-label="Fermer">
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <section className="taxonomy-modal__card">
          <h3>{isEditing ? 'Modifier le filtre' : 'Créer un filtre'}</h3>
          <div className="taxonomy-modal__form-grid">
            <label>
              <span>Nom <b>*</b></span>
              <input
                required
                autoFocus
                type="text"
                placeholder={activeTab.placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
              />
            </label>
            
          </div>
        </section>

        <section className="taxonomy-modal__card">
            
          <div className="taxonomy-modal__grid">
            <article>
              <span>Synchronisation</span>
              <strong>Disponible pour Articles, Fournisseurs, Suppliers et Catalogue user.</strong>
            </article>
            <article>
              <span>Usage actuel</span>
              <strong>{item?.count || 0} article(s)</strong>
            </article>
          </div>
        </section>

        {actionMessage && (
          <section className="taxonomy-modal__card">
            <Alert variant="success" onClose={() => setActionMessage('')}>
              {actionMessage}
            </Alert>
          </section>
        )}

        <footer className="taxonomy-modal__footer">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="submit">Sauvegarder</button>
        </footer>
      </form>
    </div>
  );
}
