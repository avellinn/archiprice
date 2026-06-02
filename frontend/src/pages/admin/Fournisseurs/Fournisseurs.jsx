import './Fournisseurs.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Icon } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import {
  createAdminSupplier,
  deleteAdminSupplier,
  fetchAdminSuppliers,
  updateAdminSupplier,
} from '../../../services/adminMongo';

const EMPTY_SUPPLIER = {
  id: '',
  name: 'Nouveau fournisseur',
  contact: 'contact@fournisseur.bj',
  region: 'Cotonou',
  status: 'Actif',
  products: 0,
};

export default function Fournisseurs() {
  const [searchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchAdminSuppliers()
      .then((list) => {
        if (!cancelled) {
          setSuppliers(list);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les fournisseurs Mongo.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSuppliers = useMemo(() => {
    const query = [searchTerm, searchParams.get('q') || ''].join(' ').trim().toLowerCase();
    if (!query) return suppliers;

    return suppliers.filter((supplier) => (
      String(supplier.name || '').toLowerCase().includes(query)
      || String(supplier.contact || '').toLowerCase().includes(query)
      || String(supplier.region || '').toLowerCase().includes(query)
    ));
  }, [searchParams, searchTerm, suppliers]);

  async function upsertSupplier(supplier) {
    try {
      if (supplier.id) {
        const updatedSupplier = await updateAdminSupplier(supplier.id, supplier);
        setSuppliers((currentSuppliers) => currentSuppliers.map((item) => (
          item.id === updatedSupplier.id ? updatedSupplier : item
        )));
      } else {
        const createdSupplier = await createAdminSupplier(supplier);
        setSuppliers((currentSuppliers) => [createdSupplier, ...currentSuppliers]);
      }
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "L'enregistrement du fournisseur a échoué."));
    }
  }

  function toggleSupplierStatus(supplier) {
    upsertSupplier({
      ...supplier,
      status: supplier.status === 'Actif' ? 'Inactif' : 'Actif',
    });
  }

  async function deleteSupplier(supplierId) {
    const previousSuppliers = suppliers;
    setSuppliers((currentSuppliers) => currentSuppliers.filter((supplier) => supplier.id !== supplierId));

    try {
      await deleteAdminSupplier(supplierId);
    } catch (apiError) {
      setSuppliers(previousSuppliers);
      setError(getApiErrorMessage(apiError, 'La suppression du fournisseur a échoué.'));
    }
  }

  return (
    <div className="admin-suppliers-page">
      <header className="admin-suppliers-header">


        <label className="admin-products-search admin-suppliers-search">
          <span className="visually-hidden">Rechercher un fournisseur</span>
          <input
            type="search"
            placeholder="Rechercher un fournisseur, une région..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Icon name="Search" size="sm" />
        </label>

        <Button type="button" icon={<Icon name="Add" size="sm" />} className="admin-products-add" onClick={() => upsertSupplier(EMPTY_SUPPLIER)}>
          Ajouter un fournisseur
        </Button>
      </header>

      <section className="admin-suppliers-card" aria-label="Liste des fournisseurs">
        {error && <p className="admin-products-empty">{error}</p>}
        <div className="admin-suppliers-table-wrap">
          <table className="admin-suppliers-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Contact</th>
                <th>Région</th>
                <th>Statut</th>
                <th>Articles liés</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="admin-products-empty">Chargement des fournisseurs Mongo...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-products-empty">Aucun fournisseur trouvé.</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier, index) => (
                  <tr key={`${supplier.id || supplier.name}-${index}`}>
                    <td>{supplier.name}</td>
                    <td>{supplier.contact}</td>
                    <td>{supplier.region}</td>
                    <td>
                      <Badge tone={supplier.status === 'Actif' ? 'success' : 'danger'}>
                        {supplier.status}
                      </Badge>
                    </td>
                    <td>{supplier.products}</td>
                    <td>
                      <span className="admin-suppliers-actions">
                        <button type="button" aria-label={`Modifier ${supplier.name}`} onClick={() => upsertSupplier({
                          ...supplier,
                          name: `${supplier.name} modifié`,
                        })}
                        >
                          <Icon name="Edit" size="sm" />
                        </button>
                        <button type="button" aria-label={`Activer ou désactiver ${supplier.name}`} className="is-link" onClick={() => toggleSupplierStatus(supplier)}>
                          <Icon name="Link" size="sm" />
                        </button>
                        <button type="button" aria-label={`Supprimer ${supplier.name}`} className="is-danger" onClick={() => deleteSupplier(supplier.id)}>
                          <Icon name="Delete" size="sm" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-suppliers-pagination">
          <div className="admin-products-pages">
            <button type="button" aria-label="Page précédente">
              <Icon name="ChevronLeft" size="sm" />
            </button>
            <button type="button" className="is-active">1</button>
            <button type="button">2</button>
            <button type="button">3</button>
            <button type="button" aria-label="Page suivante">
              <Icon name="ChevronRight" size="sm" />
            </button>
          </div>

          <div className="admin-products-count">
            <select defaultValue="20">
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
            <strong>Total {filteredSuppliers.length} fournisseurs</strong>
          </div>
        </footer>
      </section>
    </div>
  );
}
