import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Icon } from '../../components/ui';
import { getApiErrorMessage } from '../../services/api';
import { fetchAdminSimulations } from '../../services/adminMongo';
import { Badge } from './PageShell';

const STATUS_OPTIONS = ['Tous', 'Succès', 'Échec'];

export default function Simulations() {
  const [searchParams] = useSearchParams();
  const [simulations, setSimulations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSimulationId, setSelectedSimulationId] = useState('');
  const [draftSearchTerm, setDraftSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftStatusFilter, setDraftStatusFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState('Tous');

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

  const filteredSimulations = useMemo(() => {
    const normalizedSearch = [searchTerm, searchParams.get('q') || ''].join(' ').trim().toLowerCase();

    return simulations.filter((simulation) => {
      const matchesSearch = !normalizedSearch
        || String(simulation.user || '').toLowerCase().includes(normalizedSearch)
        || String(simulation.email || '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'Tous' || simulation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchParams, searchTerm, simulations, statusFilter]);

  const selectedSimulation = useMemo(() => (
    simulations.find((simulation) => simulation.id === selectedSimulationId) || filteredSimulations[0] || simulations[0]
  ), [filteredSimulations, selectedSimulationId, simulations]);

  const selectedItems = selectedSimulation?.items || [];

  function applySimulationFilters() {
    setSearchTerm(draftSearchTerm);
    setStatusFilter(draftStatusFilter);
  }

  return (
    <div className="admin-simulations-page">
      <header className="admin-simulations-header">
        <h1>Simulations</h1>
        {error && <p className="admin-products-empty">{error}</p>}

        <div className="admin-simulations-toolbar">
          <label className="admin-simulations-date">
            <span>Du</span>
            <input type="text" value="01/05/2024" readOnly />
            <span>au</span>
            <input type="text" value="31/12/2024" readOnly />
          </label>

          <label className="admin-simulations-search">
            <Icon name="Search" size="sm" />
            <span className="visually-hidden">Rechercher une simulation</span>
            <input
              type="search"
              placeholder="Rechercher un utilisateur..."
              value={draftSearchTerm}
              onChange={(event) => setDraftSearchTerm(event.target.value)}
            />
          </label>

          <label className="admin-simulations-status">
            <span>Statut :</span>
            <select value={draftStatusFilter} onChange={(event) => setDraftStatusFilter(event.target.value)}>
              {STATUS_OPTIONS.map((status, index) => (
                <option key={`${status}-${index}`} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <Button type="button" onClick={applySimulationFilters}>
            Appliquer
          </Button>

          <Button type="button" variant="outline" icon={<Icon name="Download" size="sm" />}>
            Exporter CSV
          </Button>
        </div>
      </header>

      <div className="admin-simulations-layout">
        <section className="admin-simulations-card" aria-label="Liste des simulations">
          <div className="admin-simulations-table-wrap">
            <table className="admin-simulations-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Date</th>
                  <th>Budget total</th>
                  <th>Articles</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="admin-products-empty">Chargement des simulations Mongo...</td>
                  </tr>
                ) : filteredSimulations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="admin-products-empty">Aucune simulation trouvée.</td>
                  </tr>
                ) : filteredSimulations.map((simulation, index) => (
                  <tr
                    key={`${simulation.id || simulation.email}-${index}`}
                    className={simulation.id === selectedSimulation?.id ? 'is-selected' : ''}
                    onClick={() => setSelectedSimulationId(simulation.id)}
                  >
                    <td>
                      <span className="admin-simulations-user">
                        <span className="admin-simulations-avatar">{simulation.avatar}</span>
                        <span>
                          <strong>{simulation.user}</strong>
                          <small>{simulation.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>{simulation.date}</td>
                    <td>{simulation.total}</td>
                    <td>{simulation.products}</td>
                    <td>
                      <Badge tone={simulation.status === 'Succès' ? 'success' : 'danger'}>
                        {simulation.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="admin-simulations-pagination" aria-label="Pagination simulations">
            <div className="admin-simulations-pages">
              <button type="button" aria-label="Page précédente">
                <Icon name="ChevronLeft" size="sm" />
              </button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <span>...</span>
              <button type="button">7</button>
              <button type="button" aria-label="Page suivante">
                <Icon name="ChevronRight" size="sm" />
              </button>
            </div>

            <label className="admin-simulations-count">
              <select defaultValue="20 / page">
                <option>20 / page</option>
                <option>50 / page</option>
              </select>
            </label>
          </footer>
        </section>

        <aside className="admin-simulation-detail" aria-label="Détail de la simulation">
          <div className="admin-simulation-detail__header">
            <h2>Détail de la simulation</h2>
            <button type="button" aria-label="Fermer le détail">
              <Icon name="Close" size="sm" />
            </button>
          </div>

          <dl className="admin-simulation-detail__meta">
            <div>
              <dt>Utilisateur</dt>
              <dd>
                <span>{String(selectedSimulation?.user || '-').split(' ')[0]}</span>
                <strong>{selectedSimulation?.user || '-'} ({selectedSimulation?.email || '-'})</strong>
              </dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{selectedSimulation?.date || '-'}</dd>
            </div>
            <div>
              <dt>Ville</dt>
              <dd>{selectedSimulation?.city || '-'}</dd>
            </div>
            <div>
              <dt>Coefficient coût</dt>
              <dd>{selectedSimulation?.coefficient || '-'}</dd>
            </div>
          </dl>

          <div className="admin-simulation-products">
            <h3>Articles ({selectedItems.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Qté</th>
                  <th>Prix unit. HT</th>
                  <th>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan="4">Aucun article disponible.</td>
                  </tr>
                ) : (
                  selectedItems.map((item, index) => (
                    <tr key={`${selectedSimulation?.id || 'simulation'}-${item.name}-${index}`}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.price}</td>
                      <td>{item.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-simulation-detail__total">
            <span>Total HT</span>
            <strong>{selectedSimulation?.total || '-'}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
