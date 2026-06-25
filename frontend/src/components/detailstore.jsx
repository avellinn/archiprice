import '../pages/admin/Fournisseurs/fournisseurModal.css';
import { useState } from 'react';
import { Badge, Icon } from './ui';
import ModalSupport from './modalsupport';

function formatSupplierZone(supplier) {
  return supplier?.region || supplier?.zone || supplier?.city || 'Zone non renseignée';
}

function formatSupplierName(supplier) {
  return supplier?.companyName || supplier?.name || supplier?.shopName || 'Boutique sans nom';
}

function formatSupplierCategories(supplier) {
  const categories = supplier?.categories;

  if (Array.isArray(categories)) {
    return categories.length ? categories.join(', ') : 'Non renseignées';
  }

  return categories || supplier?.category || 'Non renseignées';
}

export default function DetailStore({
  isOpen,
  shop,
  onBack,
  onClose,
  onSelectShop,
}) {
  const [demandShop, setDemandShop] = useState(null);

  if (!isOpen || !shop) return null;

  const shopStatus = shop.status || 'Actif';
  const statusTone = shopStatus === 'Actif' ? 'success' : shopStatus === 'Bloqué' ? 'warning' : 'danger';
  const closeDetail = () => {
    setDemandShop(null);
    onClose?.();
  };

  return (
    <div className="fournisseur-modal-backdrop modal-boutique__detail-backdrop" role="presentation">
      <section className="fournisseur-modal" role="dialog" aria-modal="true" aria-labelledby="detailstore-title">
        <header className="fournisseur-modal__header">
          <div className="fournisseur-modal__title">
            <Icon name="Workspaces" size="sm" />
            <div>
              <span>Boutique recommandée</span>
              <h2 id="detailstore-title">{formatSupplierName(shop)}</h2>
            </div>
            <Badge tone={statusTone}>{shopStatus}</Badge>
          </div>
          <button
            type="button"
            className="fournisseur-modal__close"
            onClick={onBack || closeDetail}
            aria-label={onBack ? 'Retour' : 'Fermer'}
          >
            <Icon name={onBack ? 'ArrowLeft' : 'Close'} size="sm" />
          </button>
        </header>

        <section className="fournisseur-modal__card">
          <div className="fournisseur-modal__owner">
            <span className="fournisseur-modal__avatar">
              <Icon name="Workspaces" size="sm" />
            </span>
            <div>
              <strong>{formatSupplierName(shop)}</strong>
              <small>{shop.contact || shop.email || 'Contact non renseigné'} · {shop.phone || 'Aucun téléphone'}</small>
            </div>
          </div>
        </section>

        <section className="fournisseur-modal__card">
          <h3>Informations boutique</h3>
          <div className="fournisseur-modal__grid">
            <article>
              <span>Zone</span>
              <strong>{formatSupplierZone(shop)}</strong>
            </article>
            <article>
              <span>Contact</span>
              <strong>{shop.contact || shop.email || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Téléphone</span>
              <strong>{shop.phone || 'Aucun téléphone'}</strong>
            </article>
            <article>
              <span>Catégories</span>
              <strong>{formatSupplierCategories(shop)}</strong>
            </article>
          </div>
        </section>

        <footer className="fournisseur-modal__footer">
          <button type="button" onClick={closeDetail}>Fermer</button>
          <button type="button" onClick={() => setDemandShop(shop)}>
            Demande
          </button>
        </footer>

        {demandShop && (
          <ModalSupport
            title={`Demande à ${formatSupplierName(demandShop)}`}
            placeholder="Décrivez votre besoin pour cette boutique."
            onCancel={() => setDemandShop(null)}
            onSubmit={(message) => {
              onSelectShop?.(demandShop, message);
              closeDetail();
            }}
          />
        )}
      </section>
    </div>
  );
}
