import '../FicheProduits/ficheProduits.css';
import './Exportpdf.css';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProductDetailSections from '../../../components/ProductDetailSections';
import ProductSheetGallery from '../../../components/ProductSheetGallery';
import { Alert } from '../../../components/ui';
import api from '../../../services/api';
import { fetchExportedDocument } from '../../../services/exportedDocuments';
import { normalizeExportedProduct } from '../../../utils/productPresentation';
import { getStoredUserLanguage } from '../../../utils/userLanguage';
import { translateWorkspaceText } from '../../../utils/workspaceLanguage';


export default function ExportPdf() {
  const { documentId } = useParams();
  const [language, setLanguage] = useState(getStoredUserLanguage);
  
  const initialLocalDoc = useMemo(() => fetchExportedDocument(documentId), [documentId]);
  const [document, setDocument] = useState(initialLocalDoc);
  const [prevDocumentId, setPrevDocumentId] = useState(documentId);
  const [isLoading, setIsLoading] = useState(!initialLocalDoc);

  if (documentId !== prevDocumentId) {
    const newLocalDoc = fetchExportedDocument(documentId);
    setPrevDocumentId(documentId);
    setDocument(newLocalDoc);
    setIsLoading(!newLocalDoc);
  }

  const text = (value) => translateWorkspaceText(value, language);

  useEffect(() => {
    if (document) return () => {};

    let active = true;
    api.get(`/api/simulations/${documentId}`)
      .then(({ data }) => {
        if (active && data?.simulation) {
          setDocument({
            id: data.simulation.id || data.simulation._id,
            fileName: data.simulation.fileName || `${data.simulation.projectName || 'simulation'}.pdf`,
            exportedAt: data.simulation.createdAt || data.simulation.date || new Date().toISOString(),
            items: data.simulation.items || [],
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch exported document from backend:', err);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [documentId, document]);

  const products = useMemo(
    () => (document?.items || []).map(normalizeExportedProduct),
    [document?.items],
  );

  useEffect(() => {
    const syncLanguage = () => setLanguage(getStoredUserLanguage());
    window.addEventListener('archiprice:user-profile-change', syncLanguage);
    window.addEventListener('storage', syncLanguage);
    return () => {
      window.removeEventListener('archiprice:user-profile-change', syncLanguage);
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);

  if (isLoading) {
    return (
      <main className="export-product-sheet-page">
        <div style={{ display: 'grid', placeItems: 'center', height: '200px' }}>
          <span>{text('Chargement...')}</span>
        </div>
      </main>
    );
  }

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
