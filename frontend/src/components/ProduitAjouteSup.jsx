import { Alert, Button, Icon, Loader } from './ui';
import { getSaleUnit } from '../constants/productTaxonomy';
import './ProduitAjouteSup.css';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function formatProductPrice(product) {
  const unit = getSaleUnit(product.unit)?.label || product.unit || 'unité';
  return `${formatFCFA(product.priceExcludingTax ?? product.unitPrice)} / ${unit.toLocaleLowerCase('fr')}`;
}

function getPublicationState(product, adminProductsBySupplierSource) {
  const adminProduct = adminProductsBySupplierSource.get(product.id);
  const isValidated = adminProduct?.publicationStatus === 'Validé';
  const isPending = adminProduct?.publicationStatus === 'En attente';
  const isRejected = adminProduct?.publicationStatus === 'Refusé';

  return { adminProduct, isPending, isRejected, isValidated };
}

export default function ProduitAjouteSup({
  products = [],
  adminProductsBySupplierSource,
  deletingProductId = '',
  error = '',
  isLoading = false,
  onDelete,
  onEdit,
  onPublish,
  onWithdraw,
}) {
  return (
    <section className="workspace-card supplier-dashboard__products supplier-products-list">
      <h2>Produits ajoutés</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {isLoading ? (
        <Loader label="Chargement des produits..." />
      ) : (
        <table className="supplier-products-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Pièce</th>
              <th>Gamme</th>
              <th>Prix</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="6">Aucun produit ajouté.</td>
              </tr>
            ) : (
              products.map((product) => {
                const { isPending, isRejected, isValidated } = getPublicationState(product, adminProductsBySupplierSource);
                const publishLabel = isValidated
                  ? 'Publié'
                  : isPending
                    ? 'En attente'
                    : isRejected
                      ? 'Republier'
                      : 'Publier';

                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <span>{product.availability || 'Disponibilité non renseignée'}</span>
                    </td>
                    <td>{[product.category, product.subcategory].filter(Boolean).join(' › ') || '-'}</td>
                    <td>{product.room || '-'}</td>
                    <td>{product.range || '-'}</td>
                    <td>{formatProductPrice(product)}</td>
                    <td>
                      <span className="supplier-products-table__actions">
                        <button type="button" title="Modifier" onClick={() => onEdit(product)}>
                          <Icon name="Edit" size="sm" />
                        </button>
                        <button
                          type="button"
                          title="Supprimer"
                          className="is-danger"
                          disabled={deletingProductId === product.id}
                          onClick={() => onDelete(product.id)}
                        >
                          <Icon name="Delete" size="sm" />
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          className="supplier-action-btn supplier-action-btn--publish"
                          disabled={isValidated || isPending}
                          onClick={() => onPublish(product)}
                        >
                          {publishLabel}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="supplier-action-btn supplier-action-btn--withdraw"
                          disabled={!isValidated && !isPending}
                          onClick={() => onWithdraw(product)}
                        >
                          Retirer
                        </Button>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
