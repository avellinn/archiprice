import './modalBoutique.css';
import '../pages/admin/Fournisseurs/fournisseurModal.css';
import { useState } from 'react';
import { Badge, Icon } from './ui';
import ModalSupport from './modalsupport';

function formatSupplierZone(supplier) {
  return supplier.region || supplier.zone || supplier.city || 'Zone non renseignée';
}

function formatSupplierName(supplier) {
  return supplier.companyName || supplier.name || supplier.shopName || 'Boutique sans nom';
}



export default function ModalBoutique({
  isOpen,
  shops = [],
  selectedShopName = '',
  simulation,
  onClose,
  onSelectShop,
}) {
  const [detailShop, setDetailShop] = useState(null);
  const [demandShop, setDemandShop] = useState(null);

  if (!isOpen) return null;

  function closeModal() {
    setDetailShop(null);
    setDemandShop(null);
    onClose?.();
  }

  const activeShops = shops
    .filter((shop) => shop.isRecommended)
    .filter((shop) => String(shop.status || 'Actif').toLowerCase() !== 'inactif')
    .filter((shop) => formatSupplierName(shop) !== 'Boutique sans nom');
  const selectedShop = activeShops.find((shop) => formatSupplierName(shop) === selectedShopName) || activeShops[0];
  const visibleDetailShop = detailShop && activeShops.some((shop) => (
    (shop.id && shop.id === detailShop.id)
    || formatSupplierName(shop) === formatSupplierName(detailShop)
  ))
    ? detailShop
    : null;

  if (visibleDetailShop) {
    const shopStatus = visibleDetailShop.status || 'Actif';
    const statusTone = shopStatus === 'Actif' ? 'success' : shopStatus === 'Bloqué' ? 'warning' : 'danger';

    return (
      <div className="fournisseur-modal-backdrop" role="presentation">
        <section className="fournisseur-modal" role="dialog" aria-modal="true" aria-labelledby="modal-boutique-detail-title">
          <header className="fournisseur-modal__header">
            <div className="fournisseur-modal__title">
              <Icon name="Workspaces" size="sm" />
              <div>
                <span>Boutique recommandée</span>
                <h2 id="modal-boutique-detail-title">{formatSupplierName(visibleDetailShop)}</h2>
              </div>
              <Badge tone={statusTone}>{shopStatus}</Badge>
            </div>
            <button type="button" className="fournisseur-modal__close" onClick={() => setDetailShop(null)} aria-label="Retour">
              <Icon name="ArrowLeft" size="sm" />
            </button>
          </header>

          <section className="fournisseur-modal__card">
            <div className="fournisseur-modal__owner">
              <span className="fournisseur-modal__avatar">
                <Icon name="Workspaces" size="sm" />
              </span>
              <div>
                <strong>{formatSupplierName(visibleDetailShop)}</strong>
                <small>{visibleDetailShop.contact || visibleDetailShop.email || 'Contact non renseigné'} · {visibleDetailShop.phone || 'Aucun téléphone'}</small>
              </div>
            </div>
          </section>

          <section className="fournisseur-modal__card">
            <h3>Informations boutique</h3>
            <div className="fournisseur-modal__grid">
              <article>
                <span>Zone</span>
                <strong>{formatSupplierZone(visibleDetailShop)}</strong>
              </article>
              
             
              <article>
                <span>Simulation achat</span>
                <strong>{simulation?.totalLabel || '0 FCFA'}</strong>
              </article>
            </div>
          </section>

          <section className="fournisseur-modal__card">
            <h3>Votre sélection</h3>
            <div className="fournisseur-modal__grid">
              <article>
                <span>Articles</span>
                <strong>{simulation?.count || 0}</strong>
              </article>
              <article>
                <span>Catégories projet</span>
                <strong>{simulation?.categories?.length ? simulation.categories.join(', ') : 'Non renseigné'}</strong>
              </article>
            </div>
          </section>

          <footer className="fournisseur-modal__footer">
            <button type="button" onClick={closeModal}>Fermer</button>
            <button type="button" onClick={() => setDemandShop(visibleDetailShop)}>
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
                closeModal();
              }}
            />
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="modal-boutique__backdrop" role="presentation">
      <section className="modal-boutique" role="dialog" aria-modal="true" aria-labelledby="modal-boutique-title">
        <header className="modal-boutique__header">
          <div>
            <span className="modal-boutique__eyebrow">Boutiques recommandées</span>
            <h2 id="modal-boutique-title">Où acheter</h2>
          </div>
          <button type="button" className="modal-boutique__close" aria-label="Fermer" onClick={closeModal}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="modal-boutique__summary">
          <div>
            <span>Simulation achat</span>
            <strong>{simulation?.totalLabel || '0 FCFA'}</strong>
          </div>
          <div>
            <span>Articles</span>
            <strong>{simulation?.count || 0}</strong>
          </div>
          <div>
            <span>Catégories</span>
            <strong>{simulation?.categories?.length ? simulation.categories.join(', ') : 'Non renseigné'}</strong>
          </div>
        </div>

        {activeShops.length === 0 ? (
          <p className="modal-boutique__empty">Aucune boutique disponible pour le moment.</p>
        ) : (
          <div className="modal-boutique__grid" role="listbox" aria-label="Liste des boutiques recommandées">
            {activeShops.map((shop, index) => {
              const shopName = formatSupplierName(shop);
              const isSelected = selectedShop && formatSupplierName(selectedShop) === shopName;

              return (
                <button
                  type="button"
                  key={`${shop.id || shopName}-${index}`}
                  className={[
                    'modal-boutique__shop',
                    isSelected ? 'modal-boutique__shop--selected' : '',
                  ].filter(Boolean).join(' ')}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => setDetailShop(shop)}
                >
                  <span className="modal-boutique__shop-icon" aria-hidden="true">
                    <Icon name="Workspaces" size="sm" />
                  </span>
                  <span>
                    <strong>{shopName}</strong>
                    <small>{formatSupplierZone(shop)}</small>
                    
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
