import './Simulations.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Icon, Loader, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { fetchAdminSimulations } from '../../../services/adminMongo';
import { fetchExportedDocuments, subscribeExportedDocumentsChange } from '../../../services/exportedDocuments';
import { fetchProjects, subscribeProjectsChange } from '../../../services/projects';
import SimulationModal from './simulationModal';

const HIDDEN_SIMULATIONS_KEY = 'archiprice:admin-hidden-simulations';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function readHiddenSimulationIds() {
  try {
    return JSON.parse(window.localStorage.getItem(HIDDEN_SIMULATIONS_KEY) || '[]').map(String);
  } catch {
    return [];
  }
}

function writeHiddenSimulationIds(ids) {
  try {
    window.localStorage.setItem(HIDDEN_SIMULATIONS_KEY, JSON.stringify(ids));
  } catch {
    // La liste reste manipulable en mémoire si le stockage navigateur est indisponible.
  }
}

function mergeSimulationSources(items) {
  const simulationsById = new Map();

  items.forEach((item) => {
    if (!item?.id || simulationsById.has(item.id)) return;
    simulationsById.set(item.id, item);
  });

  return [...simulationsById.values()];
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
    sourceType: 'export',
    sourceId: document.id,
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

function mapProjectToSimulation(project) {
  return {
    id: `project-${project.id}`,
    sourceType: 'project',
    sourceId: project.id,
    user: project.clientName || project.userName || 'Utilisateur ArchiPrice',
    email: project.userEmail || 'Projet workspace',
    avatar: 'PW',
    date: formatExportDate(project.updatedAt || project.createdAt),
    total: formatFCFA(project.budget || project.amount || project.total || 0),
    products: project.itemCount || project.items?.length || 0,
    status: project.status === 'draft' ? 'Projet créé' : project.status || 'Projet créé',
    city: project.city || project.name || '-',
    coefficient: project.coefficient || '1,00',
    items: project.items || [],
    projectName: project.name || 'Projet sans nom',
  };
}

export default function Simulations() {
  const [searchParams] = useSearchParams();
  const [simulations, setSimulations] = useState([]);
  const [exportedDocuments, setExportedDocuments] = useState(() => fetchExportedDocuments());
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hiddenSimulationIds, setHiddenSimulationIds] = useState(readHiddenSimulationIds);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    fetchProjects()
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });

    const unsubscribe = subscribeProjectsChange((list) => {
      if (!cancelled) setProjects(list);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const synchronizedSimulations = useMemo(() => mergeSimulationSources([
    ...projects.map(mapProjectToSimulation),
    ...exportedDocuments.map(mapExportToSimulation),
    ...simulations.map((simulation) => ({
      ...simulation,
      sourceType: simulation.sourceType || simulation.source || 'simulation',
      sourceId: simulation.sourceId || simulation.projectId || simulation.id,
    })),
  ]).filter((simulation) => !hiddenSimulationIds.includes(String(simulation.id))), [
    exportedDocuments,
    hiddenSimulationIds,
    projects,
    simulations,
  ]);

  const filteredSimulations = useMemo(() => {
    const normalizedSearch = (searchParams.get('q') || '').trim().toLowerCase();

    return synchronizedSimulations.filter((simulation) => {
      const matchesSearch = !normalizedSearch
        || String(simulation.user || '').toLowerCase().includes(normalizedSearch)
        || String(simulation.email || '').toLowerCase().includes(normalizedSearch)
        || String(simulation.projectName || '').toLowerCase().includes(normalizedSearch)
        || String(simulation.city || '').toLowerCase().includes(normalizedSearch);

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

  function hideSimulation(simulation) {
    const nextHiddenIds = Array.from(new Set([...hiddenSimulationIds, String(simulation.id)]));
    setHiddenSimulationIds(nextHiddenIds);
    writeHiddenSimulationIds(nextHiddenIds);
    if (selectedSimulation?.id === simulation.id) setSelectedSimulation(null);
    setSuccessMessage('Simulation retirée de la vue admin.');
  }

  function resetSimulationView() {
    setIsResetConfirmOpen(true);
  }

  function confirmResetSimulations() {
    const nextHiddenIds = synchronizedSimulations.map((simulation) => String(simulation.id));
    setHiddenSimulationIds(nextHiddenIds);
    writeHiddenSimulationIds(nextHiddenIds);
    setSelectedSimulation(null);
    setIsResetConfirmOpen(false);
    setSuccessMessage('Liste des simulations réinitialisée.');
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
      key: 'actions',
      label: '',
      render: (_value, simulation) => (
        <button
          type="button"
          className="admin-simulations-delete"
          title="Retirer de la vue"
          aria-label={`Retirer la simulation de ${simulation.user || 'cet utilisateur'}`}
          onClick={(event) => {
            event.stopPropagation();
            hideSimulation(simulation);
          }}
        >
          <Icon name="Delete" size="sm" />
        </button>
      ),
    },
  ];

  return (
    <div className="admin-simulations-page">
      <header className="admin-simulations-header">
        <div />
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Icon name="History" size="sm" />}
          onClick={resetSimulationView}
          disabled={synchronizedSimulations.length === 0}
          
        >
          Réinitialiser
        </Button>
      </header>

      {error && <Alert variant="danger" className="admin-simulations-alert">{error}</Alert>}
      {successMessage && (
        <Alert variant="success" className="admin-simulations-alert" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {isResetConfirmOpen && (
        <Alert
          variant="warning"
          title="Réinitialiser les simulations"
          className="admin-simulations-confirm-alert"
          onClose={() => setIsResetConfirmOpen(false)}
        >
          <span>Supprimer toute la liste des simulations ? Cette action est irréversible dans la vue admin.</span>
          <span className="admin-simulations-confirm-alert__actions">
            <button type="button" onClick={() => setIsResetConfirmOpen(false)}>Annuler</button>
            <button type="button" onClick={confirmResetSimulations}>Supprimer</button>
          </span>
        </Alert>
      )}

      <section className="admin-simulations-card" aria-label="Liste des simulations">
        {isLoading ? (
          <Loader label="Chargement des simulations..." />
        ) : (
          <Table
            className="admin-simulations-list"
            columns={simulationColumns}
            data={filteredSimulations}
            getRowId={(simulation, index) => simulation.id || `${simulation.email || 'simulation'}-${index}`}
            onRowClick={setSelectedSimulation}
            emptyLabel="Aucune simulation trouvée."
          />
        )}
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
