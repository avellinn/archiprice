import { useMemo, useState } from 'react';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { useAdminData } from '../../services/adminData';
import { Badge } from './PageShell';

const SIMULATIONS = [
  {
    id: 'sim-jean-1205',
    user: 'Jean Dupont',
    email: 'jean.dupont@mail.com',
    date: '12/05/2024 14:30',
    total: '12 450,00 €',
    products: 28,
    status: 'Succès',
    city: 'Cotonou',
    coefficient: '1,00',
    avatar: 'JD',
    items: [
      { name: 'Canapé 3 places Oslo', quantity: '1', price: '890,00 €', total: '890,00 €' },
      { name: 'Table basse ronde Léon', quantity: '1', price: '210,00 €', total: '210,00 €' },
      { name: 'Suspension en verre Mia', quantity: '2', price: '120,00 €', total: '240,00 €' },
      { name: 'Carrelage gris cérame 60x60', quantity: '20 m²', price: '25,00 €', total: '500,00 €' },
      { name: 'Peinture intérieure mat blanc', quantity: '10 L', price: '32,50 €', total: '325,00 €' },
    ],
  },
  {
    id: 'sim-sophia-1105',
    user: 'Sophia Martin',
    email: 'sophia.martin@mail.com',
    date: '11/05/2024 10:12',
    total: '8 920,00 €',
    products: 16,
    status: 'Succès',
    city: 'Abidjan',
    coefficient: '1,08',
    avatar: 'SM',
    items: [
      { name: 'Chaise de bureau Ergo', quantity: '4', price: '150,00 €', total: '600,00 €' },
      { name: 'Bibliothèque en bois Clara', quantity: '2', price: '330,00 €', total: '660,00 €' },
      { name: 'Applique murale LED', quantity: '6', price: '75,00 €', total: '450,00 €' },
    ],
  },
  {
    id: 'sim-agence-1005',
    user: 'Agence Créa',
    email: 'contact@agencenova.bj',
    date: '10/05/2024 16:45',
    total: '21 350,00 €',
    products: 42,
    status: 'Succès',
    city: 'Cotonou',
    coefficient: '1,00',
    avatar: 'AC',
    items: [
      { name: 'Canapé 3 places Oslo', quantity: '3', price: '890,00 €', total: '2 670,00 €' },
      { name: 'Table basse ronde Léon', quantity: '3', price: '210,00 €', total: '630,00 €' },
      { name: 'Carrelage gris cérame 60x60', quantity: '80 m²', price: '25,00 €', total: '2 000,00 €' },
    ],
  },
  {
    id: 'sim-jean-0905',
    user: 'Jean Dupont',
    email: 'jean.dupont@mail.com',
    date: '09/05/2024 09:15',
    total: '-',
    products: '-',
    status: 'Échec',
    city: 'Cotonou',
    coefficient: '1,00',
    avatar: 'JD',
    items: [],
  },
  {
    id: 'sim-marc-0805',
    user: 'Marc Koffi',
    email: 'marc.koffi@mail.com',
    date: '08/05/2024 11:00',
    total: '6 230,00 €',
    products: 12,
    status: 'Succès',
    city: 'Parakou',
    coefficient: '0,96',
    avatar: 'MK',
    items: [
      { name: 'Peinture intérieure mat blanc', quantity: '20 L', price: '32,50 €', total: '650,00 €' },
      { name: 'Suspension en verre Mia', quantity: '3', price: '120,00 €', total: '360,00 €' },
    ],
  },
];

const STATUS_OPTIONS = ['Tous', 'Succès', 'Échec'];

export default function Simulations() {
  const [adminData] = useAdminData();
  const simulations = adminData.simulations.length ? adminData.simulations : SIMULATIONS;
  const [selectedSimulationId, setSelectedSimulationId] = useState(SIMULATIONS[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');

  const filteredSimulations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return simulations.filter((simulation) => {
      const matchesSearch = !normalizedSearch
        || simulation.user.toLowerCase().includes(normalizedSearch)
        || simulation.email.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'Tous' || simulation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, simulations, statusFilter]);

  const selectedSimulation = useMemo(() => (
    simulations.find((simulation) => simulation.id === selectedSimulationId) || filteredSimulations[0] || simulations[0]
  ), [filteredSimulations, selectedSimulationId, simulations]);

  const selectedItems = selectedSimulation.items || adminData.products.slice(0, 5).map((product, index) => ({
    name: product.name,
    quantity: index === 0 ? '1' : `${index + 1}`,
    price: product.price,
    total: product.price,
  }));

  return (
    <div className="admin-simulations-page">
      <header className="admin-simulations-header">
        <h1>Simulations</h1>

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
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="admin-simulations-status">
            <span>Statut :</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

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
                  <th>Produits</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredSimulations.map((simulation) => (
                  <tr
                    key={simulation.id}
                    className={simulation.id === selectedSimulation.id ? 'is-selected' : ''}
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
                <span>Jean</span>
                <strong>{selectedSimulation.user} ({selectedSimulation.email})</strong>
              </dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{selectedSimulation.date}</dd>
            </div>
            <div>
              <dt>Ville</dt>
              <dd>{selectedSimulation.city}</dd>
            </div>
            <div>
              <dt>Coefficient coût</dt>
              <dd>{selectedSimulation.coefficient}</dd>
            </div>
          </dl>

          <div className="admin-simulation-products">
            <h3>Produits ({selectedItems.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>Prix unit. HT</th>
                  <th>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan="4">Aucun produit disponible.</td>
                  </tr>
                ) : (
                  selectedItems.map((item) => (
                    <tr key={`${selectedSimulation.id}-${item.name}`}>
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
            <strong>{selectedSimulation.total}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
