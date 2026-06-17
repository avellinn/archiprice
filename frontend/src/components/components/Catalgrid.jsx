export default function Catalgrid({
  filteredProducts,
  hasCatalogueProducts,
  isLoading,
  selectedProductIds,
  formatCurrency,
  onOpenProduct,
  onToggleProduct,
}) {
  if (isLoading) {
    return (
      <section className="catalogue-product-grid catalogue-product-grid--loading">
        <div className="catalogue-loader">Chargement en cours...</div>
      </section>
    );
  }

  if (!hasCatalogueProducts) {
    return (
      <section className="catalogue-empty-state">
        <p>Aucun produit publié n'est disponible pour le moment.</p>
      </section>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <section className="catalogue-empty-state">
        <p>Aucun produit ne correspond aux filtres sélectionnés.</p>
      </section>
    );
  }

  return (
    <section className="catalogue-product-grid">
      {filteredProducts.map((product) => {
        const isSelected = selectedProductIds.includes(product.id);

        return (
          <article key={product.id} className="catalogue-product-card">
            <button
              type="button"
              className="catalogue-product-card__image-button"
              onClick={() => onOpenProduct(product.id)}
            >
              <div className="catalogue-product-photo">
                <img src={product.image || ''} alt={product.name || 'Produit'} />
                <span className="catalogue-product-photo__count">{product.images?.length || 1} photo(s)</span>
              </div>
            </button>

            <div className="catalogue-product-card__body">
              <strong>{product.shop}</strong>
              <h3>{product.name}</h3>
              <p>{product.category || 'Sans catégorie'}</p>
              <p>{formatCurrency(product.minPrice)} - {formatCurrency(product.maxPrice)}</p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onToggleProduct(product.id)}
              >
                {isSelected ? 'Retirer' : 'Ajouter'}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
