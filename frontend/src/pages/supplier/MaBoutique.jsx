import { useEffect, useState } from 'react';
import { Button, Icon } from '../../components/ui';
import { getApiErrorMessage } from '../../services/api';
import { fetchSupplierWorkspace } from '../../services/supplier';

export default function MaBoutique() {
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger la boutique.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const supplier = workspace?.supplier;
  const shopName = supplier?.name || supplier?.companyName || 'ArchiPrice Store';

  return (
    <div className="supplier-shop-page">
      {isLoading && <section className="supplier-shop-card">Chargement de la boutique...</section>}
      {error && <section className="supplier-shop-card auth-error">{error}</section>}

      {!isLoading && !error && (
        <section className="supplier-shop-card">
          <div className="supplier-shop-preview" aria-label="Aperçu de la boutique">
            <div className="supplier-shop-preview__desktop">
              <div className="supplier-shop-preview__topbar">
                <strong>{shopName.slice(0, 7).toLowerCase()}</strong>
                <span>Home</span>
                <span>Catalog</span>
                <span>Contact</span>
                <i />
                <Icon name="Search" size="sm" />
                <Icon name="Workspaces" size="sm" />
              </div>
              <div className="supplier-shop-preview__hero">
                <div>
                  <h2>Browse our latest products</h2>
                  <button type="button">Shop all</button>
                </div>
              </div>
            </div>

            <div className="supplier-shop-preview__mobile">
              <div className="supplier-shop-preview__mobilebar">
                <span className="supplier-shop-preview__hamburger">☰</span>
                <Icon name="Search" size="sm" />
                <strong>{shopName.slice(0, 7).toLowerCase()}</strong>
                <Icon name="Workspaces" size="sm" />
              </div>
              <div className="supplier-shop-preview__mobilehero">
                <h3>Browse our latest products</h3>
                <button type="button">Shop all</button>
              </div>
              <div className="supplier-shop-preview__products">
                <strong>Products</strong>
                <span />
                <span />
              </div>
            </div>
          </div>

          <div className="supplier-shop-password">
            <Icon name="Info" size="sm" />
            <span>Password protected: to remove the password, pick a plan</span>
            <button type="button">Edit password</button>
            <Button type="button" variant="outline" size="sm">Pick a plan</Button>
          </div>

          <footer className="supplier-shop-footer">
            <div>
              <h1>Horizon</h1>
              <p>Added: 13:04</p>
              <span>Version 3.5.1 <Icon name="ChevronDown" size="sm" /></span>
            </div>
            <div className="supplier-shop-actions">
              <button type="button" aria-label="Plus d'options">
                …
              </button>
              <Button type="button" size="sm">Edit theme</Button>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}
