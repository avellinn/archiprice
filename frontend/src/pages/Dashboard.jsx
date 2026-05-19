import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

const MONTH_ACTIVITY = [
  { label: 'Jan', value: 18 },
  { label: 'Fév', value: 30 },
  { label: 'Mar', value: 22 },
  { label: 'Avr', value: 47 },
  { label: 'Mai', value: 38 },
  { label: 'Juin', value: 62 },
  { label: 'Juil', value: 55 },
  { label: 'Août', value: 76 },
];

const STATUS_COPY = {
  draft: 'Brouillon',
  active: 'En cours',
  archived: 'Terminé',
  completed: 'Terminé',
  done: 'Terminé',
};

function isFinished(project) {
  return ['archived', 'completed', 'done'].includes(project.status);
}

function formatDate(value) {
  if (!value) return 'Date non renseignée';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function Dashboard() {
  const { logout } = useAuth();
  const [projects] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

  const stats = useMemo(() => {
    const completed = projects.filter(isFinished).length;
    const active = Math.max(projects.length - completed, 0);
    const processed = projects.filter((project) => project.status !== 'draft').length;

    return {
      total: projects.length,
      active,
      completed,
      processed,
    };
  }, [projects]);

  const history = projects.slice(0, 4);

  function handleSearchSubmit() {
    const query = searchValue.trim();
    setSearchMessage(query ? `Recherche lancée : ${query}` : 'Saisissez un mot-clé pour rechercher.');
  }

  function scrollToPanel(panelId) {
    document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleLogout() {
    setIsAccountOpen(false);
    logout();
  }

  return (
    <main
      className={[
        'dashboard-shell',
        isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
        isThemeDark ? 'is-theme-dark' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <aside className="dashboard-sidebar" aria-label="Navigation dashboard">
        <Link to="/" className="dashboard-brand" aria-label="ArchiPrice accueil">
          <span className="dashboard-brand-mark">A</span>
          <span>ArchiPrice</span>
        </Link>

        <nav className="dashboard-nav">
          <Link to="/dashboard" className="dashboard-nav-link is-active">
            <span className="nav-icon nav-icon-grid" aria-hidden="true" />
            <span className="dashboard-nav-text">Dashboard</span>
          </Link>
          <button
            type="button"
            className="dashboard-nav-link"
            onClick={() => scrollToPanel('processed-projects')}
          >
            <span className="nav-icon nav-icon-chat" aria-hidden="true" />
            <span className="dashboard-nav-text">Projets traités</span>
          </button>
          <button
            type="button"
            className="dashboard-nav-link"
            onClick={() => scrollToPanel('project-history')}
          >
            <span className="nav-icon nav-icon-clock" aria-hidden="true" />
            <span className="dashboard-nav-text">Historique</span>
          </button>
          <button
            type="button"
            className="dashboard-nav-link"
            onClick={() => scrollToPanel('project-quotes')}
          >
            <span className="nav-icon nav-icon-folder" aria-hidden="true" />
            <span className="dashboard-nav-text">Devis</span>
          </button>
        </nav>

        <button type="button" className="dashboard-logout" onClick={logout}>
          Déconnexion
        </button>
      </aside>

      <section className="dashboard-content">
        <Header
          currentPage="Tableau de bord"
          isAccountOpen={isAccountOpen}
          isNotificationsOpen={isNotificationsOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          isThemeDark={isThemeDark}
          searchValue={searchValue}
          onAccountClick={() => {
            setIsAccountOpen((open) => !open);
            setIsNotificationsOpen(false);
          }}
          onLogout={handleLogout}
          onMenuClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          onNotificationsClick={() => {
            setIsNotificationsOpen((open) => !open);
            setIsAccountOpen(false);
          }}
          onSearchChange={setSearchValue}
          onSearchSubmit={handleSearchSubmit}
          onThemeToggle={() => setIsThemeDark((dark) => !dark)}
        />

        {isNotificationsOpen && (
          <div className="dashboard-floating-panel notification-panel">
            <strong>Notifications</strong>
            <span>Aucune nouvelle notification pour le moment.</span>
          </div>
        )}

        {searchMessage && (
          <button
            type="button"
            className="dashboard-search-message"
            onClick={() => setSearchMessage('')}
          >
            {searchMessage}
          </button>
        )}

        <div className="dashboard-grid">
          <section id="processed-projects" className="dashboard-stats" aria-label="Résumé des projets">
            <article className="stat-card stat-blue">
              <span>Projets en cours</span>
              <strong>{String(stats.active).padStart(2, '0')}</strong>
              <svg viewBox="0 0 78 34" aria-hidden="true">
                <path d="M4 23 C16 10 22 30 35 16 S58 6 74 10" />
              </svg>
            </article>
            <article className="stat-card stat-yellow">
              <span>Projets terminés</span>
              <strong>{String(stats.completed).padStart(2, '0')}</strong>
              <svg viewBox="0 0 78 34" aria-hidden="true">
                <path d="M4 24 C18 12 24 22 35 18 S50 29 74 7" />
              </svg>
            </article>
            <article className="stat-card stat-red">
              <span>Projets traités</span>
              <strong>{String(stats.processed).padStart(2, '0')}</strong>
              <svg viewBox="0 0 78 34" aria-hidden="true">
                <path d="M4 22 C13 17 19 27 30 20 S46 10 55 19 S66 9 74 13" />
              </svg>
            </article>
            <article className="stat-card stat-cyan">
              <span>Total projets</span>
              <strong>{String(stats.total).padStart(2, '0')}</strong>
              <svg viewBox="0 0 78 34" aria-hidden="true">
                <path d="M4 21 C18 20 17 12 29 13 S39 25 50 20 S58 6 74 16" />
              </svg>
            </article>
          </section>

          <section className="dashboard-panel activity-panel">
            <div className="panel-heading">
              <h1>Activité des projets</h1>
              <span>Chiffrage vs validation</span>
            </div>
            <div className="line-chart" aria-label="Graphique d'activité mensuelle">
              <svg viewBox="0 0 420 210" role="img">
                <defs>
                  <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffac4a" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#ffac4a" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  className="chart-fill"
                  d="M30 162 C55 78 86 120 112 118 S150 146 178 75 S225 116 252 58 S300 106 329 42 S376 104 394 18 L394 184 L30 184 Z"
                />
                <path
                  className="chart-line"
                  d="M30 162 C55 78 86 120 112 118 S150 146 178 75 S225 116 252 58 S300 106 329 42 S376 104 394 18"
                />
                <circle cx="112" cy="118" r="5" />
                <circle cx="329" cy="42" r="5" />
              </svg>
              <div className="chart-axis">
                {MONTH_ACTIVITY.map((item) => (
                  <span key={item.label}>{item.label}</span>
                ))}
              </div>
              <div className="chart-legend">
                <span><i className="legend-blue" /> Chiffrage</span>
                <span><i className="legend-orange" /> Validation</span>
              </div>
            </div>
          </section>

          <section id="project-history" className="dashboard-panel history-panel">
            <div className="panel-heading row-heading">
              <h2>Historique</h2>
              <span>Filtrer par date : Tout</span>
            </div>
            {history.length === 0 ? (
              <p className="muted history-empty">Aucun projet enregistré pour le moment.</p>
            ) : (
              <ul className="history-list">
                {history.map((project, index) => (
                  <li key={project.id}>
                    <span className={`history-icon history-icon-${index + 1}`} aria-hidden="true" />
                    <div>
                      <strong>{project.name}</strong>
                      <span>
                        {STATUS_COPY[project.status] ?? project.status} ·{' '}
                        {formatDate(project.updatedAt || project.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="project-quotes" className="dashboard-panel repartition-panel">
            <div className="panel-heading">
              <h2>Répartition</h2>
              <span>Par état de projet</span>
            </div>
            <div className="donut-layout">
              <div className="donut-legend">
                <span><i className="legend-orange" /> {stats.active} en cours</span>
                <span><i className="legend-blue" /> {stats.completed} terminés</span>
                <span><i className="legend-dark" /> {stats.total} au total</span>
              </div>
              <div className="donut-chart" aria-label="Répartition des projets">
                <span>{stats.total || 0}</span>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
