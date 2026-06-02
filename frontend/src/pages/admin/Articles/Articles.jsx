import './Articles.css';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Icon } from '../../../components/ui';
import { createAdminId, useAdminData } from '../../../services/adminData';
import { deleteCatalogueImage, uploadCatalogueImages } from '../../../services/catalogueImages';
import { Badge } from '../PageShell';

const EMPTY_PRODUCT_FORM = {
  id: '',
  visual: 'sofa',
  image: '',
  images: [],
  name: '',
  description: '',
  price: '',
  vat: '20%',
  category: 'Mobilier',
  room: 'Salon',
  range: 'Confort',
  supplier: 'Meubles Plus',
  availability: 'Disponible',
  city: 'Cotonou',
  neighborhood: 'Fidjrossè',
};

const CITY_OPTIONS = ['Cotonou', 'Abomey - calavi', 'Porto-novo'];
const NEIGHBORHOOD_OPTIONS = [
  'Fidjrossè',
  'Akpakpa',
  'Ganhi',
  'Zongo',
  'Godomey',
  'akassato',
  'Glo-Djigbé',
  'Zinvié',
  'Tokpota',
  'Ouando',
  'Dowa',
  'Hounli',
];
const CUSTOM_NEIGHBORHOOD_VALUE = '__custom_neighborhood__';
const MAX_PRODUCT_IMAGE_COUNT = 10;
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;

const INITIAL_FILTER_VALUES = {
  category: 'Toutes',
  room: 'Toutes',
  range: 'Toutes',
  supplier: 'Tous',
  city: 'Toutes',
  neighborhood: 'Tous',
  availability: 'Toutes',
  priceMin: '',
  priceMax: '',
};

function getNames(items = []) {
  return items.map((item) => item.name).filter(Boolean);
}

function getUniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getSearchText(value) {
  return String(value || '').toLowerCase();
}

function getAvailabilityTone(value) {
  if (value === 'Rupture' || value === 'Non disponible') return 'danger';
  if (value === 'Sur commande') return 'warning';
  return 'success';
}

function getNeighborhoodSelectValue(neighborhood) {
  return NEIGHBORHOOD_OPTIONS.includes(neighborhood) ? neighborhood : CUSTOM_NEIGHBORHOOD_VALUE;
}

function parseProductPrice(value) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsedValue = Number(normalized);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

function formatProductPrice(value) {
  const amount = parseProductPrice(value);
  return amount > 0 ? formatFCFA(amount) : 'Non renseigné';
}

function areFiltersEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getProductImages(product) {
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : [product.image].filter(Boolean);

  return images.slice(0, MAX_PRODUCT_IMAGE_COUNT);
}

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;

  return image.secure_url || image.url || '';
}

function getImagePublicId(image) {
  return typeof image === 'object' && image ? image.public_id : '';
}

