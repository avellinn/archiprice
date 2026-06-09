import './Utilisateurs.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Icon, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import {
  createAdminUser,
  deleteAdminUser,
  deleteAdminSupplier,
  fetchAdminSuppliers,
  fetchAdminUsers,
  updateAdminSupplier,
  updateAdminUser,
} from '../../../services/adminMongo';
import UtilisateurModal from './utilisateurModal';

const ROLE_LABELS = {
  admin: 'Admin',
  supplier: 'Fournisseur',
  user: 'Utilisateur',
};

const EMPTY_USER = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: 'user',
  type: 'Architecte',
  status: 'Actif',
  simulations: 0,
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
    supplierId: user.supplierId || user.supplier?.id || user.supplier?._id || '',
    name: user.name || user.email,
    email: user.email || '',
    phone: user.phone || '',
    role: getUserRole(user),
    type: user.type || ROLE_LABELS[getUserRole(user)],
    simulations: user.simulations || 0,
    inscription: user.inscription || '',
    status: user.status || 'Actif',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function getSupplierName(supplier) {
  return supplier?.companyName || supplier?.name || supplier?.email || 'Fournisseur';
}

function normalizeSupplierAsUser(supplier) {
  const supplierId = supplier.id || supplier._id;

  return {
    id: supplier.userId || `supplier-${supplierId}`,
    supplierId,
    isSupplierMirror: true,
    name: getSupplierName(supplier),
    email: supplier.email || supplier.contact || '',
    phone: supplier.phone || '',
    role: 'supplier',
    type: 'Fournisseur',
    status: supplier.status || 'Actif',
    simulations: supplier.simulations || 0,
    inscription: supplier.inscription || '',
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

function mergeUsersWithSuppliers(users = [], suppliers = []) {
  const mergedUsers = users.map((user) => ({
    ...user,
    supplierId: user.supplierId || user.supplier?.id || user.supplier?._id || '',
  }));

  suppliers
    .filter((supplier) => supplier.status !== 'Supprimé')
    .forEach((supplier) => {
      const supplierId = supplier.id || supplier._id;
      const supplierEmail = String(supplier.email || supplier.contact || '').toLowerCase();
      const existingIndex = mergedUsers.findIndex((user) => (
        String(user.supplierId || '') === String(supplierId)
        || String(user.id || '') === String(supplier.userId || '')
        || (supplierEmail && String(user.email || '').toLowerCase() === supplierEmail)
      ));

      if (existingIndex >= 0) {
        mergedUsers[existingIndex] = {
          ...mergedUsers[existingIndex],
          supplierId,
          role: 'supplier',
          type: 'Fournisseur',
          status: supplier.status || mergedUsers[existingIndex].status || 'Actif',
          shopName: getSupplierName(supplier),
        };
        return;
      }

      mergedUsers.push(normalizeSupplierAsUser(supplier));
    });

  return mergedUsers;
}

export default function Utilisateurs() {
  const [searchParams] = useSearchParams();
  const [, updateAdminData] = useAdminData();
  const [rawUsers, setRawUsers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter] = useState('Tous');
  const [roleFilter, setRoleFilter] = useState('Tous');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'Actif',
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchAdminUsers(), fetchAdminSuppliers()])
      .then(([userList, supplierList]) => {
        if (!cancelled) {
          const activeSuppliers = supplierList.filter((supplier) => supplier.status !== 'Supprimé');
          const mergedUsers = mergeUsersWithSuppliers(userList, activeSuppliers);
          setRawUsers(userList);
          setSuppliers(activeSuppliers);
          updateAdminData((currentData) => ({
            ...currentData,
            users: mergedUsers.map(normalizeUserForWorkspace),
            suppliers: activeSuppliers,
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

  const users = useMemo(() => mergeUsersWithSuppliers(rawUsers, suppliers), [rawUsers, suppliers]);
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
  const modalUser = isCreatingUser ? {
    ...EMPTY_USER,
    name: editForm.name || 'Nouvel utilisateur',
    email: editForm.email,
    phone: editForm.phone,
    role: editForm.role || 'user',
    type: ROLE_LABELS[editForm.role] || 'Utilisateur',
    status: editForm.status || 'Actif',
  } : selectedUser;

  async function updateUser(userId, patch) {
    const previousUsers = users;
    const previousRawUsers = rawUsers;
    const previousSuppliers = suppliers;
    const currentUser = users.find((user) => user.id === userId);
    const optimisticUsers = users.map((user) => (
      user.id === userId ? { ...user, ...patch } : user
    ));
    const optimisticRawUsers = rawUsers.map((user) => (
      user.id === userId ? { ...user, ...patch } : user
    ));
    const optimisticSuppliers = currentUser?.supplierId
      ? suppliers.map((supplier) => (
        String(supplier.id || supplier._id) === String(currentUser.supplierId)
          ? {
            ...supplier,
            name: patch.name ?? supplier.name,
            companyName: patch.name ?? supplier.companyName,
            email: patch.email ?? supplier.email,
            contact: patch.email ?? supplier.contact,
            phone: patch.phone ?? supplier.phone,
            status: patch.status ?? supplier.status,
          }
          : supplier
      ))
      : suppliers;
    setRawUsers(optimisticRawUsers);
    setSuppliers(optimisticSuppliers);
    updateAdminData((currentData) => ({
      ...currentData,
      users: optimisticUsers.map(normalizeUserForWorkspace),
      suppliers: optimisticSuppliers,
    }));

    try {
      if (currentUser?.isSupplierMirror && currentUser?.supplierId) {
        const supplier = await updateAdminSupplier(currentUser.supplierId, {
          name: patch.name ?? currentUser.name,
          companyName: patch.name ?? currentUser.name,
          email: patch.email ?? currentUser.email,
          contact: patch.email ?? currentUser.email,
          phone: patch.phone ?? currentUser.phone,
          status: patch.status ?? currentUser.status,
        });
        setSuppliers((currentSuppliers) => {
          const nextSuppliers = currentSuppliers.map((item) => (
            String(item.id || item._id) === String(supplier.id || supplier._id) ? supplier : item
          ));
          const nextUsers = mergeUsersWithSuppliers(rawUsers, nextSuppliers);
          updateAdminData((currentData) => ({
            ...currentData,
            users: nextUsers.map(normalizeUserForWorkspace),
            suppliers: nextSuppliers,
          }));
          return nextSuppliers;
        });
        return;
      }

      const user = await updateAdminUser(userId, patch);
      setRawUsers((currentUsers) => {
        const nextRawUsers = currentUsers.map((item) => (item.id === user.id ? user : item));
        const nextUsers = mergeUsersWithSuppliers(nextRawUsers, optimisticSuppliers);
        updateAdminData((currentData) => ({
          ...currentData,
          users: nextUsers.map(normalizeUserForWorkspace),
          suppliers: optimisticSuppliers,
        }));
        return nextRawUsers;
      });
      if (currentUser?.supplierId) {
        await updateAdminSupplier(currentUser.supplierId, {
          name: patch.name ?? currentUser.name,
          companyName: patch.name ?? currentUser.name,
          email: patch.email ?? currentUser.email,
          contact: patch.email ?? currentUser.email,
          phone: patch.phone ?? currentUser.phone,
          status: patch.status ?? currentUser.status,
        });
      }
    } catch (apiError) {
      setRawUsers(previousRawUsers);
      setSuppliers(previousSuppliers);
      updateAdminData((currentData) => ({
        ...currentData,
        users: previousUsers.map(normalizeUserForWorkspace),
        suppliers: previousSuppliers,
      }));
      setError(getApiErrorMessage(apiError, "La modification de l'utilisateur a échoué."));
    }
  }

  async function createUserFromForm() {
    try {
      const user = await createAdminUser({
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role || 'user',
        type: editForm.role === 'admin' ? 'Admin' : 'Architecte',
        status: editForm.status,
      });
      setRawUsers((currentUsers) => {
        const nextRawUsers = [user, ...currentUsers];
        const nextUsers = mergeUsersWithSuppliers(nextRawUsers, suppliers);
        updateAdminData((currentData) => ({
          ...currentData,
          users: nextUsers.map(normalizeUserForWorkspace),
        }));
        return nextRawUsers;
      });
      setError('');
      closeUserDetail();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "La création de l'utilisateur a échoué."));
    }
  }

  async function deleteUser(userId) {
    const previousUsers = users;
    const previousRawUsers = rawUsers;
    const previousSuppliers = suppliers;
    const currentUser = users.find((user) => user.id === userId);
    const nextRawUsers = rawUsers.filter((user) => user.id !== userId);
    const nextSuppliers = currentUser?.isSupplierMirror
      ? suppliers.filter((supplier) => String(supplier.id || supplier._id) !== String(currentUser.supplierId))
      : suppliers;
    const nextUsers = mergeUsersWithSuppliers(nextRawUsers, nextSuppliers);
    setRawUsers(nextRawUsers);
    setSuppliers(nextSuppliers);
    if (selectedUserId === userId) closeUserDetail();
    updateAdminData((currentData) => ({
      ...currentData,
      users: nextUsers.map(normalizeUserForWorkspace),
      suppliers: nextSuppliers,
    }));

    try {
      if (currentUser?.isSupplierMirror && currentUser?.supplierId) {
        await deleteAdminSupplier(currentUser.supplierId);
      } else {
        await deleteAdminUser(userId);
      }
    } catch (apiError) {
      setRawUsers(previousRawUsers);
      setSuppliers(previousSuppliers);
      updateAdminData((currentData) => ({
        ...currentData,
        users: previousUsers.map(normalizeUserForWorkspace),
        suppliers: previousSuppliers,
      }));
      setError(getApiErrorMessage(apiError, "La suppression de l'utilisateur a échoué."));
    }
  }

  function fillUserForm(user) {
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: getUserRole(user),
      status: user.status || 'Actif',
    });
  }

  function openUserDetail(user) {
    setIsCreatingUser(false);
    setSelectedUserId(user.id);
    fillUserForm(user);
  }

  function openCreateUser() {
    setSelectedUserId('');
    setIsCreatingUser(true);
    setEditForm({
      name: '',
      email: '',
      phone: '',
      role: 'user',
      status: 'Actif',
    });
  }

  function closeUserDetail() {
    setSelectedUserId('');
    setIsCreatingUser(false);
    setEditForm({
      name: '',
      email: '',
      phone: '',
      role: 'user',
      status: 'Actif',
    });
  }

  function updateEditForm(field, value) {
    setEditForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetHeaderFilters() {
    setSearchTerm('');
    setRoleFilter('Tous');
  }

  async function submitUserDetail(event) {
    event.preventDefault();

    if (isCreatingUser) {
      await createUserFromForm();
      return;
    }

    if (!selectedUser) return;

    await updateUser(selectedUser.id, {
      name: editForm.name.trim() || selectedUser.name,
      email: editForm.email.trim() || selectedUser.email,
      phone: editForm.phone.trim(),
      status: editForm.status,
    });
  }

  function toggleUserStatus(user) {
    const nextStatus = user.status === 'Actif' ? 'Inactif' : 'Actif';
    if (selectedUserId === user.id) {
      updateEditForm('status', nextStatus);
    }
    updateUser(user.id, { status: nextStatus });
  }

  function blockUser(user) {
    if (selectedUserId === user.id) {
      updateEditForm('status', 'Bloqué');
    }
    updateUser(user.id, { status: 'Bloqué' });
  }

  function renderUserActions(user) {
    const userName = user.name || user.email || 'Utilisateur';

    return (
      <span className="admin-users-management__actions">
        <button
          type="button"
          title="Modifier nom, email, téléphone et statut"
          aria-label={`Modifier ${userName}`}
          onClick={(event) => {
            event.stopPropagation();
            openUserDetail(user);
          }}
        >
          <Icon name="Edit" size="sm" />
        </button>
        <button
          type="button"
          title={user.status === 'Actif' ? 'Désactiver' : 'Activer'}
          aria-label={user.status === 'Actif' ? `Désactiver ${userName}` : `Activer ${userName}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleUserStatus(user);
          }}
        >
          <Icon name="Visibility" size="sm" />
        </button>
        <button
          type="button"
          title="Bloquer"
          aria-label={`Bloquer ${userName}`}
          onClick={(event) => {
            event.stopPropagation();
            blockUser(user);
          }}
        >
          <Icon name="VisibilityOff" size="sm" />
        </button>
        <button
          type="button"
          className="is-danger"
          title="Supprimer"
          aria-label={`Supprimer ${userName}`}
          onClick={(event) => {
            event.stopPropagation();
            deleteUser(user.id);
          }}
        >
          <Icon name="Delete" size="sm" />
        </button>
      </span>
    );
  }

  const userColumns = [
    {
      key: 'name',
      label: 'Nom',
      render: (name, user) => name || user.email || '-',
    },
    {
      key: 'email',
      label: 'Email',
      render: (email) => email || '-',
    },
    {
      key: 'phone',
      label: 'Téléphone',
      render: (phone) => phone || '-',
    },
    {
      key: 'type',
      label: 'Type',
      render: (type) => type || '-',
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (_value, user) => (
        <Badge tone={getUserRole(user) === 'admin' ? 'warning' : 'neutral'}>
          {ROLE_LABELS[getUserRole(user)]}
        </Badge>
      ),
    },
    {
      key: 'simulations',
      label: 'Simulations',
      render: (_value, user) => getSimulationCount(user),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (status) => (
        <Badge tone={status === 'Actif' ? 'success' : status === 'Bloqué' ? 'warning' : 'danger'}>
          {status || 'Actif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, user) => renderUserActions(user),
    },
  ];

  return (
    <div className="admin-users-management">
      <header className="admin-users-management__header">
        <label className="admin-users-management__search" aria-label="Rechercher un utilisateur">
          <input
            type="search"
            value={searchTerm}
            placeholder="Rechercher un utilisateur"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Icon name="Search" size="sm" />
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

        <Button type="button" variant="outline" onClick={resetHeaderFilters}>
          Réinitialiser
        </Button>

        <Button type="button" icon={<Icon name="Add" size="sm" />} className="admin-products-add" onClick={openCreateUser}>
          Ajouter un utilisateur
        </Button>
      </header>

      {error && (
        <Alert variant="danger" className="admin-users-management__alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Table
        className="admin-users-management__list"
        columns={userColumns}
        data={isLoading ? [] : filteredUsers}
        getRowId={(user, index) => user.id || `${user.email || 'user'}-${index}`}
        onRowClick={openUserDetail}
        emptyLabel={isLoading ? 'Chargement des utilisateurs Archiprice...' : 'Aucun utilisateur trouvé.'}
      />

      {modalUser && (
        <UtilisateurModal
          user={modalUser}
          form={editForm}
          isCreating={isCreatingUser}
          onChange={updateEditForm}
          onClose={closeUserDetail}
          onSubmit={submitUserDetail}
          onToggleStatus={toggleUserStatus}
          onBlock={blockUser}
          onDelete={deleteUser}
        />
      )}
    </div>
  );
}
