import './Articles.css';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Icon, Table } from '../../../components/ui';
import { MAX_FILES_PER_UPLOAD, MAX_PRODUCT_IMAGE_SIZE } from '../../../constants/uploads';
import { createAdminId, useAdminData } from '../../../services/adminData';
import { deleteCatalogueImage, uploadCatalogueImages } from '../../../services/catalogueImages';
import { Badge } from '../PageShell';
import Addproduct from './Addproduct';

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
const MAX_PRODUCT_IMAGE_COUNT = MAX_FILES_PER_UPLOAD;

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

function getNeighborhoodSelectValue(neighborhood, options = NEIGHBORHOOD_OPTIONS) {
  return options.includes(neighborhood) ? neighborhood : CUSTOM_NEIGHBORHOOD_VALUE;
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
  const [filterValues, setFilterValues] = useState(INITIAL_FILTER_VALUES);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [rejectionProduct, setRejectionProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const products = Array.isArray(adminData.products) ? adminData.products : [];
  const taxonomyOptions = {
    category: getNames(adminData.taxonomies.categories),
    room: getNames(adminData.taxonomies.rooms),
    range: getNames(adminData.taxonomies.ranges),
    availability: getNames(adminData.taxonomies.availability),
    city: getNames(adminData.taxonomies.cities),
    neighborhood: getNames(adminData.taxonomies.neighborhoods),
  };
  const supplierOptions = getUniqueValues([
    ...adminData.suppliers.map((supplier) => supplier.name),
    ...products.map((product) => product.supplier),
  ]);
  const cityOptions = taxonomyOptions.city.length > 0 ? taxonomyOptions.city : CITY_OPTIONS;
  const neighborhoodOptions = getUniqueValues([
    ...(taxonomyOptions.neighborhood.length > 0 ? taxonomyOptions.neighborhood : NEIGHBORHOOD_OPTIONS),
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

    if (files.length > availableSlots) {
      setImageUploadError(`Maximum ${MAX_PRODUCT_IMAGE_COUNT} images par article. ${availableSlots} emplacement(s) disponible(s).`);
    }

    if (acceptedFiles.length === 0) {
      event.target.value = '';
      setImageUploadError(availableSlots === 0
        ? `Maximum ${MAX_PRODUCT_IMAGE_COUNT} images par article atteint.`
        : 'Images refusées: utilisez PNG/JPG/WebP de moins de 5 Mo.');
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
    const productImages = getProductImages(productForm);
    const rawPrice = String(productForm.price || '').trim();
    const parsedPrice = parseProductPrice(rawPrice);

    if (
      !productForm.name.trim()
      || !productForm.description.trim()
      || !rawPrice
      || parsedPrice <= 0
      || productImages.length === 0
    ) {
      setImageUploadError('Renseignez tous les champs requis et ajoutez au moins une image.');
      return;
    }

    setAdminData((currentData) => {
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
    setFilterValues(INITIAL_FILTER_VALUES);
    setIsProductModalOpen(false);
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

  function resetFilters() {
    setFilterValues(INITIAL_FILTER_VALUES);
  }

  async function confirmResetArticles() {
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
    setIsResetConfirmOpen(false);
  }

  function resetArticles() {
    setIsResetConfirmOpen(true);
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

  function renderProductImage(product) {
    const imageUrl = getImageUrl(getProductImages(product)[0]);

    return (
      <span className={`admin-product-image admin-product-image--${product.visual}`}>
        {imageUrl && (
          <img src={imageUrl} alt="" className="admin-product-image__photo" />
        )}
      </span>
    );
  }

  function renderProductActions(product) {
    if (product.publicationStatus === 'En attente') {
      return (
        <span className="admin-products-actions admin-products-actions--review">
          <Button
            type="button"
            size="sm"
            variant="success"
            onClick={(event) => {
              event.stopPropagation();
              approveSupplierPublication(product.id);
            }}
          >
            Valider
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={(event) => {
              event.stopPropagation();
              openRejectSupplierPublication(product);
            }}
          >
            Refuser
          </Button>
        </span>
      );
    }

    return (
      <span className="admin-products-actions">
        <button
          type="button"
          aria-label="Modifier"
          onClick={(event) => {
            event.stopPropagation();
            openProductModal(product);
          }}
        >
          <Icon name="Edit" size="sm" />
        </button>
        <button
          type="button"
          aria-label="Supprimer"
          className="is-danger"
          onClick={(event) => {
            event.stopPropagation();
            deleteProduct(product.id);
          }}
        >
          <Icon name="Delete" size="sm" />
        </button>
      </span>
    );
  }

  const productColumns = [
    {
      key: 'image',
      label: 'Image',
      render: (_value, product) => renderProductImage(product),
    },
    {
      key: 'name',
      label: "Nom de l'article",
      render: (name) => name || 'Article sans nom',
    },
    {
      key: 'price',
      label: 'Prix HT',
      render: (price) => formatProductPrice(price),
    },
    { key: 'vat', label: 'TVA' },
    { key: 'category', label: 'Catégorie' },
    {
      key: 'availability',
      label: 'Disponibilité',
      render: (availability, product) => (
        <span className="admin-products-badges">
          <Badge tone={getAvailabilityTone(availability)}>{availability}</Badge>
          {product.publicationStatus === 'En attente' && (
            <Badge tone="warning">En attente</Badge>
          )}
        </span>
      ),
    },
    { key: 'supplier', label: 'Fournisseur' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, product) => renderProductActions(product),
    },
  ];

  return (
    <div className="admin-products-page">
      

      <header className="admin-products-header">
        
        <div className="admin-products-toolbar">
          

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

      {isResetConfirmOpen && (
        <Alert
          variant="warning"
          title="Réinitialiser les articles"
          className="admin-products-confirm-alert"
          onClose={() => setIsResetConfirmOpen(false)}
        >
          <span>Supprimer tous les articles du catalogue ? Cette action est irréversible.</span>
          <span className="admin-products-confirm-alert__actions">
            <button type="button" onClick={() => setIsResetConfirmOpen(false)}>Annuler</button>
            <button type="button" onClick={confirmResetArticles}>Supprimer</button>
          </span>
        </Alert>
      )}

      <div className="admin-products-content">
     

        <Table
          className="admin-products-list"
          columns={productColumns}
          data={filteredProducts}
          getRowId={(product, index) => product.id || `${product.name || 'product'}-${index}`}
          onRowClick={openProductModal}
          emptyLabel="Aucun article disponible."
        />
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
        <Addproduct
          productForm={productForm}
          taxonomyOptions={taxonomyOptions}
          supplierOptions={supplierOptions}
          cityOptions={cityOptions}
          neighborhoodOptions={neighborhoodOptions}
          customNeighborhoodValue={CUSTOM_NEIGHBORHOOD_VALUE}
          maxImageCount={MAX_PRODUCT_IMAGE_COUNT}
          isImageUploading={isImageUploading}
          imageUploadError={imageUploadError}
          onClose={() => setIsProductModalOpen(false)}
          onSave={saveProduct}
          onUpdateField={updateProductForm}
          onImageUpload={handleProductImageUpload}
          onRemoveImage={removeProductImage}
          getNeighborhoodSelectValue={getNeighborhoodSelectValue}
          getProductImages={getProductImages}
          getImageUrl={getImageUrl}
        />
      )}
    </div>
  );
}
