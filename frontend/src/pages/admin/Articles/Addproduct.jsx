import { useState } from 'react';
import { Button, Icon } from '../../../components/ui';
import Alert from '../../../components/ui/Alert';
import { sanitizeNumericInput } from '../../../utils/formInput';

export default function Addproduct({
  productForm,
  taxonomyOptions,
  supplierOptions,
  cityOptions,
  neighborhoodOptions,
  customNeighborhoodValue,
  maxImageCount,
  isImageUploading,
  imageUploadError,
  onClose,
  onSave,
  onUpdateField,
  onImageUpload,
  onRemoveImage,
  getNeighborhoodSelectValue,
  getProductImages,
  getImageUrl,
}) {
  const [actionMessage, setActionMessage] = useState('');
  const productImages = getProductImages(productForm);
  const selectedNeighborhoodValue = getNeighborhoodSelectValue(productForm.neighborhood, neighborhoodOptions);
  const hasImages = productImages.length > 0;
  const canSubmit = hasImages && !isImageUploading;

  function submitProduct(event) {
    event.preventDefault();
    setActionMessage('Sauvegarde de l’article en cours.');
    onSave();
  }

  function renderOptions(options, currentValue) {
    const normalizedOptions = [...new Set([currentValue, ...options].filter(Boolean))];

    return (
      <>
        <option value="" disabled>À configurer</option>
        {normalizedOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </>
    );
  }

  return (
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
            onClick={onClose}
          >
            <Icon name="Close" />
          </button>
        </header>

        <form className="admin-product-form" onSubmit={submitProduct}>
          <div className="admin-product-form__column">
            <label className="admin-product-field">
              <span>Nom de l'article <b>*</b></span>
              <input
                type="text"
                value={productForm.name}
                placeholder="Nom de l'article"
                required
                onChange={(event) => onUpdateField('name', event.target.value)}
              />
            </label>

            <label className="admin-product-field">
              <span>Description <b>*</b></span>
              <textarea
                value={productForm.description}
                placeholder="Ajouter une description"
                required
                onChange={(event) => onUpdateField('description', event.target.value)}
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
                  required
                  onChange={(event) => onUpdateField('price', sanitizeNumericInput(event.target.value))}
                />
              </label>
              <label className="admin-product-field">
                <span>TVA <b>*</b></span>
                <select required value={productForm.vat} onChange={(event) => onUpdateField('vat', event.target.value)}>
                  <option>20%</option>
                  <option>10%</option>
                  <option>5%</option>
                </select>
              </label>
            </div>

            <label className="admin-product-field">
              <span>Catégorie <b>*</b></span>
              <select required value={productForm.category} onChange={(event) => onUpdateField('category', event.target.value)}>
                {renderOptions(taxonomyOptions.category, productForm.category)}
              </select>
            </label>

            <label className="admin-product-field">
              <span>Pièce <b>*</b></span>
              <select required value={productForm.room} onChange={(event) => onUpdateField('room', event.target.value)}>
                {renderOptions(taxonomyOptions.room, productForm.room)}
              </select>
            </label>

            <label className="admin-product-field">
              <span>Gamme <b>*</b></span>
              <select required value={productForm.range} onChange={(event) => onUpdateField('range', event.target.value)}>
                {renderOptions(taxonomyOptions.range, productForm.range)}
              </select>
            </label>
          </div>

          <div className="admin-product-form__column">
            <label className="admin-product-field">
              <span>Fournisseur <b>*</b></span>
              <select required value={productForm.supplier} onChange={(event) => onUpdateField('supplier', event.target.value)}>
                {renderOptions(supplierOptions, productForm.supplier)}
              </select>
            </label>

            <label className="admin-product-field">
              <span>Disponibilité <b>*</b></span>
              <select required value={productForm.availability} onChange={(event) => onUpdateField('availability', event.target.value)}>
                {renderOptions(taxonomyOptions.availability, productForm.availability)}
              </select>
            </label>

            <label className="admin-product-field">
              <span>Ville (localisation par défaut) <b>*</b></span>
              <select required value={productForm.city} onChange={(event) => onUpdateField('city', event.target.value)}>
                {renderOptions(cityOptions, productForm.city)}
              </select>
            </label>

            <label className="admin-product-field">
              <span>Quartier <b>*</b></span>
              <select
                required
                value={selectedNeighborhoodValue}
                onChange={(event) => {
                  const value = event.target.value;
                  onUpdateField('neighborhood', value === customNeighborhoodValue ? '' : value);
                }}
              >
                {renderOptions(neighborhoodOptions, selectedNeighborhoodValue === customNeighborhoodValue ? '' : productForm.neighborhood)}
                <option value={customNeighborhoodValue}>Autre quartier</option>
              </select>
            </label>

            {selectedNeighborhoodValue === customNeighborhoodValue && (
              <label className="admin-product-field">
                <span>Quartier personnalisé <b>*</b></span>
                <input
                  type="text"
                  value={productForm.neighborhood}
                  placeholder="Saisir le quartier"
                  required
                  onChange={(event) => onUpdateField('neighborhood', event.target.value)}
                />
              </label>
            )}

            <div className="admin-product-image-field">
              <span>Images ({productImages.length}/{maxImageCount}) <b>*</b></span>
              <div className="admin-product-upload-grid">
                <div className="admin-product-preview">
                  {getImageUrl(productImages[0]) ? (
                    <img src={getImageUrl(productImages[0])} alt="Aperçu de l'article" />
                  ) : (
                    <span className="admin-product-preview__sofa" />
                  )}
                </div>
                <label className="admin-product-upload">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    disabled={isImageUploading}
                    onChange={onImageUpload}
                  />
                  <Icon name="Upload" />
                  <strong>{isImageUploading ? 'Upload en cours...' : 'Cliquez ou glissez des images'}</strong>
                  <small>PNG, JPG, WebP (max. 5Mo chacune, optimisées automatiquement)</small>
                </label>
              </div>
              {imageUploadError && (
                <small className="admin-product-upload-error">{imageUploadError}</small>
              )}
              {hasImages && (
                <div className="admin-product-gallery">
                  {productImages.map((image, index) => (
                    <button
                      type="button"
                      key={`${getImageUrl(image).slice(0, 28)}-${index}`}
                      className={index === 0 ? 'is-primary' : ''}
                      onClick={() => onRemoveImage(index)}
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

          {actionMessage && (
            <Alert variant="success" onClose={() => setActionMessage('')}>
              {actionMessage}
            </Alert>
          )}

          <footer className="admin-product-modal__footer">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Enregistrer
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
