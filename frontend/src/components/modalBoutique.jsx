import './modalBoutique.css';
import { Icon } from './ui';

function formatSupplierZone(supplier) {
  return supplier.region || supplier.zone || supplier.city || 'Zone non renseignée';
}

function formatSupplierCategories(supplier) {
  if (Array.isArray(supplier.categories) && supplier.categories.length > 0) {
    return supplier.categories.join(', ');
  }

  return supplier.products
    ? `${supplier.products} article(s) lié(s)`
    : 'Catégories à confirmer';
}

export default function ModalBoutique({
  isOpen,
  shops = [],
  selectedShopName = '',
  simulation,
  onClose,
  onSelectShop,
}) {
  if (!isOpen) return null;

  const activeShops = shops.filter((shop) => String(shop.status || 'Actif').toLowerCase() !== 'inactif');
  const selectedShop = activeShops.find((shop) => shop.name === selectedShopName) || activeShops[0];

  return (
    <div className="modal-boutique__backdrop" role="presentation">
      <section className="modal-boutique" role="dialog" aria-modal="true" aria-labelledby="modal-boutique-title">
        <header className="modal-boutique__header">
          <div>
            <span className="modal-boutique__eyebrow">Boutiques recommandées</span>
            <h2 id="modal-boutique-title">Où acheter</h2>
          </div>
          <button type="button" className="modal-boutique__close" aria-label="Fermer" onClick={onClose}>
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
              const isSelected = selectedShop?.name === shop.name;

              return (
                <button
                  type="button"
                  key={`${shop.id || shop.name}-${index}`}
                  className={[
                    'modal-boutique__shop',
                    isSelected ? 'modal-boutique__shop--selected' : '',
                  ].filter(Boolean).join(' ')}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelectShop?.(shop)}
                >
                  <span className="modal-boutique__shop-icon" aria-hidden="true">
                    <Icon name="Workspaces" size="sm" />
                  </span>
                  <span>
                    <strong>{shop.name}</strong>
                    <small>{formatSupplierZone(shop)}</small>
                    <em>{formatSupplierCategories(shop)}</em>
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
