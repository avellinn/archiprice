import './Simulations.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { fetchAdminSimulations } from '../../../services/adminMongo';
import { fetchExportedDocuments, subscribeExportedDocumentsChange } from '../../../services/exportedDocuments';
import { Badge } from '../PageShell';
import SimulationModal from './simulationModal';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function formatExportDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function mapExportToSimulation(document) {
  return {
    id: `exported-${document.id}`,
    user: document.userName || 'Utilisateur ArchiPrice',
    email: document.userEmail || 'Compte user',
    avatar: 'AP',
    date: formatExportDate(document.exportedAt),
    total: formatFCFA(document.amount),
    products: document.itemCount || document.items?.length || 0,
    status: document.status || 'Succès',
    city: document.city || document.projectName || '-',
    coefficient: document.coefficient || '1,00',
    items: (document.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity || 1,
      price: item.price || formatFCFA(item.rawPrice),
      total: item.total || formatFCFA(item.rawPrice),
      imageUrl: item.imageUrl || item.images?.[0]?.secure_url || item.images?.[0]?.url || '',
      images: item.images || [],
    })),
  };
}

export default function Simulations() {
  const [searchParams] = useSearchParams();
  const [simulations, setSimulations] = useState([]);
  const [exportedDocuments, setExportedDocuments] = useState(() => fetchExportedDocuments());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSimulation, setSelectedSimulation] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchAdminSimulations()
      .then((list) => {
        if (!cancelled) {
          setSimulations(list);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les simulations Mongo.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribeExportedDocumentsChange(setExportedDocuments), []);

  const synchronizedSimulations = useMemo(() => ([
    ...exportedDocuments.map(mapExportToSimulation),
    ...simulations,
  ]), [exportedDocuments, simulations]);

  const filteredSimulations = useMemo(() => {
    const normalizedSearch = (searchParams.get('q') || '').trim().toLowerCase();

    return synchronizedSimulations.filter((simulation) => {
      const matchesSearch = !normalizedSearch
        || String(simulation.user || '').toLowerCase().includes(normalizedSearch)
        || String(simulation.email || '').toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });
  }, [searchParams, synchronizedSimulations]);

  function renderSimulationUser(simulation) {
    return (
      <span className="admin-simulations-user">
        <span className="admin-simulations-avatar">{simulation.avatar}</span>
        <span>
          <strong>{simulation.user}</strong>
          <small>{simulation.email}</small>
        </span>
      </span>
    );
  }

  const simulationColumns = [
    {
      key: 'user',
      label: 'Utilisateur',
      render: (_value, simulation) => renderSimulationUser(simulation),
    },
    { key: 'date', label: 'Date' },
    { key: 'total', label: 'Budget total' },
    { key: 'products', label: 'Articles' },
    {
      key: 'status',
      label: 'Statut',
      render: (status) => (
        <Badge tone={status === 'Succès' ? 'success' : 'danger'}>
          {status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="admin-simulations-page">
      {error && <Alert variant="danger" className="admin-simulations-alert">{error}</Alert>}

      <section className="admin-simulations-card" aria-label="Liste des simulations">
        <Table
          className="admin-simulations-list"
          columns={simulationColumns}
          data={isLoading ? [] : filteredSimulations}
          getRowId={(simulation, index) => simulation.id || `${simulation.email || 'simulation'}-${index}`}
          onRowClick={setSelectedSimulation}
          emptyLabel={isLoading ? 'Chargement des simulations Mongo...' : 'Aucune simulation trouvée.'}
        />
      </section>

      {selectedSimulation && (
        <SimulationModal
          simulation={selectedSimulation}
          onClose={() => setSelectedSimulation(null)}
        />
      )}
    </div>
  );
}
