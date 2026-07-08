import './Clients.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Icon, Loader, Table } from '../../../components/ui';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { fetchMyDemandes, hideDemande, subscribeDemandesChange } from '../../../services/demandes';
import { fetchClientDetails } from '../../../services/supplier';
import ClientModal from './clientModal';

function formatDateTime(value) {
  if (!value) return 'Non renseignée';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function Clients() {
  const navigate = useNavigate();
  const [apiDemandes, setApiDemandes] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [isLoadingClientDetails, setIsLoadingClientDetails] = useState(false);
  const [pendingClientDelete, setPendingClientDelete] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  function loadClients({ silent = false } = {}) {
    let cancelled = false;

    if (!silent) setIsLoadingClients(true);

    fetchMyDemandes()
      .then((demandes) => {
        if (cancelled) return;
        setApiDemandes(demandes || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && !silent) setIsLoadingClients(false);
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    let cancelLoad = () => {};
    const timer = window.setTimeout(() => {
      cancelLoad = loadClients();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cancelLoad();
    };
  }, []);

  useRealtimeRefresh(() => loadClients({ silent: true }), ['demandes', 'suppliers']);

  useEffect(() => subscribeDemandesChange(() => loadClients({ silent: true })), []);

  const clients = useMemo(() => {
    const seen = new Set();

    return apiDemandes.filter((demande) => {
      const key = String(demande.id || demande.sourceNotificationId || '');
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).filter((demande) => !demande.hiddenBySupplier).map((demande) => {
      const messages = Array.isArray(demande.messages) ? demande.messages : [];
      const lastMessage = messages.at(-1);
      const lastMessageText = lastMessage?.message || 'Aucun message';
      const lastExchangeAt = lastMessage?.createdAt || demande.updatedAt || demande.createdAt;

      return {
        ...demande,
        clientProfession: demande.clientProfession || 'Client',
        clientPhone: demande.clientPhone || 'Non renseigné',
        projectName: demande.projectName || demande.project?.name || 'Projet sans nom',
        simulationTotalLabel: demande.simulationTotalLabel || 'Demande boutique',
        articleImages: demande.articleImages || [],
        lastMessageLabel: lastMessageText,
        lastExchangeLabel: formatDateTime(lastExchangeAt),
        createdAtLabel: formatDateTime(demande.createdAt),
      };
    });
  }, [apiDemandes]);

  async function confirmClientDelete() {
    if (!pendingClientDelete) return;

    const demandeId = pendingClientDelete.id || pendingClientDelete.sourceNotificationId;

    try {
      await hideDemande(demandeId);
      setApiDemandes((current) => current.filter((demande) => String(demande.id) !== String(demandeId)));
      setSuccessMessage('Client retiré de la liste.');
      setPendingClientDelete(null);
    } catch {
      setError('La suppression du client a échoué.');
    }
  }

  const clientColumns = [
    { key: 'clientName', label: 'Nom' },
    { key: 'clientProfession', label: 'Profession' },
    { key: 'clientEmail', label: 'Email' },
    { key: 'clientPhone', label: 'Numéro' },
    { key: 'projectName', label: 'Projet' },
    { key: 'simulationTotalLabel', label: 'Simulation' },
    {
      key: 'lastMessageLabel',
      label: 'Dernier message',
      render: (value) => <span className="supplier-clients-last-message">{value}</span>,
    },
    { key: 'lastExchangeLabel', label: 'Dernier échange' },
    { key: 'createdAtLabel', label: 'Date' },
    {
      key: 'articleImages',
      label: 'Images articles',
      render: (images) => {
        if (!images?.length) return <span className="supplier-clients-images__empty">Aucun lien</span>;

        return (
          <div className="supplier-clients-images">
            {images.slice(0, 4).map((image, index) => (
              <a
                key={`${image.secure_url}-${index}`}
                href={image.secure_url}
                target="_blank"
                rel="noreferrer"
                title={image.name}
                onClick={(event) => event.stopPropagation()}
              >
                Image {index + 1}
              </a>
            ))}
            {images.length > 4 && <span>+{images.length - 4}</span>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, client) => (
        <span className="supplier-clients-actions">
          <button
            type="button"
            title="Ouvrir la conversation"
            aria-label={`Ouvrir la conversation de ${client.clientName}`}
            onClick={(event) => {
              event.stopPropagation();
              navigate('/supplier/demande');
            }}
          >
            <Icon name="Chat" size="sm" />
          </button>
          <button
            type="button"
            title="Supprimer"
            aria-label={`Supprimer ${client.clientName}`}
            onClick={(event) => {
              event.stopPropagation();
              setPendingClientDelete(client);
            }}
          >
            <Icon name="Delete" size="sm" />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="supplier-clients-page">
      <div className="workspace-heading">
        <div>
          
          <h3>Clients</h3>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="supplier-clients-alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" className="supplier-clients-alert" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {pendingClientDelete && (
        <Alert
          variant="warning"
          title="Suppression client"
          className="supplier-clients-alert"
          autoCloseMs={0}
          onClose={() => setPendingClientDelete(null)}
        >
          <span>Retirer le client "{pendingClientDelete.clientName}" de la liste ?</span>
          <span className="supplier-clients-alert__actions">
            <button type="button" onClick={() => setPendingClientDelete(null)}>Annuler</button>
            <button type="button" onClick={confirmClientDelete}>Retirer</button>
          </span>
        </Alert>
      )}

      {isLoadingClients ? (
        <Loader label="Chargement des clients..." />
      ) : (
        <Table
          className="supplier-clients-table"
          columns={clientColumns}
          data={clients}
          getRowId={(client) => client.id}
          onRowClick={async (client) => {
            setSelectedClient(client);
            setClientDetails(null);
            setIsLoadingClientDetails(true);
            try {
              const details = await fetchClientDetails(client.clientId);
              setClientDetails(details);
            } catch {
              setClientDetails(null);
            } finally {
              setIsLoadingClientDetails(false);
            }
          }}
          emptyLabel="Aucun client  pour le moment..."
        />
      )}

      {selectedClient && (
        <ClientModal
          client={selectedClient}
          clientDetails={clientDetails}
          isLoadingDetails={isLoadingClientDetails}
          onClose={() => {
            setSelectedClient(null);
            setClientDetails(null);
          }}
          onDelete={(client) => {
            setPendingClientDelete(client);
            setSelectedClient(null);
            setClientDetails(null);
          }}
        />
      )}
    </div>
  );
}
