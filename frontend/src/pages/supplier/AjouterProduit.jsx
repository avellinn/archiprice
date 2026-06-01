import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { getApiErrorMessage } from '../../services/api';
import { useAdminData } from '../../services/adminData';
import { createSupplierProduct, fetchSupplierWorkspace, updateSupplierProduct } from '../../services/supplier';

const INITIAL_PRODUCT_FORM = {
  name: '',
  description: '',
  category: '',
  price: '',
  availability: '',
  type: '',
  range: '',
  supplier: '',
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const descriptionRef = useRef(null);
  const productIdToEdit = searchParams.get('edit') || '';
  const [adminData, setAdminData] = useAdminData();
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [existingImages, setExistingImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const taxonomyOptions = useMemo(() => ({
    categories: getTaxonomyNames(adminData.taxonomies?.categories),
    rooms: getTaxonomyNames(adminData.taxonomies?.rooms),
    ranges: getTaxonomyNames(adminData.taxonomies?.ranges),
    availability: getTaxonomyNames(adminData.taxonomies?.availability),
  }), [adminData.taxonomies]);
  const selectedCategory = getSyncedOptionValue(productForm.category, taxonomyOptions.categories);
  const selectedRoom = getSyncedOptionValue(productForm.type, taxonomyOptions.rooms);
  const selectedRange = getSyncedOptionValue(productForm.range, taxonomyOptions.ranges);
  const selectedAvailability = getSyncedOptionValue(productForm.availability, taxonomyOptions.availability);

  const previews = useMemo(() => files.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
  })), [files]);

  useEffect(() => {
    if (!productIdToEdit) return undefined;

    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (cancelled) return;
        const product = (data.products || []).find((item) => item.id === productIdToEdit);
        if (!product) {
          setError('Produit introuvable.');
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
          supplier: 'Ma boutique',
        });
        setExistingImages(product.images || []);
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger le produit.'));
      });

    return () => {
      cancelled = true;
    };
  }, [productIdToEdit]);

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  function updateProductForm(field, value) {
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
    setFiles(Array.from(event.target.files || []).slice(0, 10));
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
        supplier: 'Ma boutique',
        vat: '20%',
        visual: 'sofa',
        city: 'Cotonou',
        neighborhood: '',
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
    setIsSubmitting(true);

    try {
      const payload = {
        name: productForm.name || 'Nouveau produit',
        description: productForm.description,
        category: selectedCategory,
        room: selectedRoom,
        range: selectedRange,
        availability: selectedAvailability,
        unitPrice: productForm.price || 0,
        unit: 'u',
      };

      const savedProduct = productIdToEdit
        ? await updateSupplierProduct(productIdToEdit, payload, files)
        : await createSupplierProduct(payload, files);

      submitProductToAdmin(savedProduct);
      navigate('/supplier/catalogue');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Impossible d'enregistrer le produit."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="supplier-product-editor-page" onSubmit={saveProduct}>
      <header className="supplier-product-editor-header">
        <button type="button" className="supplier-product-editor-back" onClick={() => navigate('/supplier/products')} aria-label="Retour aux produits">
          <Icon name="Tag" size="sm" />
        </button>
        <Icon name="ChevronRight" size="sm" />
        <h1>{productIdToEdit ? 'Modifier un produit' : 'Ajouter un produit'}</h1>
      </header>

      {error && <p className="supplier-product-editor-error">{error}</p>}

      <div className="supplier-product-editor-layout">
        <main className="supplier-product-editor-main">
          <section className="supplier-product-editor-card">
            <label className="supplier-product-field">
              <span>Titre</span>
              <input
                type="text"
                value={productForm.name}
                onChange={(event) => updateProductForm('name', event.target.value)}
                placeholder="Ex: Canapé 3 places Oslo"
                required
              />
            </label>

            <label className="supplier-product-field">
              <span>Description</span>
              <div className="supplier-product-rich-editor">
                <div className="supplier-product-rich-toolbar" aria-label="Outils de mise en forme de la description">
                  <select defaultValue="Paragraphe" onChange={(event) => applyDescriptionStyle(event.target.value)}>
                    <option>Paragraphe</option>
                    <option>Titre</option>
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
                  placeholder="Ajoutez une description complète du produit."
                />
              </div>
            </label>

            <div className="supplier-product-field">
              <span>Supports multimédias</span>
              <div className="supplier-product-upload">
                <div>
                  <label className="supplier-product-upload-button" htmlFor="supplier-product-images">
                    Importer
                  </label>
                  <input
                    id="supplier-product-images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFilesChange}
                  />
                </div>
                {previews.length > 0 && (
                  <div className="supplier-product-preview-grid">
                    {previews.map((preview) => (
                      <figure key={`${preview.name}-${preview.url}`}>
                        <img src={preview.url} alt={preview.name} />
                      </figure>
                    ))}
                  </div>
                )}
                {existingImages.length > 0 && (
                  <div className="supplier-product-preview-grid">
                    {existingImages.map((image, index) => (
                      <figure key={`${image.public_id || image.secure_url || index}`}>
                        <img src={image.secure_url || image.url} alt={`Image existante ${index + 1}`} />
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label className="supplier-product-field">
              <span>Catégorie</span>
              <select value={selectedCategory} onChange={(event) => updateProductForm('category', event.target.value)}>
                <option value="">Choisir une catégorie de produits</option>
                {taxonomyOptions.categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="supplier-product-editor-card supplier-product-price-card">
            <label className="supplier-product-field supplier-product-price-field">
              <span>Prix</span>
              <div>
                <input
                  type="number"
                  min="0"
                  value={productForm.price}
                  onChange={(event) => updateProductForm('price', event.target.value)}
                  placeholder="0"
                />
                <b>FCFA</b>
              </div>
            </label>
            
          </section>
        </main>

        <aside className="supplier-product-editor-aside">
          <section className="supplier-product-side-card supplier-product-organization">
            <div className="supplier-product-side-title">
              <strong>Organisation du produit</strong>
              <Icon name="Info" size="sm" />
            </div>
            <label className="supplier-product-field">
              <span>Disponibilité</span>
              <select value={selectedAvailability} onChange={(event) => updateProductForm('availability', event.target.value)}>
                <option value="">Choisir une disponibilité</option>
                {taxonomyOptions.availability.map((availability) => (
                  <option key={availability} value={availability}>{availability}</option>
                ))}
              </select>
            </label>
            <label className="supplier-product-field">
              <span>Pièce</span>
              <select value={selectedRoom} onChange={(event) => updateProductForm('type', event.target.value)}>
                <option value="">Choisir une pièce</option>
                {taxonomyOptions.rooms.map((room) => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </label>
            <label className="supplier-product-field">
              <span>Fournisseur</span>
              <select value={productForm.supplier} onChange={(event) => updateProductForm('supplier', event.target.value)}>
                
                <option>Ma boutique</option>
              </select>
            </label>
            <label className="supplier-product-field">
              <span>Gamme</span>
              <select value={selectedRange} onChange={(event) => updateProductForm('range', event.target.value)}>
                <option value="">Choisir une gamme</option>
                {taxonomyOptions.ranges.map((range) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </label>
          </section>

          <div className="supplier-product-editor-submit">
            <Button type="button" variant="outline" onClick={() => navigate('/supplier/products')}>Annuler</Button>
            <Button type="submit" isLoading={isSubmitting}>Publier</Button>
          </div>
        </aside>
      </div>
    </form>
  );
}
