import './AjouterProduit.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Icon, ServerError } from '../../../components/ui';
import { MAX_FILES_PER_UPLOAD } from '../../../constants/uploads';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import {
  createSupplierProduct,
  deleteSupplierProductImage,
  fetchSupplierWorkspace,
  updateSupplierProduct,
} from '../../../services/supplier';
import { getSupplierTranslations } from '../../../utils/supplierLanguage';

const MAX_PRODUCT_FILES = MAX_FILES_PER_UPLOAD;
const INITIAL_PRODUCT_FORM = {
  name: '',
  description: '',
  category: '',
  price: '',
  availability: '',
  type: '',
  range: '',
  supplier: 'Ma boutique',
  city: '',
  neighborhood: '',
  collections: '',
  tags: '',
};

function getTaxonomyNames(items = []) {
  return items.map((item) => item.name).filter(Boolean);
}

function getSyncedOptionValue(value, options = []) {
  return options.includes(value) ? value : '';
}

function getProductImage(product) {
  const image = Array.isArray(product.images) ? product.images[0] : product.image;

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

function isServerApiError(error) {
  const status = Number(error?.response?.status || 0);
  return status >= 500 || (!error?.response && Boolean(error?.request));
}

const DESCRIPTION_TOOLS = [
  { key: 'bold', label: 'B', title: 'Gras' },
  { key: 'italic', label: 'I', title: 'Italique' },
  { key: 'underline', label: 'U', title: 'Souligner' },
  { key: 'list', label: 'Liste', title: 'Liste à puces' },
  { key: 'numbered', label: '1.', title: 'Liste numérotée' },
  { key: 'link', label: 'Lien', title: 'Lien' },
  { key: 'quote', label: 'Citation', title: 'Citation' },
  { key: 'code', label: '</>', title: 'Code' },
];

export default function AjouterProduit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const descriptionRef = useRef(null);
  const fileInputRef = useRef(null);
  const productIdToEdit = searchParams.get('edit') || '';
  const [adminData, setAdminData] = useAdminData();
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [existingImages, setExistingImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState('');
  const supplierText = getSupplierTranslations(adminData);
  const productText = supplierText.productForm;
  const savedSupplierSettings = adminData.supplierSettings || {};
  const shopName = savedSupplierSettings.shopProfile?.name
    || user?.shopName
    || user?.companyName
    || user?.storeLabel
    || user?.name
    || 'Ma boutique';
  const effectiveSupplierName = productForm.supplier && productForm.supplier !== 'Ma boutique'
    ? productForm.supplier
    : shopName;

  const taxonomyOptions = useMemo(() => ({
    categories: getTaxonomyNames(adminData.taxonomies?.categories),
    rooms: getTaxonomyNames(adminData.taxonomies?.rooms),
    ranges: getTaxonomyNames(adminData.taxonomies?.ranges),
    availability: getTaxonomyNames(adminData.taxonomies?.availability),
    cities: getTaxonomyNames(adminData.taxonomies?.cities),
    neighborhoods: getTaxonomyNames(adminData.taxonomies?.neighborhoods),
  }), [adminData.taxonomies]);
  const selectedCategory = getSyncedOptionValue(productForm.category, taxonomyOptions.categories);
  const selectedRoom = getSyncedOptionValue(productForm.type, taxonomyOptions.rooms);
  const selectedRange = getSyncedOptionValue(productForm.range, taxonomyOptions.ranges);
  const selectedAvailability = getSyncedOptionValue(productForm.availability, taxonomyOptions.availability);
  const selectedCity = getSyncedOptionValue(productForm.city, taxonomyOptions.cities);
  const selectedNeighborhood = getSyncedOptionValue(productForm.neighborhood, taxonomyOptions.neighborhoods);

  const previews = useMemo(() => files.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
  })), [files]);
  const totalImageCount = existingImages.length + files.length;
  const remainingFileSlots = Math.max(MAX_PRODUCT_FILES - totalImageCount, 0);

  function handleApiError(apiError, fallback) {
    const message = getApiErrorMessage(apiError, fallback);

    if (isServerApiError(apiError)) {
      setServerError({ message });
      return;
    }

    setError(message);
  }

  useEffect(() => {
    if (!productIdToEdit) return undefined;

    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (cancelled) return;
        const product = (data.products || []).find((item) => item.id === productIdToEdit);
        if (!product) {
          setError(productText.missingProduct);
          return;
        }

        setProductForm({
          ...INITIAL_PRODUCT_FORM,
          name: product.name || '',
          description: product.description || '',
          category: product.category || '',
          price: product.unitPrice || '',
          availability: product.availability || '',
          type: product.room || '',
          range: product.range || '',
          supplier: product.supplierName || product.supplierLabel || product.supplier || shopName,
          city: product.city || '',
          neighborhood: product.neighborhood || '',
        });
        setExistingImages(product.images || []);
      })
      .catch((apiError) => {
        if (!cancelled) handleApiError(apiError, productText.loadError);
      });

    return () => {
      cancelled = true;
    };
  }, [productIdToEdit, productText.loadError, productText.missingProduct, shopName]);

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  function updateProductForm(field, value) {
    setServerError(null);
    setProductForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updateDescriptionSelection(transformSelection) {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = productForm.description || '';
    const selection = value.slice(start, end);
    const replacement = transformSelection(selection);
    const nextDescription = `${value.slice(0, start)}${replacement}${value.slice(end)}`;

    updateProductForm('description', nextDescription);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    });
  }

  function wrapDescriptionSelection(prefix, suffix = prefix, fallback = 'texte') {
    updateDescriptionSelection((selection) => `${prefix}${selection || fallback}${suffix}`);
  }

  function insertDescriptionBlock(block) {
    updateDescriptionSelection((selection) => {
      const nextBlock = selection
        ? block.replace('Élément', selection)
        : block;

      return nextBlock.startsWith('\n') ? nextBlock : `\n${nextBlock}`;
    });
  }

  function applyDescriptionStyle(style) {
    if (style === 'Titre') {
      updateDescriptionSelection((selection) => {
        const text = selection || 'Nouveau titre';
        return text.startsWith('## ') ? text : `## ${text}`;
      });
      return;
    }

    updateDescriptionSelection((selection) => (
      selection.replace(/^#{1,6}\s*/, '') || 'Paragraphe'
    ));
  }

  function applyDescriptionTool(toolKey) {
    const actions = {
      bold: () => wrapDescriptionSelection('**'),
      italic: () => wrapDescriptionSelection('*'),
      underline: () => wrapDescriptionSelection('<u>', '</u>'),
      list: () => insertDescriptionBlock('- Élément'),
      numbered: () => insertDescriptionBlock('1. Élément'),
      link: () => wrapDescriptionSelection('[', '](https://)', 'Lien'),
      quote: () => insertDescriptionBlock('> Élément'),
      code: () => wrapDescriptionSelection('`'),
    };

    actions[toolKey]?.();
  }

  function handleFilesChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setFiles((currentFiles) => {
      const availableSlots = Math.max(MAX_PRODUCT_FILES - existingImages.length - currentFiles.length, 0);
      const filesToAdd = selectedFiles.slice(0, availableSlots);

      if (selectedFiles.length > availableSlots) {
        setError(productText.maxFilesError(MAX_PRODUCT_FILES));
      } else {
        setError('');
      }

      return [...currentFiles, ...filesToAdd];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeSelectedFile(fileIndex) {
    setFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function removeExistingImage(image) {
    const publicId = image?.public_id;
    const imageKey = publicId || image?.secure_url || image?.url;

    if (!imageKey) return;

    if (!productIdToEdit || !publicId) {
      setExistingImages((currentImages) => currentImages.filter((currentImage) => (
        (currentImage.public_id || currentImage.secure_url || currentImage.url) !== imageKey
      )));
      return;
    }

    setDeletingImageId(imageKey);
    setError('');
    setServerError(null);

    try {
      const updatedProduct = await deleteSupplierProductImage(productIdToEdit, publicId);
      setExistingImages(updatedProduct.images || []);
    } catch (apiError) {
      handleApiError(apiError, productText.imageDeleteError);
    } finally {
      setDeletingImageId('');
    }
  }

  function submitProductToAdmin(product) {
    setAdminData((currentData) => {
      const image = getProductImage(product);
      const proposal = {
        id: currentData.products.find((item) => item.sourceSupplierProductId === product.id)?.id || `supplier-product-${product.id}`,
        sourceSupplierProductId: product.id,
        supplierUserId: product.supplierUserId,
        name: product.name,
        description: product.description,
        price: product.unitPrice,
        image,
        images: product.images || [],
        category: product.category,
        room: product.room,
        range: product.range,
        supplier: effectiveSupplierName,
        vat: '20%',
        visual: 'sofa',
        city: selectedCity || taxonomyOptions.cities[0] || 'Cotonou',
        neighborhood: selectedNeighborhood,
        availability: product.availability || 'Disponible',
        publicationStatus: 'En attente',
        publicationSource: 'supplier',
        submittedAt: new Date().toISOString(),
      };
      const exists = currentData.products.some((item) => item.sourceSupplierProductId === product.id);

      return {
        ...currentData,
        products: exists
          ? currentData.products.map((item) => (item.sourceSupplierProductId === product.id ? proposal : item))
          : [proposal, ...(currentData.products || [])],
      };
    });
  }

  async function saveProduct(event) {
    event.preventDefault();
    setError('');
    setServerError(null);

    if (!productForm.name.trim()
      || !productForm.description.trim()
      || !selectedCategory
      || !selectedRoom
      || !selectedRange
      || !selectedAvailability
      || !selectedCity
      || !selectedNeighborhood
      || !effectiveSupplierName
      || productForm.price === ''
      || (files.length === 0 && existingImages.length === 0)) {
      setError(productText.requiredError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        category: selectedCategory,
        room: selectedRoom,
        range: selectedRange,
        availability: selectedAvailability,
        city: selectedCity,
        neighborhood: selectedNeighborhood,
        unitPrice: productForm.price,
        unit: 'u',
      };

      const savedProduct = productIdToEdit
        ? await updateSupplierProduct(productIdToEdit, payload, files)
        : await createSupplierProduct(payload, files);

      submitProductToAdmin(savedProduct);
      navigate('/supplier/products');
    } catch (apiError) {
      handleApiError(apiError, productText.saveError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="supplier-product-editor-page" onSubmit={saveProduct}>
      <header className="supplier-product-editor-header">
        <button type="button" className="supplier-product-editor-back" onClick={() => navigate('/supplier/products')} aria-label={productText.backLabel}>
          <Icon name="Tag" size="sm" />
        </button>
        <Icon name="ChevronRight" size="sm" />
        <h1>{productIdToEdit ? productText.editTitle : productText.addTitle}</h1>
      </header>

      {serverError && (
        <ServerError
          className="supplier-product-editor-server-error"
          title={productText.serverErrorTitle}
          message={serverError.message || productText.serverErrorMessage}
          actionLabel={productText.retry}
          onRetry={() => window.location.reload()}
        />
      )}

      {error && (
        <Alert
          variant="danger"
          className="supplier-product-editor-error"
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <div className="supplier-product-editor-layout">
        <main className="supplier-product-editor-main">
          <section className="supplier-product-editor-card">
            <label className="supplier-product-field">
              <span>{productText.title}</span>
              <input
                type="text"
                value={productForm.name}
                onChange={(event) => updateProductForm('name', event.target.value)}
                placeholder={productText.titlePlaceholder}
                required
              />
            </label>

            <label className="supplier-product-field">
              <span>{productText.description}</span>
              <div className="supplier-product-rich-editor">
                <div className="supplier-product-rich-toolbar" aria-label={productText.formattingToolsLabel}>
                  <select defaultValue="Paragraphe" onChange={(event) => applyDescriptionStyle(event.target.value)}>
                    <option value="Paragraphe">{productText.paragraph}</option>
                    <option value="Titre">{productText.heading}</option>
                  </select>
                  {DESCRIPTION_TOOLS.map((tool) => (
                    <button
                      key={tool.key}
                      type="button"
                      title={tool.title}
                      aria-label={tool.title}
                      onClick={() => applyDescriptionTool(tool.key)}
                    >
                      {tool.label}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={descriptionRef}
                  value={productForm.description}
                  onChange={(event) => updateProductForm('description', event.target.value)}
                  placeholder={productText.descriptionPlaceholder}
                  required
                />
              </div>
            </label>

            <div className="supplier-product-field">
              <span>{productText.media}</span>
              <div className="supplier-product-upload">
                <div className="supplier-product-upload__controls">
                  <label className="supplier-product-upload-button" htmlFor="supplier-product-images">
                    {productText.import}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="supplier-product-images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={remainingFileSlots === 0}
                    required={existingImages.length === 0 && files.length === 0}
                    onChange={handleFilesChange}
                  />
                </div>
                <p>{productText.mediaHint}</p>
                <p>{productText.selectedFiles(totalImageCount, MAX_PRODUCT_FILES)}</p>
                {previews.length > 0 && (
                  <div className="supplier-product-preview-grid">
                    {previews.map((preview, index) => (
                      <figure key={`${preview.name}-${preview.url}`}>
                        <img src={preview.url} alt={preview.name} />
                        <button
                          type="button"
                          className="supplier-product-preview-remove"
                          aria-label={productText.deleteFile(preview.name)}
                          title={productText.deleteFile(preview.name)}
                          onClick={() => removeSelectedFile(index)}
                        >
                          <Icon name="Delete" size="sm" />
                        </button>
                      </figure>
                    ))}
                  </div>
                )}
                {existingImages.length > 0 && (
                  <div className="supplier-product-preview-grid">
                    {existingImages.map((image, index) => (
                      <figure key={`${image.public_id || image.secure_url || index}`}>
                        <img src={image.secure_url || image.url} alt={`Image existante ${index + 1}`} />
                        <button
                          type="button"
                          className="supplier-product-preview-remove"
                          aria-label={productText.deleteExistingImage(index + 1)}
                          title={productText.deleteExistingImage(index + 1)}
                          disabled={deletingImageId === (image.public_id || image.secure_url || image.url)}
                          onClick={() => removeExistingImage(image)}
                        >
                          <Icon name="Delete" size="sm" />
                        </button>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label className="supplier-product-field">
              <span>{productText.category}</span>
              <select required value={selectedCategory} onChange={(event) => updateProductForm('category', event.target.value)}>
                <option value="">{productText.categoryPlaceholder}</option>
                {taxonomyOptions.categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="supplier-product-editor-card supplier-product-price-card">
            <label className="supplier-product-field supplier-product-price-field">
              <span>{productText.price}</span>
              <div>
                <input
                  type="number"
                  min="0"
                  value={productForm.price}
                  onChange={(event) => updateProductForm('price', event.target.value)}
                  placeholder="0"
                  required
                />
                <b>FCFA</b>
              </div>
            </label>
            
          </section>
        </main>

        <aside className="supplier-product-editor-aside">
          <section className="supplier-product-side-card supplier-product-organization">
            <div className="supplier-product-side-title">
              <strong>{productText.organization}</strong>
              <Icon name="Info" size="sm" />
            </div>
            <label className="supplier-product-field">
              <span>{productText.availability}</span>
              <select required value={selectedAvailability} onChange={(event) => updateProductForm('availability', event.target.value)}>
                <option value="">{productText.availabilityPlaceholder}</option>
                {taxonomyOptions.availability.map((availability) => (
                  <option key={availability} value={availability}>{availability}</option>
                ))}
              </select>
            </label>
            <label className="supplier-product-field">
              <span>{productText.room}</span>
              <select required value={selectedRoom} onChange={(event) => updateProductForm('type', event.target.value)}>
                <option value="">{productText.roomPlaceholder}</option>
                {taxonomyOptions.rooms.map((room) => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </label>
            <label className="supplier-product-field">
              <span>{productText.supplier}</span>
              <select required value={effectiveSupplierName} onChange={(event) => updateProductForm('supplier', event.target.value)}>
                <option value={shopName}>{shopName}</option>
              </select>
            </label>
            <label className="supplier-product-field">
              <span>{productText.range}</span>
              <select required value={selectedRange} onChange={(event) => updateProductForm('range', event.target.value)}>
                <option value="">{productText.rangePlaceholder}</option>
                {taxonomyOptions.ranges.map((range) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </label>
            <label className="supplier-product-field">
              <span>Ville</span>
              <select required value={selectedCity} onChange={(event) => updateProductForm('city', event.target.value)}>
                <option value="">Choisir une ville</option>
                {taxonomyOptions.cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </label>
            <label className="supplier-product-field">
              <span>Quartier</span>
              <select required value={selectedNeighborhood} onChange={(event) => updateProductForm('neighborhood', event.target.value)}>
                <option value="">Choisir un quartier</option>
                {taxonomyOptions.neighborhoods.map((neighborhood) => (
                  <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
                ))}
              </select>
            </label>
          </section>

          <div className="supplier-product-editor-submit">
            <Button type="button" variant="outline" onClick={() => navigate('/supplier/products')}>{productText.cancel}</Button>
            <Button type="submit" isLoading={isSubmitting}>{productText.publish}</Button>
          </div>
        </aside>
      </div>
    </form>
  );
}
