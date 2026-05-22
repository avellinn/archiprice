import { useMemo, useState } from 'react';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { useAdminData } from '../../services/adminData';
import { Badge } from './PageShell';

const SUPPORT_TABS = [
  { id: 'tickets', label: 'Tickets' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'priceReports', label: 'Signalements prix' },
];

const SUPPORT_ITEMS = [
  {
    id: 'ticket-export',
    tab: 'tickets',
    subject: "Impossible d'exporter une simulation",
    user: 'Jean Dupont',
    email: 'jean.dupont@mail.com',
    status: 'Ouvert',
    type: 'Bug',
    date: '12/05/2024',
    description: "Lorsque j'essaie d'exporter la simulation, le fichier ne se télécharge pas.",
  },
  {
    id: 'ticket-cartilage',
    tab: 'tickets',
    subject: 'Prix incorrect sur carrelage',
    user: 'Sophia Martin',
    email: 'sophia.martin@mail.com',
    status: 'En cours',
    type: 'Prix',
    date: '11/05/2024',
    description: 'Le prix affiché dans la simulation ne correspond pas au prix fournisseur.',
  },
  {
    id: 'ticket-csv',
    tab: 'tickets',
    subject: "Erreur lors de l'import CSV",
    user: 'Agence Créa',
    email: 'contact@agencecrea.bj',
    status: 'Ouvert',
    type: 'Bug',
    date: '10/05/2024',
    description: "Le fichier CSV s'arrête à la troisième ligne pendant l'import.",
  },
  {
    id: 'ticket-coefficients',
    tab: 'tickets',
    subject: 'Question sur les coefficients',
    user: 'Marc Koffi',
    email: 'marc.koffi@mail.com',
    status: 'Résolu',
    type: 'Question',
    date: '09/05/2024',
    description: 'Je souhaite comprendre comment le coefficient régional modifie le budget final.',
  },
  {
    id: 'feedback-navigation',
    tab: 'feedback',
    subject: 'Navigation plus fluide',
    user: 'Jean Dupont',
    email: 'jean.dupont@mail.com',
    status: 'Ouvert',
    type: 'Suggestion',
    date: '08/05/2024',
    description: 'Ajouter un raccourci vers le catalogue depuis la page workspace rendrait le parcours plus rapide.',
  },
  {
    id: 'feedback-dashboard',
    tab: 'feedback',
    subject: 'Dashboard clair',
    user: 'Sophia Martin',
    email: 'sophia.martin@mail.com',
    status: 'Résolu',
    type: 'Avis',
    date: '07/05/2024',
    description: 'La répartition des projets est lisible et aide à suivre les estimations.',
  },
  {
    id: 'price-report-oslo',
    tab: 'priceReports',
    subject: 'Canapé Oslo trop élevé',
    user: 'Agence Créa',
    email: 'contact@agencecrea.bj',
    status: 'En cours',
    type: 'Signalement prix',
    date: '06/05/2024',
    description: 'Le prix du Canapé 3 places Oslo semble supérieur à celui observé chez le fournisseur.',
  },
  {
    id: 'price-report-led',
    tab: 'priceReports',
    subject: 'Applique LED à vérifier',
    user: 'Marc Koffi',
    email: 'marc.koffi@mail.com',
    status: 'Ouvert',
    type: 'Signalement prix',
    date: '05/05/2024',
    description: 'Le prix unitaire de l’applique murale LED doit être synchronisé avec Lumière & Co.',
  },
];

const STATUS_OPTIONS = ['Tous', 'Ouvert', 'En cours', 'Résolu'];
const TYPE_OPTIONS = ['Tous', 'Bug', 'Prix', 'Question', 'Suggestion', 'Avis', 'Signalement prix'];

function getStatusTone(status) {
  if (status === 'Ouvert') return 'danger';
  if (status === 'En cours') return 'warning';
  return 'success';
}

