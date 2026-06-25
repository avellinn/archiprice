import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { getProductImages } from '../utils/productPresentation';
import { translateWorkspaceText } from '../utils/workspaceLanguage';

export default function ProductSheetGallery({ product, language = 'fr', className = '' }) {
  const images = useMemo(() => getProductImages(product), [product]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const activeImage = images[activeIndex] || '';
  const text = (value) => translateWorkspaceText(value, language);

  function showPreviousImage() {
    if (images.length > 1) setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }

  function showNextImage() {
    if (images.length > 1) setActiveIndex((index) => (index + 1) % images.length);
  }

  useEffect(() => {
    if (!isViewerOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsViewerOpen(false);
      if (event.key === 'ArrowLeft' && images.length > 1) {
        setActiveIndex((index) => (index - 1 + images.length) % images.length);
      }
      if (event.key === 'ArrowRight' && images.length > 1) {
        setActiveIndex((index) => (index + 1) % images.length);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, isViewerOpen]);

  return (
    <>
      <aside className={['product-sheet-gallery', className].filter(Boolean).join(' ')} aria-label={text('Galerie produit')}>
        <div className="product-sheet-main-image-shell">
          <button
            type="button"
            className={['product-sheet-main-image', activeImage ? 'has-image' : ''].filter(Boolean).join(' ')}
            style={activeImage ? { '--product-sheet-image': `url(${JSON.stringify(activeImage)})` } : undefined}
            onClick={() => activeImage && setIsViewerOpen(true)}
            aria-label={activeImage ? text("Afficher l'image en plein écran") : text('Image produit')}
          >
            {!activeImage && <span>{String(product?.name || 'AP').slice(0, 2).toUpperCase()}</span>}
          </button>
          {images.length > 1 && (
            <>
              <button type="button" className="product-sheet-image-arrow product-sheet-image-arrow--prev" onClick={showPreviousImage} aria-label={text('Image précédente')}>
                <Icon name="ChevronLeft" size="sm" />
              </button>
              <button type="button" className="product-sheet-image-arrow product-sheet-image-arrow--next" onClick={showNextImage} aria-label={text('Image suivante')}>
                <Icon name="ChevronRight" size="sm" />
              </button>
            </>
          )}
        </div>
        <div className="product-sheet-thumbs">
          {images.slice(0, 12).map((image, index) => (
            <button
              type="button"
              className={index === activeIndex ? 'is-active' : ''}
              key={`${image}-${index}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`${text("Afficher l'image")} ${index + 1}`}
              style={{ '--product-thumb-image': `url(${JSON.stringify(image)})` }}
            />
          ))}
        </div>
        <footer className="product-sheet-gallery-footer">
          <span>{images.length} {text('Images').toLocaleLowerCase(language)}</span>
          <span>
            <button type="button" onClick={showPreviousImage} aria-label={text('Image précédente')} disabled={images.length <= 1}><Icon name="ChevronLeft" size="sm" /></button>
            <button type="button" onClick={showNextImage} aria-label={text('Image suivante')} disabled={images.length <= 1}><Icon name="ChevronRight" size="sm" /></button>
          </span>
        </footer>
      </aside>
      {isViewerOpen && activeImage && (
        <div className="product-sheet-viewer" role="dialog" aria-modal="true" aria-label={product?.name}>
          <button type="button" className="product-sheet-viewer__close" onClick={() => setIsViewerOpen(false)} aria-label={text('Fermer')}><Icon name="Close" size="sm" /></button>
          {images.length > 1 && <button type="button" className="product-sheet-viewer__arrow product-sheet-viewer__arrow--prev" onClick={showPreviousImage} aria-label={text('Image précédente')}><Icon name="ChevronLeft" size="sm" /></button>}
          <img src={activeImage} alt={product?.name || ''} />
          {images.length > 1 && <button type="button" className="product-sheet-viewer__arrow product-sheet-viewer__arrow--next" onClick={showNextImage} aria-label={text('Image suivante')}><Icon name="ChevronRight" size="sm" /></button>}
        </div>
      )}
    </>
  );
}
