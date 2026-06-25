import './Utilisateurs.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Icon, Loader, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { useAdminData } from '../../../services/adminData';
import {
  deleteAdminUser,
  deleteAdminSupplier,
  fetchAdminSuppliers,
  fetchAdminUsers,
  permanentDeleteAdminSupplier,
  permanentDeleteAdminUser,
  updateAdminSupplier,
  updateAdminUser,
} from '../../../services/adminMongo';
import UtilisateurModal from './utilisateurModal';

const ROLE_LABELS = {
  admin: 'Admin',
  supplier: 'Fournisseur',
  user: 'Utilisateur',
};

function getUserRole(user) {
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'supplier') return 'supplier';
  return 'user';
}

function getSimulationCount(user) {
  if (getUserRole(user) === 'admin') return '-';
  return user.simulations || 0;
}

function normalizeStatusKey(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isBlockedStatus(status) {
  return normalizeStatusKey(status) === 'bloque';
}

function isActiveStatus(status) {
  return normalizeStatusKey(status) === 'actif';
}

function isInactiveStatus(status) {
  return ['inactif', 'desactive', 'desactivee'].includes(normalizeStatusKey(status));
}

function isDeletedStatus(status) {
  return normalizeStatusKey(status) === 'supprime';
}

function isMissingAccount(user) {
  return Boolean(user?.isMissingFromDb)
    || isDeletedStatus(user?.status)
    || normalizeStatusKey(user?.status) === 'inexistant';
}

function buildMissingUsers(cachedUsers = [], apiUsers = [], apiSuppliers = []) {
  const apiUserIds = new Set(apiUsers.map((user) => String(user.id)));
  const linkedSupplierUserIds = new Set(
    apiSuppliers.map((supplier) => String(supplier.userId || supplier.user?._id || supplier.user || '')).filter(Boolean),
  );

  return cachedUsers
    .filter((user) => {
      const userId = String(user?.id || '');
      if (!userId || userId.startsWith('supplier-')) return false;
      return !apiUserIds.has(userId) && !linkedSupplierUserIds.has(userId);
    })
    .map((user) => ({
      ...normalizeUserForWorkspace(user),
      status: 'Inexistant',
      isMissingFromDb: true,
    }));
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

  suppliers.forEach((supplier) => {
    const supplierId = supplier.id || supplier._id;
    const supplierEmail = String(supplier.email || supplier.contact || '').toLowerCase();
    const existingIndex = mergedUsers.findIndex((user) => (
      String(user.supplierId || '') === String(supplierId)
      || String(user.id || '') === String(supplier.userId || '')
      || (supplierEmail && String(user.email || '').toLowerCase() === supplierEmail)
    ));

    if (existingIndex >= 0) {
      const existingUser = mergedUsers[existingIndex];
      const existingRole = getUserRole(existingUser);
      mergedUsers[existingIndex] = {
        ...existingUser,
        supplierId,
        role: existingRole,
        type: existingRole === 'supplier' ? 'Fournisseur' : existingUser.type,
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
  const [orphanedUsers, setOrphanedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'Actif',
  });

  const loadUsers = useCallback(() => {
    Promise.all([fetchAdminUsers(), fetchAdminSuppliers()])
      .then(([userList, supplierList]) => {
        const mergedUsers = mergeUsersWithSuppliers(userList, supplierList);
        setRawUsers(userList);
        setSuppliers(supplierList);
        updateAdminData((currentData) => {
          const missingUsers = buildMissingUsers(currentData.users, userList, supplierList);
          setOrphanedUsers(missingUsers);
          return {
            ...currentData,
            users: mergedUsers.map(normalizeUserForWorkspace),
            suppliers: supplierList,
          };
        });
        setError('');
      })
      .catch((apiError) => {
        setError(getApiErrorMessage(apiError, 'Impossible de charger les utilisateurs Mongo.'));
      })
      .finally(() => setIsLoading(false));
  }, [updateAdminData]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useRealtimeRefresh(loadUsers, ['users', 'suppliers']);

  const users = useMemo(() => {
    const mergedUsers = mergeUsersWithSuppliers(rawUsers, suppliers);
    const mergedIds = new Set(mergedUsers.map((user) => String(user.id)));
    const extraMissingUsers = orphanedUsers.filter((user) => !mergedIds.has(String(user.id)));
    return [...mergedUsers, ...extraMissingUsers];
  }, [orphanedUsers, rawUsers, suppliers]);
  const filteredUsers = useMemo(() => {
    const headerSearchTerm = searchParams.get('q') || '';
    const normalizedSearch = headerSearchTerm.trim().toLowerCase();

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

      return matchesSearch;
    });
  }, [searchParams, users]);

  const selectedUser = useMemo(() => (
    users.find((user) => user.id === selectedUserId) || null
  ), [selectedUserId, users]);
  const modalUser = selectedUser;

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

  async function deleteUser(userId) {
    const previousUsers = users;
    const previousRawUsers = rawUsers;
    const previousSuppliers = suppliers;
    const currentUser = users.find((user) => user.id === userId);
    const nextRawUsers = rawUsers.map((user) => (
      user.id === userId ? { ...user, status: 'Supprimé' } : user
    ));
    const nextSuppliers = currentUser?.isSupplierMirror
      ? suppliers.map((supplier) => (
        String(supplier.id || supplier._id) === String(currentUser.supplierId)
          ? { ...supplier, status: 'Supprimé' }
          : supplier
      ))
      : suppliers.map((supplier) => (
        String(supplier.userId || supplier.user?._id || supplier.user || '') === String(userId)
          ? { ...supplier, status: 'Supprimé' }
          : supplier
      ));
    const nextUsers = mergeUsersWithSuppliers(nextRawUsers, nextSuppliers);
    setRawUsers(nextRawUsers);
    setSuppliers(nextSuppliers);
    if (selectedUserId === userId) fillUserForm({ ...currentUser, status: 'Supprimé' });
    updateAdminData((currentData) => ({
      ...currentData,
      users: nextUsers.map(normalizeUserForWorkspace),
      suppliers: nextSuppliers,
    }));

    try {
      if (currentUser?.isSupplierMirror && String(currentUser.id || '').startsWith('supplier-') && currentUser?.supplierId) {
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

  async function restoreUser(user) {
    await updateUser(user.id, { status: 'Actif' });
    if (user.supplierId) {
      updateAdminSupplier(user.supplierId, { status: 'Actif' }).catch(() => {});
      setSuppliers((currentSuppliers) => currentSuppliers.map((supplier) => (
        String(supplier.id || supplier._id) === String(user.supplierId)
          ? { ...supplier, status: 'Actif' }
          : supplier
      )));
    }
  }

  async function permanentDeleteUser(userId) {
    const previousUsers = users;
    const previousRawUsers = rawUsers;
    const previousSuppliers = suppliers;
    const previousOrphans = orphanedUsers;
    const currentUser = users.find((user) => user.id === userId);

    if (currentUser?.isMissingFromDb) {
      setOrphanedUsers((current) => current.filter((user) => user.id !== userId));
      updateAdminData((currentData) => ({
        ...currentData,
        users: (currentData.users || []).filter((user) => String(user.id) !== String(userId)),
        supplierClientNotifications: (currentData.supplierClientNotifications || []).filter(
          (notification) => String(notification.clientId) !== String(userId),
        ),
      }));
      if (selectedUserId === userId) closeUserDetail();
      return;
    }

    setRawUsers((current) => current.filter((user) => user.id !== userId));
    setSuppliers((current) => current.filter((supplier) => String(supplier.userId || supplier.user || '') !== String(userId)));
    updateAdminData((currentData) => ({
      ...currentData,
      users: currentData.users.filter((user) => user.id !== userId),
      suppliers: currentData.suppliers.filter((supplier) => String(supplier.userId || '') !== String(userId)),
    }));

    try {
      if (currentUser?.isSupplierMirror && currentUser?.supplierId) {
        await permanentDeleteAdminSupplier(currentUser.supplierId);
      } else {
        await permanentDeleteAdminUser(userId);
      }
      if (selectedUserId === userId) closeUserDetail();
    } catch (apiError) {
      setRawUsers(previousRawUsers);
      setSuppliers(previousSuppliers);
      setOrphanedUsers(previousOrphans);
      updateAdminData((currentData) => ({
        ...currentData,
        users: previousUsers.map(normalizeUserForWorkspace),
        suppliers: previousSuppliers,
      }));
      setError(getApiErrorMessage(apiError, "La suppression définitive de l'utilisateur a échoué."));
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
    setSelectedUserId(user.id);
    fillUserForm(user);
  }

  function closeUserDetail() {
    setSelectedUserId('');
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

  async function submitUserDetail(event) {
    event.preventDefault();

    if (!selectedUser) return;

    await updateUser(selectedUser.id, {
      name: editForm.name.trim() || selectedUser.name,
      email: editForm.email.trim() || selectedUser.email,
      phone: editForm.phone.trim(),
      status: editForm.status,
    });
  }

  function toggleUserStatus(user) {
    const nextStatus = isActiveStatus(user.status) ? 'Inactif' : 'Actif';
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

  function unblockUser(user) {
    if (selectedUserId === user.id) {
      updateEditForm('status', 'Actif');
    }
    updateUser(user.id, { status: 'Actif' });
  }

  function activateUser(user) {
    if (selectedUserId === user.id) {
      updateEditForm('status', 'Actif');
    }
    updateUser(user.id, { status: 'Actif' });
  }

  function renderUserActions(user) {
    const userName = user.name || user.email || 'Utilisateur';
    const isActive = isActiveStatus(user.status);
    const isInactive = isInactiveStatus(user.status);
    const isBlocked = isBlockedStatus(user.status);
    const isDeleted = isMissingAccount(user);

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
        {!isDeleted && (
          <button
            type="button"
            title={isActive ? 'Désactiver' : 'Activer'}
            aria-label={isActive ? `Désactiver ${userName}` : `Activer ${userName}`}
            onClick={(event) => {
              event.stopPropagation();
              toggleUserStatus(user);
            }}
          >
            <Icon name="Visibility" size="sm" />
          </button>
        )}
        {isInactive && (
          <button
            type="button"
            className="is-activate"
            title="Activer"
            aria-label={`Activer ${userName}`}
            onClick={(event) => {
              event.stopPropagation();
              activateUser(user);
            }}
          >
            <Icon name="CheckCircle" size="sm" />
            <span className="visually-hidden">Activer</span>
          </button>
        )}
        {!isDeleted && (
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
        )}
        {isBlocked && (
          <button
            type="button"
            className="is-unblock"
            title="Débloquer"
            aria-label={`Débloquer ${userName}`}
            onClick={(event) => {
              event.stopPropagation();
              unblockUser(user);
            }}
          >
            <Icon name="CheckCircle" size="sm" />
            <span className="visually-hidden">Débloquer</span>
          </button>
        )}
        {isDeleted && (
          <button
            type="button"
            className="is-restore"
            title="Restaurer"
            aria-label={`Restaurer ${userName}`}
            onClick={(event) => {
              event.stopPropagation();
              restoreUser(user);
            }}
          >
            <Icon name="History" size="sm" />
            <span className="visually-hidden">Restaurer</span>
          </button>
        )}
        {isDeleted && (
          <button
            type="button"
            className="is-danger"
            title="Supprimer définitivement"
            aria-label={`Supprimer définitivement ${userName}`}
            onClick={(event) => {
              event.stopPropagation();
              permanentDeleteUser(user.id);
            }}
          >
            <Icon name="Delete" size="sm" />
            <span className="visually-hidden">Supprimer définitivement</span>
          </button>
        )}
        {!isDeleted && (
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
        )}
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
      render: (_value, user) => {
        if (isMissingAccount(user)) return '-';
        return getSimulationCount(user);
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (status, user) => {
        const missing = isMissingAccount(user);
        const tone = missing
          ? 'neutral'
          : isActiveStatus(status)
            ? 'success'
            : isBlockedStatus(status)
              ? 'warning'
              : 'danger';
        const label = missing ? 'Inexistant' : status || 'Actif';
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, user) => renderUserActions(user),
    },
  ];

  return (
    <div className="admin-users-management">
      {error && (
        <Alert variant="danger" className="admin-users-management__alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Loader className="admin-users-management__loader"  />
      ) : (
        <Table
          className="admin-users-management__list"
          columns={userColumns}
          data={filteredUsers}
          getRowId={(user, index) => user.id || `${user.email || 'user'}-${index}`}
          onRowClick={openUserDetail}
          emptyLabel="Aucun utilisateur trouvé."
        />
      )}

      {modalUser && (
        <UtilisateurModal
          user={modalUser}
          form={editForm}
          isCreating={false}
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
