import { useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import { createAdminId, useAdminData } from '../../services/adminData';
import { Badge } from './PageShell';

const SUBSCRIPTION_FLOW = ['Essai', 'Basique', 'Premium'];

function getNextSubscription(currentSubscription) {
  if (currentSubscription === '-') return '-';
  const currentIndex = SUBSCRIPTION_FLOW.indexOf(currentSubscription);
  return SUBSCRIPTION_FLOW[(currentIndex + 1) % SUBSCRIPTION_FLOW.length];
}

function getSimulationCount(user, simulations) {
  if (user.type === 'Admin') return '-';

  const count = simulations.filter((simulation) => simulation.email === user.email).length;
  return count || user.simulations || 0;
}

export default function Utilisateurs() {
  const [adminData, setAdminData] = useAdminData();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous');

  const users = useMemo(() => (
    adminData.users || []
  ), [adminData.users]);

  const userTypes = useMemo(() => (
    ['Tous', ...new Set(users.map((user) => user.type).filter(Boolean))]
  ), [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch = !normalizedSearch
        || user.name.toLowerCase().includes(normalizedSearch)
        || user.email.toLowerCase().includes(normalizedSearch);
      const matchesType = typeFilter === 'Tous' || user.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [searchTerm, typeFilter, users]);

  function updateUser(userId, patch) {
    setAdminData((currentData) => ({
      ...currentData,
      users: (currentData.users || []).map((user) => (
        user.id === userId ? { ...user, ...patch } : user
      )),
    }));
  }

  function addDemoUser() {
    setAdminData((currentData) => ({
      ...currentData,
      users: [
        {
          id: createAdminId('user'),
          name: 'Nouvel utilisateur',
          email: `user${Date.now()}@archiprice.com`,
          type: 'Architecte',
          simulations: 0,
          inscription: new Intl.DateTimeFormat('fr-FR').format(new Date()),
          status: 'Actif',
          subscription: 'Essai',
        },
        ...(currentData.users || []),
      ],
    }));
  }

  function deleteUser(userId) {
    setAdminData((currentData) => ({
      ...currentData,
      users: (currentData.users || []).filter((user) => user.id !== userId),
    }));
  }

  return (
    <div className="admin-users-management">
      <header className="admin-users-management__header">
        <h1>Utilisateurs</h1>

        <label className="admin-users-management__search">
          <Icon name="Search" size="sm" />
          <span className="visually-hidden">Rechercher un utilisateur</span>
          <input
            type="search"
            placeholder="Rechercher un nom, un email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="admin-users-management__filter">
          <span>Type :</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            {userTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <button type="button" className="admin-users-management__add" onClick={addDemoUser}>
          <Icon name="Add" size="sm" />
          Ajouter
        </button>
      </header>

      <section className="admin-users-management__card" aria-label="Liste des utilisateurs">
        <div className="admin-users-management__table-wrap">
          <table className="admin-users-management__table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Type</th>
                <th>Simulations</th>
                <th>Inscription</th>
                <th>Statut</th>
                <th>Abonnement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="admin-users-management__state">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.type}</td>
                    <td>{getSimulationCount(user, adminData.simulations)}</td>
                    <td>{user.inscription}</td>
                    <td>
                      <Badge tone={user.status === 'Actif' ? 'success' : 'danger'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td>
                      <span className={user.subscription === 'Premium' ? 'admin-users-management__premium' : ''}>
                        {user.subscription}
                      </span>
                    </td>
                    <td>
                      <div className="admin-users-management__actions">
                        <button
                          type="button"
                          aria-label={`Changer le type de ${user.name}`}
                          onClick={() => updateUser(user.id, {
                            type: user.type === 'Admin' ? 'Architecte' : 'Admin',
                            subscription: user.type === 'Admin' ? 'Essai' : '-',
                          })}
                        >
                          <Icon name="Workspaces" size="sm" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Changer l'abonnement de ${user.name}`}
                          onClick={() => updateUser(user.id, { subscription: getNextSubscription(user.subscription) })}
                        >
                          <Icon name="Link" size="sm" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Activer ou désactiver ${user.name}`}
                          onClick={() => updateUser(user.id, { status: user.status === 'Actif' ? 'Inactif' : 'Actif' })}
                        >
                          <Icon name="Visibility" size="sm" />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          aria-label={`Supprimer ${user.name}`}
                          onClick={() => deleteUser(user.id)}
                        >
                          <Icon name="Delete" size="sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-users-management__pagination" aria-label="Pagination utilisateurs">
          <button type="button" aria-label="Page précédente">
            <Icon name="ChevronLeft" size="sm" />
          </button>
          <button type="button" className="is-active">1</button>
          <button type="button">2</button>
          <button type="button" aria-label="Page suivante">
            <Icon name="ChevronRight" size="sm" />
          </button>
        </footer>
      </section>
    </div>
  );
}
