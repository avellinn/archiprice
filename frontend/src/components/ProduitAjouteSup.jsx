import { Button, Icon } from './ui';
import './ProduitAjouteSup.css';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function getPublicationState(product, adminProductsBySupplierSource) {
  const adminProduct = adminProductsBySupplierSource.get(product.id);
  const isValidated = adminProduct?.publicationStatus === 'Validé';
  const isPending = adminProduct?.publicationStatus === 'En attente';

  return { adminProduct, isValidated, isPending };
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
      {error && <p className="auth-error">{error}</p>}
      {isLoading ? (
        <p className="muted">Chargement des produits...</p>
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
                const { isValidated, isPending } = getPublicationState(product, adminProductsBySupplierSource);

                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <span>{product.availability || 'Disponibilité non renseignée'}</span>
                    </td>
                    <td>{product.category || '-'}</td>
                    <td>{product.room || '-'}</td>
                    <td>{product.range || '-'}</td>
                    <td>{formatFCFA(product.unitPrice)}</td>
                    <td>
                      <span className="supplier-products-table__actions">
                        <Button
                          type="button"
                          size="sm"
                          variant={isPending ? 'outline' : 'primary'}
                          className={isPending ? 'supplier-action-btn supplier-action-btn--pending' : 'supplier-action-btn supplier-action-btn--publish'}
                          disabled={isValidated || isPending}
                          onClick={() => onPublish(product)}
                        >
                          {isPending ? 'En attente' : 'Publier'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="supplier-action-btn supplier-action-btn--withdraw"
                          disabled={!isValidated}
                          onClick={() => onWithdraw(product)}
                        >
                          Retirer
                        </Button>
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
