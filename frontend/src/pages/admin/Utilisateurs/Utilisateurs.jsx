import './Utilisateurs.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Icon } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from '../../../services/adminMongo';

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

function normalizeUserForWorkspace(user) {
  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email || '',
    phone: user.phone || '',
    role: getUserRole(user),
    type: user.type || ROLE_LABELS[getUserRole(user)],
    simulations: user.simulations || 0,
    inscription: user.inscription || '',
    status: user.status || 'Actif',
    subscription: user.subscription || '-',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export default function Utilisateurs() {
  const [searchParams] = useSearchParams();
  const [, updateAdminData] = useAdminData();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [roleFilter, setRoleFilter] = useState('Tous');
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchAdminUsers()
      .then((list) => {
        if (!cancelled) {
          setUsers(list);
          updateAdminData((currentData) => ({
            ...currentData,
            users: list.map(normalizeUserForWorkspace),
          }));
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
  }, [updateAdminData]);

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
        || String(user.shopName || '').toLowerCase().includes(normalizedSearch)
        || String(user.supplier?.companyName || '').toLowerCase().includes(normalizedSearch)
        || String(user.type || '').toLowerCase().includes(normalizedSearch)
        || role.toLowerCase().includes(normalizedSearch);
      const matchesType = typeFilter === 'Tous' || user.type === typeFilter;
      const matchesRole = roleFilter === 'Tous' || role === roleFilter;

      return matchesSearch && matchesType && matchesRole;
    });
  }, [roleFilter, searchParams, searchTerm, typeFilter, users]);
  const selectedUser = useMemo(() => (
    users.find((user) => user.id === selectedUserId) || null
  ), [selectedUserId, users]);

  async function updateUser(userId, patch) {
    const previousUsers = users;
    const optimisticUsers = users.map((user) => (
      user.id === userId ? { ...user, ...patch } : user
    ));
    setUsers(optimisticUsers);
    updateAdminData((currentData) => ({
      ...currentData,
      users: optimisticUsers.map(normalizeUserForWorkspace),
    }));

    try {
      const user = await updateAdminUser(userId, patch);
      setUsers((currentUsers) => {
        const nextUsers = currentUsers.map((item) => (item.id === user.id ? user : item));
        updateAdminData((currentData) => ({
          ...currentData,
          users: nextUsers.map(normalizeUserForWorkspace),
        }));
        return nextUsers;
      });
    } catch (apiError) {
      setUsers(previousUsers);
      updateAdminData((currentData) => ({
        ...currentData,
        users: previousUsers.map(normalizeUserForWorkspace),
      }));
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
      setUsers((currentUsers) => {
        const nextUsers = [user, ...currentUsers];
        updateAdminData((currentData) => ({
          ...currentData,
          users: nextUsers.map(normalizeUserForWorkspace),
        }));
        return nextUsers;
      });
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "La création de l'utilisateur a échoué."));
    }
  }

  async function deleteUser(userId) {
    const previousUsers = users;
    const nextUsers = users.filter((user) => user.id !== userId);
    setUsers(nextUsers);
    updateAdminData((currentData) => ({
      ...currentData,
      users: nextUsers.map(normalizeUserForWorkspace),
    }));

    try {
      await deleteAdminUser(userId);
    } catch (apiError) {
      setUsers(previousUsers);
      updateAdminData((currentData) => ({
        ...currentData,
        users: previousUsers.map(normalizeUserForWorkspace),
      }));
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
      {selectedUser ? (
        <section className="admin-user-detail" aria-label="Détail utilisateur">
          <header className="admin-user-detail__header">
            <button type="button" className="admin-user-detail__back" onClick={() => setSelectedUserId('')} aria-label="Retour aux utilisateurs">
              <Icon name="ChevronLeft" size="sm" />
            </button>
            <Icon name="Workspaces" size="sm" />
            <h1>{selectedUser.email}</h1>
            <Badge tone={selectedUser.status === 'Actif' ? 'success' : selectedUser.status === 'Bloqué' ? 'warning' : 'danger'}>
              {selectedUser.status}
            </Badge>
          </header>

          <section className="admin-user-detail__card">
            <div className="admin-user-detail__card-header">
              <h2>Propriétaire de la boutique</h2>
              <button type="button" title="Modifier l'utilisateur" onClick={() => editUser(selectedUser)}>
                <Icon name="Edit" size="sm" />
              </button>
            </div>
            <div className="admin-user-detail__owner">
              <span className="admin-user-detail__avatar">
                <Icon name="Workspaces" size="sm" />
              </span>
              <div>
                <strong>{selectedUser.email}</strong>
                <small>{selectedUser.name || 'Nom non renseigné'} · {selectedUser.phone || 'Aucun téléphone'}</small>
              </div>
            </div>
          </section>

          <section className="admin-user-detail__card">
            <h2>Rôles</h2>
            <p>Attribuez des rôles pour octroyer des autorisations.</p>
            <div className="admin-user-detail__roles">
              <article>
                <div>
                  <strong>Propriétaire de l’organisation</strong>
                  <span>Organisation</span>
                </div>
              </article>
              <article>
                <div>
                  <strong>{getUserRole(selectedUser) === 'supplier' ? 'Propriétaire de la boutique' : ROLE_LABELS[getUserRole(selectedUser)]}</strong>
                  <span>{getUserRole(selectedUser) === 'supplier' ? 'Boutique' : 'Compte'}</span>
                </div>
                <button type="button" title="Options du rôle">
                  •••
                </button>
              </article>
            </div>
          </section>
        </section>
      ) : (
        <>
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
        {error && (
          <Alert variant="danger" className="admin-users-management__alert" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
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
                  <tr
                    key={`${user.id || user.email}-${index}`}
                    className="admin-users-management__row"
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedUserId(user.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedUserId(user.id);
                      }
                    }}
                  >
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
                          onClick={(event) => {
                            event.stopPropagation();
                            editUser(user);
                          }}
                        >
                          <Icon name="Edit" size="sm" />
                        </button>
                        <button
                          type="button"
                          title={user.status === 'Actif' ? 'Désactiver' : 'Activer'}
                          aria-label={user.status === 'Actif' ? `Désactiver ${user.name}` : `Activer ${user.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            updateUser(user.id, { status: user.status === 'Actif' ? 'Inactif' : 'Actif' });
                          }}
                        >
                          <Icon name="Visibility" size="sm" />
                        </button>
                        <button
                          type="button"
                          title="Bloquer"
                          aria-label={`Bloquer ${user.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            updateUser(user.id, { status: 'Bloqué' });
                          }}
                        >
                          <Icon name="VisibilityOff" size="sm" />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          title="Supprimer"
                          aria-label={`Supprimer ${user.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteUser(user.id);
                          }}
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
      </>
      )}
    </div>
  );
}
