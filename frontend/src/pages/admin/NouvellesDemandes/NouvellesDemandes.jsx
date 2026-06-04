import './NouvellesDemandes.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Icon, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import {
  approveSupplierRequest,
  fetchSupplierRequests,
  rejectSupplierRequest,
} from '../../../services/adminMongo';
import NouvelleDemandeModal from './nouveldemande';

export default function NouvellesDemandes() {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

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
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
        setRejectionReason('');
      }
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de valider la demande fournisseur.'));
    }
  }

  async function rejectRequest(requestId) {
    const requestToReject = requests.find((request) => request.id === requestId) || selectedRequest;
    if (!requestToReject) return;

    try {
      await rejectSupplierRequest(requestToReject.id, rejectionReason.trim());
      setRequests((currentRequests) => currentRequests.filter((request) => request.id !== requestToReject.id));
      setSelectedRequest(null);
      setRejectionReason('');
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de refuser la demande fournisseur.'));
    }
  }

  function openRequest(request) {
    setSelectedRequest(request);
    setRejectionReason('');
  }

  const requestColumns = [
    {
      key: 'companyName',
      label: 'Boutique',
      render: (companyName) => companyName || 'Boutique sans nom',
    },
    {
      key: 'email',
      label: 'Email',
      render: (email) => email || 'Non renseigné',
    },
    {
      key: 'phone',
      label: 'Téléphone',
      render: (phone) => phone || 'Non renseigné',
    },
    {
      key: 'categories',
      label: 'Catégories',
      render: (categories) => (categories?.length ? categories.join(', ') : 'Non renseignées'),
    },
    {
      key: 'status',
      label: 'Statut',
      render: () => <Badge tone="warning">En attente</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, request) => (
        <span className="admin-supplier-requests-actions">
          <button
            type="button"
            title="Voir la demande"
            aria-label={`Voir ${request.companyName || 'la demande'}`}
            onClick={(event) => {
              event.stopPropagation();
              openRequest(request);
            }}
          >
            <Icon name="Visibility" size="sm" />
          </button>
          <button
            type="button"
            title="Valider"
            aria-label={`Valider ${request.companyName || 'la demande'}`}
            onClick={(event) => {
              event.stopPropagation();
              approveRequest(request.id);
            }}
          >
            <Icon name="Check" size="sm" />
          </button>
          <button
            type="button"
            className="is-danger"
            title="Refuser"
            aria-label={`Refuser ${request.companyName || 'la demande'}`}
            onClick={(event) => {
              event.stopPropagation();
              openRequest(request);
            }}
          >
            <Icon name="Close" size="sm" />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="admin-suppliers-page">
      
      {error && (
        <Alert variant="danger" className="admin-suppliers-alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Table
        className="admin-supplier-requests-list"
        columns={requestColumns}
        data={isLoading ? [] : filteredRequests}
        getRowId={(request, index) => request.id || `${request.email || 'request'}-${index}`}
        onRowClick={openRequest}
        emptyLabel={isLoading ? 'Chargement des demandes...' : 'Aucune nouvelle demande fournisseur.'}
      />

      {selectedRequest && (
        <NouvelleDemandeModal
          request={selectedRequest}
          rejectionReason={rejectionReason}
          onRejectionReasonChange={setRejectionReason}
          onClose={() => {
            setSelectedRequest(null);
            setRejectionReason('');
          }}
          onApprove={approveRequest}
          onReject={rejectRequest}
        />
      )}
    </div>
  );
}
