import './Simulations.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Icon, Loader, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { fetchAdminSimulations, deleteAdminSimulation, resetAdminSimulations } from '../../../services/adminMongo';
import SimulationModal from './simulationModal';

const HIDDEN_SIMULATIONS_KEY = 'archiprice:admin-hidden-simulations';

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

export default function Simulations() {
  const [searchParams] = useSearchParams();
  const [simulations, setSimulations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hiddenSimulationIds, setHiddenSimulationIds] = useState(readHiddenSimulationIds);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadSimulations = useCallback(() => {
    fetchAdminSimulations()
      .then((list) => {
        setSimulations(list);
        setError('');
      })
      .catch((apiError) => {
        setError(getApiErrorMessage(apiError, 'Impossible de charger les simulations Mongo.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadSimulations();
  }, [loadSimulations]);

  useRealtimeRefresh(loadSimulations, ['simulations']);

  const synchronizedSimulations = useMemo(() => mergeSimulationSources([
    ...simulations.map((simulation) => ({
      ...simulation,
      sourceType: simulation.sourceType || simulation.source || 'simulation',
      sourceId: simulation.sourceId || simulation.projectId || simulation.id,
    })),
  ]).filter((simulation) => !hiddenSimulationIds.includes(String(simulation.id))), [
    hiddenSimulationIds,
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

  async function hideSimulation(simulation) {
    const simulationId = String(simulation.id);

    try {
      if (!simulationId.startsWith('project-')) {
        await deleteAdminSimulation(simulationId);
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de supprimer la simulation.'));
      return;
    }

    const nextHiddenIds = Array.from(new Set([...hiddenSimulationIds, simulationId]));
    setHiddenSimulationIds(nextHiddenIds);
    writeHiddenSimulationIds(nextHiddenIds);
    if (selectedSimulation?.id === simulation.id) setSelectedSimulation(null);
    setSuccessMessage('Simulation retirée de la vue admin.');
    loadSimulations();
  }

  function resetSimulationView() {
    setIsResetConfirmOpen(true);
  }

  async function confirmResetSimulations() {
    setIsResetting(true);
    setError('');

    try {
      await resetAdminSimulations();
      writeHiddenSimulationIds([]);
      setHiddenSimulationIds([]);
      setSelectedSimulation(null);
      setIsResetConfirmOpen(false);
      setSuccessMessage('Liste des simulations réinitialisée et synchronisée avec la base de données.');
      loadSimulations();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de réinitialiser les simulations.'));
    } finally {
      setIsResetting(false);
    }
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
          autoCloseMs={0}
          onClose={() => setIsResetConfirmOpen(false)}
        >
          <span>Supprimer toute la liste des simulations ? Cette action est irréversible dans la vue admin.</span>
          <span className="admin-simulations-confirm-alert__actions">
            <button type="button" onClick={() => setIsResetConfirmOpen(false)} disabled={isResetting}>Annuler</button>
            <button type="button" onClick={confirmResetSimulations} disabled={isResetting}>
              {isResetting ? 'Réinitialisation...' : 'Supprimer'}
            </button>
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