export default function Support() {
  const [adminData, setAdminData] = useAdminData();
  const supportItems = adminData.supportItems.length ? adminData.supportItems : SUPPORT_ITEMS;
  const [activeTab, setActiveTab] = useState('tickets');
  const [selectedItemId, setSelectedItemId] = useState('ticket-export');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [typeFilter, setTypeFilter] = useState('Tous');

  const activeItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return supportItems.filter((item) => {
      const matchesTab = item.tab === activeTab;
      const matchesSearch = !normalizedSearch
        || item.subject.toLowerCase().includes(normalizedSearch)
        || item.user.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'Tous' || item.status === statusFilter;
      const matchesType = typeFilter === 'Tous' || item.type === typeFilter;

      return matchesTab && matchesSearch && matchesStatus && matchesType;
    });
  }, [activeTab, searchTerm, statusFilter, supportItems, typeFilter]);

  const selectedItem = useMemo(() => (
    supportItems.find((item) => item.id === selectedItemId && item.tab === activeTab)
    || activeItems[0]
    || supportItems.find((item) => item.tab === activeTab)
    || supportItems[0]
  ), [activeItems, activeTab, selectedItemId, supportItems]);

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    const firstItem = supportItems.find((item) => item.tab === tabId);
    if (firstItem) setSelectedItemId(firstItem.id);
  }

  function updateSelectedItem(patch) {
    setAdminData((currentData) => ({
      ...currentData,
      supportItems: currentData.supportItems.map((item) => (
        item.id === selectedItem.id ? { ...item, ...patch } : item
      )),
    }));
  }

  return (
    <div className="admin-support-page">
      <section className="admin-support-main">
        <header className="admin-support-header">
          <h1>Support</h1>

          <nav className="admin-support-tabs" aria-label="Sections support">
            {SUPPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'is-active' : ''}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="admin-support-toolbar">
          <label className="admin-support-search">
            <Icon name="Search" size="sm" />
            <span className="visually-hidden">Rechercher un ticket</span>
            <input
              type="search"
              placeholder="Rechercher un ticket..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="admin-support-select">
            <span>Statut :</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="admin-support-select">
            <span>Type :</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-support-table-card">
          <table className="admin-support-table">
            <thead>
              <tr>
                <th>Sujet</th>
                <th>Utilisateur</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-support-empty">Aucune demande trouvée.</td>
                </tr>
              ) : (
                activeItems.map((item) => (
                  <tr key={item.id} className={item.id === selectedItem.id ? 'is-selected' : ''}>
                    <td>{item.subject}</td>
                    <td>{item.user}</td>
                    <td>
                      <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
                    </td>
                    <td>{item.date}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-support-view"
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="admin-support-detail" aria-label="Détail du ticket">
        <div className="admin-support-detail__header">
          <h2>Détail du ticket</h2>
          <button type="button" aria-label="Fermer le détail">
            <Icon name="Close" size="sm" />
          </button>
        </div>

        <dl className="admin-support-detail__meta">
          <div>
            <dt>Type</dt>
            <dd>{selectedItem.type}</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>
              <Badge tone={getStatusTone(selectedItem.status)}>{selectedItem.status}</Badge>
            </dd>
          </div>
          <div>
            <dt>Utilisateur</dt>
            <dd>
              <strong>{selectedItem.user}</strong>
              <span>{selectedItem.email}</span>
            </dd>
          </div>
          <div>
            <dt>Sujet</dt>
            <dd>{selectedItem.subject}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{selectedItem.description}</dd>
          </div>
        </dl>

        <label className="admin-support-reply">
          <span>Réponse</span>
          <textarea
            placeholder="Votre réponse..."
            value={selectedItem.reply || ''}
            onChange={(event) => updateSelectedItem({ reply: event.target.value })}
          />
        </label>

        <div className="admin-support-actions">
          <Button type="button" variant="success" size="sm" onClick={() => updateSelectedItem({ status: 'Résolu' })}>
            Fermer le ticket
          </Button>
          <Button type="button" size="md" onClick={() => updateSelectedItem({ status: 'En cours' })}>
            Envoyer
          </Button>
        </div>
      </aside>
    </div>
  );
}
