import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Icon } from '../../components/ui';
import { getApiErrorMessage } from '../../services/api';
import {
  approveSupplierRequest,
  fetchSupplierRequests,
  rejectSupplierRequest,
} from '../../services/adminMongo';

export default function NouvellesDemandes() {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchSupplierRequests()
      .then((list) => {
        if (!cancelled) {
          setRequests(list.filter((request) => request.status === 'pending'));
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les nouvelles demandes fournisseurs.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const query = [searchTerm, searchParams.get('q') || ''].join(' ').trim().toLowerCase();
    if (!query) return requests;

    return requests.filter((request) => (
      String(request.companyName || '').toLowerCase().includes(query)
      || String(request.email || '').toLowerCase().includes(query)
      || String(request.phone || '').toLowerCase().includes(query)
      || (request.categories || []).some((category) => String(category).toLowerCase().includes(query))
    ));
  }, [requests, searchParams, searchTerm]);

  async function approveRequest(requestId) {
    try {
      await approveSupplierRequest(requestId);
      setRequests((currentRequests) => currentRequests.filter((request) => request.id !== requestId));
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de valider la demande fournisseur.'));
    }
  }

  async function rejectRequest(requestId) {
    const reason = window.prompt('Motif du refus', '');
    try {
      await rejectSupplierRequest(requestId, reason || '');
      setRequests((currentRequests) => currentRequests.filter((request) => request.id !== requestId));
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de refuser la demande fournisseur.'));
    }
  }

  return (
    <div className="admin-suppliers-page">
      <header className="admin-suppliers-header">
        <h1>Nouvelles demandes</h1>

        <label className="admin-products-search admin-suppliers-search">
          <span className="visually-hidden">Rechercher une demande fournisseur</span>
          <input
            type="search"
            placeholder="Rechercher une boutique, un email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Icon name="Search" size="sm" />
        </label>

        <Badge tone={filteredRequests.length > 0 ? 'warning' : 'success'}>
          {filteredRequests.length} en attente
        </Badge>
      </header>

      <section className="admin-suppliers-card admin-suppliers-requests" aria-label="Nouvelles demandes fournisseurs">
        <div className="admin-suppliers-requests__header">
            
        </div>

        {error && <p className="admin-products-empty">{error}</p>}

        {isLoading ? (
          <p className="admin-products-empty">Chargement des demandes...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="admin-products-empty">Aucune nouvelle demande fournisseur.</p>
        ) : (
          <div className="admin-suppliers-requests__list">
            {filteredRequests.map((request) => (
              <article key={request.id} className="admin-suppliers-requests__item">
                <div>
                  <strong>{request.companyName}</strong>
                  <span>{request.email} · {request.phone || 'Téléphone non renseigné'}</span>
                  {request.categories?.length > 0 && <small>{request.categories.join(', ')}</small>}
                </div>
                <div className="admin-suppliers-requests__actions">
                  <Button type="button" variant="success" size="sm" icon={<Icon name="Check" size="sm" />} onClick={() => approveRequest(request.id)}>
                    Valider
                  </Button>
                  <Button type="button" variant="danger" size="sm" icon={<Icon name="Close" size="sm" />} onClick={() => rejectRequest(request.id)}>
                    Refuser
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
