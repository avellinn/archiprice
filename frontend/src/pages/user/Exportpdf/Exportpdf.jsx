import '../FicheProduits/ficheProduits.css';
import './Exportpdf.css';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProductDetailSections from '../../../components/ProductDetailSections';
import ProductSheetGallery from '../../../components/ProductSheetGallery';
import { Alert } from '../../../components/ui';
import { fetchExportedDocument } from '../../../services/exportedDocuments';
import { normalizeExportedProduct } from '../../../utils/productPresentation';
import { getStoredUserLanguage } from '../../../utils/userLanguage';
import { translateWorkspaceText } from '../../../utils/workspaceLanguage';

function formatFCFA(amount, language) {
  const locale = String(language).startsWith('en') ? 'en-US' : 'fr-FR';
  return `${new Intl.NumberFormat(locale).format(Number(amount || 0))} FCFA`;
}

export default function ExportPdf() {
  const { documentId } = useParams();
  const [language, setLanguage] = useState(getStoredUserLanguage);
  const document = useMemo(() => fetchExportedDocument(documentId), [documentId]);
  const products = useMemo(
    () => (document?.items || []).map(normalizeExportedProduct),
    [document?.items],
  );
  const text = (value) => translateWorkspaceText(value, language);

  useEffect(() => {
    const syncLanguage = () => setLanguage(getStoredUserLanguage());
    window.addEventListener('archiprice:user-profile-change', syncLanguage);
    window.addEventListener('storage', syncLanguage);
    return () => {
      window.removeEventListener('archiprice:user-profile-change', syncLanguage);
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);

  if (!document) {
    return <main className="export-product-sheet-page"><Alert variant="danger">{text('Document exporté introuvable ou supprimé.')}</Alert></main>;
  }

  return (
    <main className="product-sheet-page export-product-sheet-page">
      

      <section className="export-product-sheet-list" aria-label={text('Produits exportés')}>
        {products.map((product, index) => (
          <article className="export-product-sheet-item" key={product.id || `${product.name}-${index}`}>
            <header className="export-product-sheet-item__title">
              <span>{product.category || text('Produit')}</span>
              <h3>{product.name}</h3>
            </header>
            <section className="product-sheet-layout">
              <ProductSheetGallery
                key={product.id || `${document.id}-${index}`}
                product={product}
                language={language}
                className="export-product-sheet-gallery"
              />
              <article className="product-sheet-content">
                <ProductDetailSections product={product} language={language} />
              </article>
            </section>
          </article>
        ))}
      </section>

      <footer className="export-product-sheet-footer">
        <span>{document.fileName}</span>
        <span>{new Intl.DateTimeFormat(language.startsWith('en') ? 'en-US' : 'fr-FR').format(new Date(document.exportedAt))}</span>
      </footer>
    </main>
  );
}
