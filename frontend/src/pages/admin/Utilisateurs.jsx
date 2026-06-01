import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Icon } from '../../components/ui';
import { getApiErrorMessage } from '../../services/api';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from '../../services/adminMongo';

const ROLE_LABELS = {
  admin: 'Admin',
  supplier: 'Supplier',
  user: 'User',
};

function getUserRole(user) {
  if (String(user.role || '').toLowerCase() === 'admin' || user.type === 'Admin') return 'admin';
  if (String(user.role || '').toLowerCase() === 'supplier' || user.type === 'Fournisseur') return 'supplier';
  return 'user';
}

function getSimulationCount(user) {
  if (getUserRole(user) === 'admin') return '-';
  return user.simulations || 0;
}

export default function Utilisateurs() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [roleFilter, setRoleFilter] = useState('Tous');

  useEffect(() => {
    let cancelled = false;

    fetchAdminUsers()
      .then((list) => {
        if (!cancelled) {
          setUsers(list);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les utilisateurs Mongo.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const userTypes = useMemo(() => (
    ['Tous', ...new Set(users.map((user) => user.type).filter(Boolean))]
  ), [users]);

  const userRoles = useMemo(() => (
    ['Tous', ...new Set(users.map((user) => getUserRole(user)))]
  ), [users]);

  const filteredUsers = useMemo(() => {
    const headerSearchTerm = searchParams.get('q') || '';
    const normalizedSearch = [searchTerm, headerSearchTerm].join(' ').trim().toLowerCase();

    return users.filter((user) => {
      const role = getUserRole(user);
      const matchesSearch = !normalizedSearch
        || String(user.name || '').toLowerCase().includes(normalizedSearch)
        || String(user.email || '').toLowerCase().includes(normalizedSearch)
        || String(user.phone || '').toLowerCase().includes(normalizedSearch)
        || String(user.type || '').toLowerCase().includes(normalizedSearch)
        || role.toLowerCase().includes(normalizedSearch);
      const matchesType = typeFilter === 'Tous' || user.type === typeFilter;
      const matchesRole = roleFilter === 'Tous' || role === roleFilter;

      return matchesSearch && matchesType && matchesRole;
    });
  }, [roleFilter, searchParams, searchTerm, typeFilter, users]);

  async function updateUser(userId, patch) {
    const previousUsers = users;
    setUsers((currentUsers) => currentUsers.map((user) => (
      user.id === userId ? { ...user, ...patch } : user
    )));

    try {
      const user = await updateAdminUser(userId, patch);
      setUsers((currentUsers) => currentUsers.map((item) => (item.id === user.id ? user : item)));
    } catch (apiError) {
      setUsers(previousUsers);
      setError(getApiErrorMessage(apiError, "La modification de l'utilisateur a échoué."));
    }
  }

  async function addDemoUser() {
    try {
      const user = await createAdminUser({
        name: 'Nouvel utilisateur',
        email: `user${Date.now()}@archiprice.com`,
        type: 'Architecte',
        status: 'Actif',
        subscription: 'Essai',
      });
      setUsers((currentUsers) => [user, ...currentUsers]);
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "La création de l'utilisateur a échoué."));
    }
  }

  async function deleteUser(userId) {
    const previousUsers = users;
    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));

    try {
      await deleteAdminUser(userId);
    } catch (apiError) {
      setUsers(previousUsers);
      setError(getApiErrorMessage(apiError, "La suppression de l'utilisateur a échoué."));
    }
  }

  function editUser(user) {
    const nextName = window.prompt('Nom', user.name || '');
    if (nextName === null) return;

    const nextEmail = window.prompt('Email', user.email || '');
    if (nextEmail === null) return;

    const nextPhone = window.prompt('Téléphone', user.phone || '');
    if (nextPhone === null) return;

    const nextStatus = window.prompt('Statut: Actif, Inactif ou Bloqué', user.status || 'Actif');
    if (nextStatus === null) return;

    const normalizedStatus = ['Actif', 'Inactif', 'Bloqué'].includes(nextStatus.trim())
      ? nextStatus.trim()
      : user.status;

    updateUser(user.id, {
      name: nextName.trim() || user.name,
      email: nextEmail.trim() || user.email,
      phone: nextPhone.trim(),
      status: normalizedStatus,
    });
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
            {userTypes.map((type, index) => (
              <option key={`${type}-${index}`} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="admin-users-management__filter">
          <span>Rôle :</span>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {userRoles.map((role, index) => (
              <option key={`${role}-${index}`} value={role}>
                {role === 'Tous' ? 'Tous' : ROLE_LABELS[role] || role}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="admin-users-management__add" onClick={addDemoUser}>
          <Icon name="Add" size="sm" />
          Ajouter
        </button>
      </header>

      <section className="admin-users-management__card" aria-label="Liste des utilisateurs">
        {error && <p className="admin-users-management__state">{error}</p>}
        <div className="admin-users-management__table-wrap">
          <table className="admin-users-management__table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Type</th>
                <th>Rôle</th>
                <th>Simulations</th>
                <th>Inscription</th>
                <th>Statut</th>
                <th>Abonnement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="admin-users-management__state">
                    Chargement des utilisateurs Mongo...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="admin-users-management__state">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={`${user.id || user.email}-${index}`}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{user.type}</td>
                    <td>
                      <Badge tone={getUserRole(user) === 'admin' ? 'warning' : 'neutral'}>
                        {ROLE_LABELS[getUserRole(user)]}
                      </Badge>
                    </td>
                    <td>{getSimulationCount(user)}</td>
                    <td>{user.inscription}</td>
                    <td>
                      <Badge tone={user.status === 'Actif' ? 'success' : user.status === 'Bloqué' ? 'warning' : 'danger'}>
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
                          title="Modifier nom, email, téléphone et statut"
                          aria-label={`Modifier ${user.name}`}
                          onClick={() => editUser(user)}
                        >
                          <Icon name="Edit" size="sm" />
                        </button>
                        <button
                          type="button"
                          title={user.status === 'Actif' ? 'Désactiver' : 'Activer'}
                          aria-label={user.status === 'Actif' ? `Désactiver ${user.name}` : `Activer ${user.name}`}
                          onClick={() => updateUser(user.id, { status: user.status === 'Actif' ? 'Inactif' : 'Actif' })}
                        >
                          <Icon name="Visibility" size="sm" />
                        </button>
                        <button
                          type="button"
                          title="Bloquer"
                          aria-label={`Bloquer ${user.name}`}
                          onClick={() => updateUser(user.id, { status: 'Bloqué' })}
                        >
                          <Icon name="VisibilityOff" size="sm" />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          title="Supprimer"
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
