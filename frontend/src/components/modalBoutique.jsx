import './modalBoutique.css';
import { useState } from 'react';
import { Icon } from './ui';
import DetailStore from './detailstore';

function formatSupplierZone(supplier) {
  return supplier.region || supplier.zone || supplier.city || 'Zone non renseignée';
}

function formatSupplierName(supplier) {
  return supplier.companyName || supplier.name || supplier.shopName || 'Boutique sans nom';
}

function isVisibleRecommendedShop(shop) {
  const status = String(shop.status || 'Actif').trim().toLowerCase();
  const hiddenStatuses = ['inactif', 'bloqué', 'bloque', 'supprimé', 'supprime'];

  return (
    shop.isRecommended
    && !hiddenStatuses.includes(status)
    && formatSupplierName(shop) !== 'Boutique sans nom'
  );
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

  if (!isOpen) return null;

  function closeModal() {
    setDetailShop(null);
    onClose?.();
  }

  const activeShops = shops.filter(isVisibleRecommendedShop);
  const selectedShop = activeShops.find((shop) => formatSupplierName(shop) === selectedShopName) || activeShops[0];
  const visibleDetailShop = detailShop && activeShops.some((shop) => (
    (shop.id && shop.id === detailShop.id)
    || formatSupplierName(shop) === formatSupplierName(detailShop)
  ))
    ? detailShop
    : null;

  if (visibleDetailShop) {
    return (
      <DetailStore
        isOpen
        shop={visibleDetailShop}
        onBack={() => setDetailShop(null)}
        onClose={closeModal}
        onSelectShop={onSelectShop}
      />
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
                  onClick={() => {
                    onSelectShop?.(shop, '');
                    setDetailShop(shop);
                  }}
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
