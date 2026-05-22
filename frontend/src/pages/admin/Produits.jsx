import { useState } from 'react';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { createAdminId, useAdminData } from '../../services/adminData';
import { Badge } from './PageShell';

const EMPTY_PRODUCT_FORM = {
  id: '',
  visual: 'sofa',
  name: 'Canapé 3 places Oslo',
  description: 'Canapé moderne 3 places, tissu gris clair, pieds en bois.',
  price: '890,00 €',
  vat: '20%',
  category: 'Mobilier',
  room: 'Salon',
  range: 'Confort',
  supplier: 'Meubles Plus',
  availability: 'Disponible',
  city: 'Cotonou',
};

function getAvailabilityTone(value) {
  if (value === 'Rupture') return 'danger';
  if (value === 'Sur commande') return 'warning';
  return 'success';
}

export default function Produits() {
  const [adminData, setAdminData] = useAdminData();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState({
    category: 'Toutes',
    room: 'Toutes',
    range: 'Toutes',
    supplier: 'Tous',
    city: 'Toutes',
    availability: 'Toutes',
  });
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);

  const products = adminData.products;
  const filters = [
    { key: 'category', label: 'Catégorie', allLabel: `Toutes (${products.length})`, options: [...new Set(products.map((product) => product.category))] },
    { key: 'room', label: 'Pièce', allLabel: 'Toutes', options: [...new Set(products.map((product) => product.room))] },
    { key: 'range', label: 'Gamme', allLabel: 'Toutes', options: [...new Set(products.map((product) => product.range))] },
    { key: 'supplier', label: 'Fournisseur', allLabel: 'Tous', options: [...new Set(products.map((product) => product.supplier))] },
    { key: 'city', label: 'Ville', allLabel: 'Toutes', options: [...new Set(products.map((product) => product.city))] },
    { key: 'availability', label: 'Disponibilité', allLabel: 'Toutes', options: [...new Set(products.map((product) => product.availability))] },
  ];

  const filteredProducts = products.filter((product) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query
      || product.name.toLowerCase().includes(query)
      || product.supplier.toLowerCase().includes(query)
      || product.category.toLowerCase().includes(query);
    const matchesFilters = filters.every((filter) => {
      const value = filterValues[filter.key];
      return value === filter.allLabel || value === 'Toutes' || value === 'Tous' || value === product[filter.key];
    });

    return matchesSearch && matchesFilters;
  });

  function openProductModal(product = EMPTY_PRODUCT_FORM) {
    setProductForm(product);
    setIsProductModalOpen(true);
  }

  function updateProductForm(field, value) {
    setProductForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function saveProduct() {
    setAdminData((currentData) => {
      const nextProduct = {
        ...productForm,
        id: productForm.id || createAdminId('prod'),
        price: productForm.price.includes('€') ? productForm.price : `${productForm.price} €`,
      };
      const exists = currentData.products.some((product) => product.id === nextProduct.id);

      return {
        ...currentData,
        products: exists
          ? currentData.products.map((product) => (product.id === nextProduct.id ? nextProduct : product))
          : [nextProduct, ...currentData.products],
      };
    });
    setIsProductModalOpen(false);
  }

  function duplicateProduct(product) {
    setAdminData((currentData) => ({
      ...currentData,
      products: [
        { ...product, id: createAdminId('prod'), name: `${product.name} copie` },
        ...currentData.products,
      ],
    }));
  }

  function deleteProduct(productId) {
    setAdminData((currentData) => ({
      ...currentData,
      products: currentData.products.filter((product) => product.id !== productId),
    }));
  }

  return (
    <div className="admin-products-page">
      <nav className="admin-products-breadcrumb" aria-label="Fil d'ariane">
        <span>Catalogue</span>
        <Icon name="ChevronRight" size="sm" />
        <strong>Produits</strong>
      </nav>

      <header className="admin-products-header">
        <h1>Produits</h1>
        <div className="admin-products-toolbar">
          <label className="admin-products-search">
            <span className="visually-hidden">Rechercher un produit</span>
            <Icon name="Search" size="sm" />
            <input
              type="search"
              placeholder="Rechercher un produit, une référence..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <Button type="button" variant="outline" size="sm" icon={<Icon name="Upload" size="sm" />}>
            Importer CSV
          </Button>
          <Button type="button" variant="outline" size="sm" icon={<Icon name="Download" size="sm" />}>
            Exporter CSV
          </Button>
          <Button
            type="button"
            size="sm"
            icon={<Icon name="Add" size="sm" />}
            className="admin-products-add"
            onClick={() => openProductModal()}
          >
            Ajouter un produit
          </Button>
        </div>
      </header>

      <div className="admin-products-content">
        <aside className="admin-products-filters">
          <div className="admin-products-filters__header">
            <h2>Filtres</h2>
            <button type="button">Réinitialiser les filtres</button>
          </div>

          {filters.map((filter) => (
            <label key={filter.label} className="admin-products-filter">
              <span>{filter.label}</span>
              <select
                value={filterValues[filter.key]}
                onChange={(event) => setFilterValues((currentValues) => ({
                  ...currentValues,
                  [filter.key]: event.target.value,
                }))}
              >
                {[filter.allLabel, ...filter.options].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}

          <div className="admin-products-filter">
            <span>Prix HT</span>
            <div className="admin-products-price">
              <input type="text" inputMode="numeric" placeholder="Min" />
              <input type="text" inputMode="numeric" placeholder="Max" />
            </div>
          </div>

          <Button type="button" fullWidth className="admin-products-apply">
            Appliquer
          </Button>
        </aside>

        <section className="admin-products-table-card" aria-label="Liste des produits">
          <div className="admin-products-table-wrap">
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Nom du produit</th>
                  <th>Prix HT</th>
                  <th>TVA</th>
                  <th>Catégorie</th>
                  <th>Disponibilité</th>
                  <th>Fournisseur</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <span className={`admin-product-image admin-product-image--${product.visual}`} />
                    </td>
                    <td>{product.name}</td>
                    <td>{product.price}</td>
                    <td>{product.vat}</td>
                    <td>{product.category}</td>
                    <td>
                      <Badge tone={getAvailabilityTone(product.availability)}>{product.availability}</Badge>
                    </td>
                    <td>{product.supplier}</td>
                    <td>
                      <span className="admin-products-actions">
                        <button type="button" aria-label="Modifier" onClick={() => openProductModal(product)}>
                          <Icon name="Edit" size="sm" />
                        </button>
                        <button type="button" aria-label="Dupliquer" onClick={() => duplicateProduct(product)}>
                          <Icon name="Copy" size="sm" />
                        </button>
                        <button type="button" aria-label="Supprimer" className="is-danger" onClick={() => deleteProduct(product.id)}>
                          <Icon name="Delete" size="sm" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="admin-products-pagination">
            <div className="admin-products-pages">
              <button type="button" aria-label="Page précédente">
                <Icon name="ChevronLeft" size="sm" />
              </button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <span>...</span>
              <button type="button">7</button>
              <button type="button" aria-label="Page suivante">
                <Icon name="ChevronRight" size="sm" />
              </button>
            </div>

            <div className="admin-products-count">
              <select defaultValue="20">
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
              <strong>Total {filteredProducts.length} produits</strong>
            </div>
          </footer>
        </section>
      </div>

      {isProductModalOpen && (
        <div className="admin-product-modal-backdrop" role="presentation">
          <section
            className="admin-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <header className="admin-product-modal__header">
              <h2 id="product-modal-title">Ajouter / Modifier un produit</h2>
              <button
                type="button"
                aria-label="Fermer"
                className="admin-product-modal__close"
                onClick={() => setIsProductModalOpen(false)}
              >
                <Icon name="Close" />
              </button>
            </header>

            <form className="admin-product-form">
              <div className="admin-product-form__column">
                <label className="admin-product-field">
                  <span>Nom du produit <b>*</b></span>
                  <input type="text" value={productForm.name} onChange={(event) => updateProductForm('name', event.target.value)} />
                </label>

                <label className="admin-product-field">
                  <span>Description</span>
                  <textarea value={productForm.description} onChange={(event) => updateProductForm('description', event.target.value)} />
                </label>

                <div className="admin-product-form__row">
                  <label className="admin-product-field">
                    <span>Prix HT <b>*</b></span>
                    <input type="text" inputMode="decimal" value={productForm.price} onChange={(event) => updateProductForm('price', event.target.value)} />
                  </label>
                  <label className="admin-product-field">
                    <span>TVA <b>*</b></span>
                    <select value={productForm.vat} onChange={(event) => updateProductForm('vat', event.target.value)}>
                      <option>20%</option>
                      <option>10%</option>
                      <option>5%</option>
                    </select>
                  </label>
                </div>

                <label className="admin-product-field">
                  <span>Catégorie <b>*</b></span>
                  <select value={productForm.category} onChange={(event) => updateProductForm('category', event.target.value)}>
                    <option>Mobilier</option>
                    <option>Luminaire</option>
                    <option>Revêtement</option>
                    <option>Sanitaire</option>
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Pièce <b>*</b></span>
                  <select value={productForm.room} onChange={(event) => updateProductForm('room', event.target.value)}>
                    <option>Salon</option>
                    <option>Chambre</option>
                    <option>Bureau</option>
                    <option>Douche</option>
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Gamme</span>
                  <select value={productForm.range} onChange={(event) => updateProductForm('range', event.target.value)}>
                    <option>Essentiel</option>
                    <option>Confort</option>
                    <option>Premium</option>
                  </select>
                </label>
              </div>

              <div className="admin-product-form__column">
                <label className="admin-product-field">
                  <span>Fournisseur <b>*</b></span>
                  <select value={productForm.supplier} onChange={(event) => updateProductForm('supplier', event.target.value)}>
                    <option>Meubles Plus</option>
                    <option>Design House</option>
                    <option>Lumière & Co</option>
                    <option>BatiPro</option>
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Disponibilité <b>*</b></span>
                  <select value={productForm.availability} onChange={(event) => updateProductForm('availability', event.target.value)}>
                    <option>Disponible</option>
                    <option>Sur commande</option>
                    <option>Rupture</option>
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Ville (localisation par défaut)</span>
                  <select value={productForm.city} onChange={(event) => updateProductForm('city', event.target.value)}>
                    <option>Cotonou</option>
                    <option>Porto-Novo</option>
                    <option>Abomey-Calavi</option>
                  </select>
                </label>

                <div className="admin-product-image-field">
                  <span>Image</span>
                  <div className="admin-product-upload-grid">
                    <div className="admin-product-preview">
                      <span className="admin-product-preview__sofa" />
                    </div>
                    <label className="admin-product-upload">
                      <input type="file" accept="image/png,image/jpeg" />
                      <Icon name="Upload" />
                      <strong>Cliquez ou glissez une image</strong>
                      <small>PNG, JPG (max. 2Mo)</small>
                    </label>
                  </div>
                </div>
              </div>

              <footer className="admin-product-modal__footer">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="button" onClick={saveProduct}>
                  Enregistrer
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