export default function Articles() {
  const [searchParams] = useSearchParams();
  const [adminData, setAdminData] = useAdminData();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftFilterValues, setDraftFilterValues] = useState(INITIAL_FILTER_VALUES);
  const [filterValues, setFilterValues] = useState(INITIAL_FILTER_VALUES);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [rejectionProduct, setRejectionProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const products = Array.isArray(adminData.products) ? adminData.products : [];
  const taxonomyOptions = {
    category: getNames(adminData.taxonomies.categories),
    room: getNames(adminData.taxonomies.rooms),
    range: getNames(adminData.taxonomies.ranges),
    availability: getNames(adminData.taxonomies.availability),
  };
  const supplierOptions = getUniqueValues([
    ...adminData.suppliers.map((supplier) => supplier.name),
    ...products.map((product) => product.supplier),
  ]);
  const cityOptions = CITY_OPTIONS;
  const neighborhoodOptions = getUniqueValues([
    ...NEIGHBORHOOD_OPTIONS,
    ...products.map((product) => product.neighborhood),
  ]);
  const filters = [
    { key: 'category', label: 'Catégorie', allLabel: 'Toutes', options: taxonomyOptions.category },
    { key: 'room', label: 'Pièce', allLabel: 'Toutes', options: taxonomyOptions.room },
    { key: 'range', label: 'Gamme', allLabel: 'Toutes', options: taxonomyOptions.range },
    { key: 'supplier', label: 'Fournisseur', allLabel: 'Tous', options: supplierOptions },
    { key: 'city', label: 'Ville', allLabel: 'Toutes', options: cityOptions },
    { key: 'neighborhood', label: 'Quartier', allLabel: 'Tous', options: neighborhoodOptions },
    { key: 'availability', label: 'Disponibilité', allLabel: 'Toutes', options: taxonomyOptions.availability },
  ];
  const isFilterDirty = !areFiltersEqual(draftFilterValues, filterValues);

  const filteredProducts = products.filter((product) => {
    const query = [searchTerm, searchParams.get('q') || ''].join(' ').trim().toLowerCase();
    const price = parseProductPrice(product.price);
    const minPrice = parseProductPrice(filterValues.priceMin);
    const maxPrice = parseProductPrice(filterValues.priceMax);
    const matchesSearch = !query
      || getSearchText(product.name).includes(query)
      || getSearchText(product.supplier).includes(query)
      || getSearchText(product.category).includes(query);
    const matchesFilters = filters.every((filter) => {
      const value = filterValues[filter.key];
      return value === filter.allLabel || value === 'Toutes' || value === 'Tous' || value === product[filter.key];
    });
    const matchesMinPrice = !filterValues.priceMin || price >= minPrice;
    const matchesMaxPrice = !filterValues.priceMax || price <= maxPrice;

    return matchesSearch && matchesFilters && matchesMinPrice && matchesMaxPrice;
  });

  function openProductModal(product = EMPTY_PRODUCT_FORM) {
    const images = getProductImages(product);

    setProductForm({
      ...product,
      image: getImageUrl(images[0]) || '',
      images,
      category: product.category || taxonomyOptions.category[0] || EMPTY_PRODUCT_FORM.category,
      room: product.room || taxonomyOptions.room[0] || EMPTY_PRODUCT_FORM.room,
      range: product.range || taxonomyOptions.range[0] || EMPTY_PRODUCT_FORM.range,
      supplier: product.supplier || supplierOptions[0] || EMPTY_PRODUCT_FORM.supplier,
      availability: product.availability || taxonomyOptions.availability[0] || EMPTY_PRODUCT_FORM.availability,
      city: cityOptions.includes(product.city) ? product.city : cityOptions[0],
      neighborhood: product.neighborhood || EMPTY_PRODUCT_FORM.neighborhood,
    });
    setImageUploadError('');
    setIsImageUploading(false);
    setIsProductModalOpen(true);
  }

  function updateProductForm(field, value) {
    setProductForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  async function handleProductImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsImageUploading(true);
    setImageUploadError('');
    const currentImages = getProductImages(productForm);
    const availableSlots = Math.max(MAX_PRODUCT_IMAGE_COUNT - currentImages.length, 0);
    const acceptedFiles = files
      .filter((file) => file.type.startsWith('image/') && file.size <= MAX_PRODUCT_IMAGE_SIZE)
      .slice(0, availableSlots);

    if (acceptedFiles.length === 0) {
      event.target.value = '';
      setImageUploadError('Images refusées: utilisez PNG/JPG/WebP de moins de 5 Mo.');
      setIsImageUploading(false);
      return;
    }

    try {
      const uploadedImages = await uploadCatalogueImages(acceptedFiles);
      const nextImages = [...currentImages, ...uploadedImages].slice(0, MAX_PRODUCT_IMAGE_COUNT);

      setProductForm((currentForm) => ({
        ...currentForm,
        image: getImageUrl(nextImages[0]) || '',
        images: nextImages,
      }));
    } catch {
      setImageUploadError("L'upload a échoué. Vérifiez que le backend tourne sur le port 5000.");
    } finally {
      event.target.value = '';
      setIsImageUploading(false);
    }
  }

  async function removeProductImage(imageIndex) {
    const image = getProductImages(productForm)[imageIndex];
    const publicId = getImagePublicId(image);

    if (publicId) {
      try {
        await deleteCatalogueImage(publicId);
      } catch {
        setImageUploadError("L'image n'a pas pu être supprimée de Cloudinary.");
        return;
      }
    }

    setProductForm((currentForm) => {
      const nextImages = getProductImages(currentForm).filter((_, index) => index !== imageIndex);

      return {
        ...currentForm,
        image: getImageUrl(nextImages[0]) || '',
        images: nextImages,
      };
    });
  }

  function saveProduct() {
    setAdminData((currentData) => {
      const productImages = getProductImages(productForm);
      const rawPrice = String(productForm.price || '').trim();
      const parsedPrice = parseProductPrice(rawPrice);
      const nextProduct = {
        ...productForm,
        id: productForm.id || createAdminId('prod'),
        price: rawPrice && parsedPrice > 0 ? formatFCFA(parsedPrice) : '',
        neighborhood: productForm.neighborhood?.trim() || EMPTY_PRODUCT_FORM.neighborhood,
        image: getImageUrl(productImages[0]) || '',
        images: productImages,
      };
      const exists = currentData.products.some((product) => product.id === nextProduct.id);

      return {
        ...currentData,
        products: exists
          ? currentData.products.map((product) => (product.id === nextProduct.id ? nextProduct : product))
          : [nextProduct, ...currentData.products],
      };
    });
    setSearchTerm('');
    setDraftFilterValues(INITIAL_FILTER_VALUES);
    setFilterValues(INITIAL_FILTER_VALUES);
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
    setSearchTerm('');
    setDraftFilterValues(INITIAL_FILTER_VALUES);
    setFilterValues(INITIAL_FILTER_VALUES);
  }

  async function deleteProduct(productId) {
    const product = products.find((item) => item.id === productId);
    const publicIds = getProductImages(product || {})
      .map(getImagePublicId)
      .filter(Boolean);

    await Promise.allSettled(publicIds.map((publicId) => deleteCatalogueImage(publicId)));
    setAdminData((currentData) => ({
      ...currentData,
      products: currentData.products.filter((product) => product.id !== productId),
    }));
  }

  function applyFilters() {
    setFilterValues(draftFilterValues);
  }

  function resetFilters() {
    setDraftFilterValues(INITIAL_FILTER_VALUES);
    setFilterValues(INITIAL_FILTER_VALUES);
  }

  async function resetArticles() {
    const shouldReset = window.confirm('Supprimer tous les articles du catalogue ? Cette action est irreversible.');
    if (!shouldReset) return;

    const publicIds = products
      .flatMap((product) => getProductImages(product).map(getImagePublicId))
      .filter(Boolean);

    await Promise.allSettled(publicIds.map((publicId) => deleteCatalogueImage(publicId)));
    setAdminData((currentData) => ({
      ...currentData,
      products: [],
    }));
    setSearchTerm('');
    resetFilters();
  }

  function approveSupplierPublication(productId) {
    setAdminData((currentData) => ({
      ...currentData,
      products: currentData.products.map((product) => (
        product.id === productId
          ? {
            ...product,
            publicationStatus: 'Validé',
            approvedAt: new Date().toISOString(),
          }
          : product
      )),
    }));
  }

  function openRejectSupplierPublication(product) {
    setRejectionProduct(product);
    setRejectionReason('');
  }

  function closeRejectSupplierPublication() {
    setRejectionProduct(null);
    setRejectionReason('');
  }

  function confirmRejectSupplierPublication() {
    if (!rejectionProduct || !rejectionReason.trim()) return;

    setAdminData((currentData) => ({
      ...currentData,
      products: currentData.products.filter((product) => product.id !== rejectionProduct.id),
      supplierPublicationNotices: [
        {
          id: createAdminId('supplier-notice'),
          supplierUserId: rejectionProduct.supplierUserId,
          productId: rejectionProduct.sourceSupplierProductId,
          productName: rejectionProduct.name,
          status: 'Refusé',
          reason: rejectionReason.trim(),
          createdAt: new Date().toISOString(),
        },
        ...(currentData.supplierPublicationNotices || []),
      ],
    }));
    closeRejectSupplierPublication();
  }

  return (
    <div className="admin-products-page">
      <nav className="admin-products-breadcrumb" aria-label="Fil d'ariane">
        <span>Catalogue</span>
        <Icon name="ChevronRight" size="sm" />
        <strong>Articles</strong>
      </nav>

      <header className="admin-products-header">
        <h1>Articles</h1>
        <div className="admin-products-toolbar">
          <label className="admin-products-search">
            <span className="visually-hidden">Rechercher un article</span>
            <Icon name="Search" size="sm" />
            <input
              type="search"
              placeholder="Rechercher un article, une référence..."
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
            variant="outline"
            size="sm"
            icon={<Icon name="History" size="sm" />}
            onClick={resetArticles}
            disabled={products.length === 0}
          >
            Réinitialiser articles
          </Button>
          <Button
            type="button"
            size="sm"
            icon={<Icon name="Add" size="sm" />}
            className="admin-products-add"
            onClick={() => openProductModal()}
          >
            Ajouter un article
          </Button>
        </div>
      </header>

      <div className="admin-products-content">
        <aside className="admin-products-filters">
          <div className="admin-products-filters__header">
            <h2>Filtres</h2>
            <button type="button" onClick={resetFilters}>Réinitialiser les filtres</button>
          </div>

          {filters.map((filter) => (
            <label key={filter.key} className="admin-products-filter">
              <span>{filter.label}</span>
              <select
                value={draftFilterValues[filter.key]}
                onChange={(event) => setDraftFilterValues((currentValues) => ({
                  ...currentValues,
                  [filter.key]: event.target.value,
                }))}
              >
                {[filter.allLabel, ...filter.options].map((option, index) => (
                  <option key={`${filter.key}-${option}-${index}`}>{option}</option>
                ))}
              </select>
            </label>
          ))}

          <div className="admin-products-filter">
            <span>Prix HT</span>
            <div className="admin-products-price">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Min"
                value={draftFilterValues.priceMin}
                onChange={(event) => setDraftFilterValues((currentValues) => ({
                  ...currentValues,
                  priceMin: event.target.value,
                }))}
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Max"
                value={draftFilterValues.priceMax}
                onChange={(event) => setDraftFilterValues((currentValues) => ({
                  ...currentValues,
                  priceMax: event.target.value,
                }))}
              />
            </div>
          </div>

          <Button
            type="button"
            fullWidth
            className="admin-products-apply"
            disabled={!isFilterDirty}
            onClick={applyFilters}
          >
            Appliquer
          </Button>
        </aside>

        <section className="admin-products-table-card" aria-label="Liste des articles">
          <div className="admin-products-table-wrap">
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Nom de l'article</th>
                  <th>Prix HT</th>
                  <th>TVA</th>
                  <th>Catégorie</th>
                  <th>Disponibilité</th>
                  <th>Fournisseur</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="admin-products-empty">
                      Aucun article disponible.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => (
                    <tr key={`${product.id || product.name}-${index}`}>
                      <td>
                        <span className={`admin-product-image admin-product-image--${product.visual}`}>
                          {getImageUrl(getProductImages(product)[0]) && (
                            <img src={getImageUrl(getProductImages(product)[0])} alt="" className="admin-product-image__photo" />
                          )}
                        </span>
                      </td>
                      <td>{product.name}</td>
                      <td>{formatProductPrice(product.price)}</td>
                      <td>{product.vat}</td>
                      <td>{product.category}</td>
                      <td>
                        <Badge tone={getAvailabilityTone(product.availability)}>{product.availability}</Badge>
                        {product.publicationStatus === 'En attente' && (
                          <Badge tone="warning">En attente</Badge>
                        )}
                      </td>
                      <td>{product.supplier}</td>
                      <td>
                        {product.publicationStatus === 'En attente' ? (
                          <span className="admin-products-actions admin-products-actions--review">
                            <Button type="button" size="sm" variant="success" onClick={() => approveSupplierPublication(product.id)}>
                              Valider
                            </Button>
                            <Button type="button" size="sm" variant="danger" onClick={() => openRejectSupplierPublication(product)}>
                              Refuser
                            </Button>
                          </span>
                        ) : (
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
                        )}
                      </td>
                    </tr>
                  ))
                )}
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
              <strong>Total {filteredProducts.length} articles</strong>
            </div>
          </footer>
        </section>
      </div>

      {rejectionProduct && (
        <div className="admin-product-modal-backdrop" role="presentation">
          <section
            className="admin-rejection-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rejection-modal-title"
          >
            <header className="admin-product-modal__header">
              <h2 id="rejection-modal-title">Justifier le refus</h2>
              <button
                type="button"
                aria-label="Fermer"
                className="admin-product-modal__close"
                onClick={closeRejectSupplierPublication}
              >
                <Icon name="Close" />
              </button>
            </header>

            <div className="admin-rejection-modal__body">
              <p>
                Article : <strong>{rejectionProduct.name}</strong>
              </p>
              <label className="admin-product-field">
                <span>Motif du refus <b>*</b></span>
                <textarea
                  value={rejectionReason}
                  placeholder="Expliquez clairement ce que le fournisseur doit corriger."
                  onChange={(event) => setRejectionReason(event.target.value)}
                />
              </label>
            </div>

            <footer className="admin-rejection-modal__footer">
              <Button type="button" variant="outline" onClick={closeRejectSupplierPublication}>
                Annuler
              </Button>
              <Button type="button" disabled={!rejectionReason.trim()} onClick={confirmRejectSupplierPublication}>
                Envoyer
              </Button>
            </footer>
          </section>
        </div>
      )}

      {isProductModalOpen && (
        <div className="admin-product-modal-backdrop" role="presentation">
          <section
            className="admin-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <header className="admin-product-modal__header">
              <h2 id="product-modal-title">Ajouter / Modifier un article</h2>
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
                  <span>Nom de l'article <b>*</b></span>
                  <input
                    type="text"
                    value={productForm.name}
                    placeholder="Nom de l'article"
                    onChange={(event) => updateProductForm('name', event.target.value)}
                  />
                </label>

                <label className="admin-product-field">
                  <span>Description</span>
                  <textarea
                    value={productForm.description}
                    placeholder="Ajouter une description"
                    onChange={(event) => updateProductForm('description', event.target.value)}
                  />
                </label>

                <div className="admin-product-form__row">
                  <label className="admin-product-field">
                    <span>Prix HT <b>*</b></span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={productForm.price}
                      placeholder="Prix en FCFA"
                      onChange={(event) => updateProductForm('price', event.target.value)}
                    />
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
                    {taxonomyOptions.category.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Pièce <b>*</b></span>
                  <select value={productForm.room} onChange={(event) => updateProductForm('room', event.target.value)}>
                    {taxonomyOptions.room.map((room) => (
                      <option key={room}>{room}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Gamme</span>
                  <select value={productForm.range} onChange={(event) => updateProductForm('range', event.target.value)}>
                    {taxonomyOptions.range.map((range) => (
                      <option key={range}>{range}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-product-form__column">
                <label className="admin-product-field">
                  <span>Fournisseur <b>*</b></span>
                  <select value={productForm.supplier} onChange={(event) => updateProductForm('supplier', event.target.value)}>
                    {supplierOptions.map((supplier) => (
                      <option key={supplier}>{supplier}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Disponibilité <b>*</b></span>
                  <select value={productForm.availability} onChange={(event) => updateProductForm('availability', event.target.value)}>
                    {taxonomyOptions.availability.map((availability) => (
                      <option key={availability}>{availability}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Ville (localisation par défaut)</span>
                  <select value={productForm.city} onChange={(event) => updateProductForm('city', event.target.value)}>
                    {cityOptions.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-product-field">
                  <span>Quartier</span>
                  <select
                    value={getNeighborhoodSelectValue(productForm.neighborhood)}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateProductForm('neighborhood', value === CUSTOM_NEIGHBORHOOD_VALUE ? '' : value);
                    }}
                  >
                    {NEIGHBORHOOD_OPTIONS.map((neighborhood) => (
                      <option key={neighborhood}>{neighborhood}</option>
                    ))}
                    <option value={CUSTOM_NEIGHBORHOOD_VALUE}>Autre quartier</option>
                  </select>
                </label>

                {getNeighborhoodSelectValue(productForm.neighborhood) === CUSTOM_NEIGHBORHOOD_VALUE && (
                  <label className="admin-product-field">
                    <span>Quartier personnalisé</span>
                    <input
                      type="text"
                      value={productForm.neighborhood}
                      placeholder="Saisir le quartier"
                      onChange={(event) => updateProductForm('neighborhood', event.target.value)}
                    />
                  </label>
                )}

                <div className="admin-product-image-field">
                  <span>Images ({getProductImages(productForm).length}/{MAX_PRODUCT_IMAGE_COUNT})</span>
                  <div className="admin-product-upload-grid">
                    <div className="admin-product-preview">
                      {getImageUrl(getProductImages(productForm)[0]) ? (
                        <img src={getImageUrl(getProductImages(productForm)[0])} alt="Aperçu de l'article" />
                      ) : (
                        <span className="admin-product-preview__sofa" />
                      )}
                    </div>
                    <label className="admin-product-upload">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        disabled={isImageUploading || getProductImages(productForm).length >= MAX_PRODUCT_IMAGE_COUNT}
                        onChange={handleProductImageUpload}
                      />
                      <Icon name="Upload" />
                      <strong>{isImageUploading ? 'Upload en cours...' : 'Cliquez ou glissez des images'}</strong>
                      <small>PNG, JPG, WebP (max. 5Mo chacune, optimisées automatiquement)</small>
                    </label>
                  </div>
                  {imageUploadError && (
                    <small className="admin-product-upload-error">{imageUploadError}</small>
                  )}
                  {getProductImages(productForm).length > 0 && (
                    <div className="admin-product-gallery">
                      {getProductImages(productForm).map((image, index) => (
                        <button
                          type="button"
                          key={`${getImageUrl(image).slice(0, 28)}-${index}`}
                          className={index === 0 ? 'is-primary' : ''}
                          onClick={() => removeProductImage(index)}
                          aria-label={`Retirer l'image ${index + 1}`}
                        >
                          <img src={getImageUrl(image)} alt="" />
                          <span>{index === 0 ? 'Principale' : `Image ${index + 1}`}</span>
                        </button>
                      ))}
                    </div>
                  )}
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
                <Button type="button" onClick={saveProduct} disabled={isImageUploading}>
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
