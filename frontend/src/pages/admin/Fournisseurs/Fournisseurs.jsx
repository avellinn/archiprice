import './Fournisseurs.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Icon, Loader, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { useAdminData } from '../../../services/adminData';
import {
  deleteAdminSupplier,
  fetchAdminSuppliers,
  permanentDeleteAdminSupplier,
  updateAdminSupplier,
} from '../../../services/adminMongo';
import FournisseurModal from './fournisseurModal';

function normalizeSupplierForWorkspace(supplier) {
  return {
    id: supplier.id,
    userId: supplier.userId || supplier.user || '',
    name: supplier.companyName || supplier.name,
    companyName: supplier.companyName || supplier.name,
    contact: supplier.contact || supplier.email || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    region: supplier.region || supplier.zone || '',
    status: supplier.status || 'Actif',
    products: supplier.products || 0,
    categories: supplier.categories || [],
    isRecommended: Boolean(supplier.isRecommended),
  };
}

function buildSupplierUser(supplier) {
  const normalizedSupplier = normalizeSupplierForWorkspace(supplier);

  return {
    id: normalizedSupplier.userId || `supplier-${normalizedSupplier.id}`,
    supplierId: normalizedSupplier.id,
    name: normalizedSupplier.companyName,
    email: normalizedSupplier.email || normalizedSupplier.contact || '',
    phone: normalizedSupplier.phone || '',
    role: 'supplier',
    type: 'Fournisseur',
    status: normalizedSupplier.status || 'Actif',
    simulations: 0,
  };
}

function syncSupplierUsers(currentUsers = [], suppliers = []) {
  const activeSuppliers = suppliers.filter((supplier) => supplier.status !== 'Supprimé');
  const nextUsers = currentUsers
    .filter((user) => {
      if (user.role !== 'supplier' && user.type !== 'Fournisseur') return true;
      return activeSuppliers.some((supplier) => (
        String(user.supplierId || '') === String(supplier.id || supplier._id)
        || String(user.id || '') === String(supplier.userId || '')
        || (
          String(user.email || '').toLowerCase()
          && String(user.email || '').toLowerCase() === String(supplier.email || supplier.contact || '').toLowerCase()
        )
      ));
    })
    .map((user) => {
      const supplier = activeSuppliers.find((item) => (
        String(user.supplierId || '') === String(item.id || item._id)
        || String(user.id || '') === String(item.userId || '')
        || (
          String(user.email || '').toLowerCase()
          && String(user.email || '').toLowerCase() === String(item.email || item.contact || '').toLowerCase()
        )
      ));

      return supplier ? { ...user, ...buildSupplierUser(supplier), id: user.id } : user;
    });

  activeSuppliers.forEach((supplier) => {
    const supplierUser = buildSupplierUser(supplier);
    const exists = nextUsers.some((user) => (
      String(user.supplierId || '') === String(supplierUser.supplierId)
      || String(user.id || '') === String(supplierUser.id)
      || (
        String(user.email || '').toLowerCase()
        && String(user.email || '').toLowerCase() === String(supplierUser.email || '').toLowerCase()
      )
    ));

    if (!exists) nextUsers.push(supplierUser);
  });

  return nextUsers;
}

function getSyncedSupplierData(currentData, suppliers) {
  const normalizedSuppliers = suppliers.map(normalizeSupplierForWorkspace);

  return {
    suppliers: normalizedSuppliers,
    users: syncSupplierUsers(currentData.users || [], normalizedSuppliers),
  };
}

function normalizeStatusKey(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isDeletedStatus(status) {
  return normalizeStatusKey(status) === 'supprime';
}

function isMissingSupplier(supplier) {
  return Boolean(supplier?.isMissingFromDb)
    || isDeletedStatus(supplier?.status)
    || normalizeStatusKey(supplier?.status) === 'inexistant';
}

function buildMissingSuppliers(cachedSuppliers = [], apiSuppliers = []) {
  const apiIds = new Set(apiSuppliers.map((supplier) => String(supplier.id || supplier._id)));

  return cachedSuppliers
    .filter((supplier) => {
      const supplierId = String(supplier?.id || supplier?._id || '');
      return supplierId && !apiIds.has(supplierId);
    })
    .map((supplier) => ({
      ...normalizeSupplierForWorkspace(supplier),
      status: 'Inexistant',
      isMissingFromDb: true,
    }));
}

export default function Fournisseurs() {
  const [searchParams] = useSearchParams();
  const [, updateAdminData] = useAdminData();
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    status: 'Actif',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [orphanedSuppliers, setOrphanedSuppliers] = useState([]);
  const [searchTerm] = useState('');

  const loadSuppliers = useCallback(() => {
    fetchAdminSuppliers()
      .then((list) => {
        setSuppliers(list);
        updateAdminData((currentData) => {
          const missingSuppliers = buildMissingSuppliers(currentData.suppliers, list);
          setOrphanedSuppliers(missingSuppliers);
          return {
            ...currentData,
            ...getSyncedSupplierData(currentData, list),
          };
        });
        setError('');
      })
      .catch((apiError) => {
        setSuppliers([]);
        updateAdminData((currentData) => ({
          ...currentData,
          ...getSyncedSupplierData(currentData, []),
        }));
        setError(getApiErrorMessage(apiError, 'Impossible de charger les fournisseurs Mongo.'));
      })
      .finally(() => setIsLoading(false));
  }, [updateAdminData]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useRealtimeRefresh(loadSuppliers, ['suppliers']);

  const allSuppliers = useMemo(() => {
    const mergedIds = new Set(suppliers.map((supplier) => String(supplier.id)));
    const extraMissingSuppliers = orphanedSuppliers.filter((supplier) => !mergedIds.has(String(supplier.id)));
    return [...suppliers, ...extraMissingSuppliers];
  }, [orphanedSuppliers, suppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = [searchTerm, searchParams.get('q') || ''].join(' ').trim().toLowerCase();

    if (!query) return allSuppliers;

    return allSuppliers.filter((supplier) => (
      String(supplier.companyName || supplier.name || '').toLowerCase().includes(query)
      || String(supplier.contact || '').toLowerCase().includes(query)
      || String(supplier.email || '').toLowerCase().includes(query)
      || String(supplier.phone || '').toLowerCase().includes(query)
      || String(supplier.region || '').toLowerCase().includes(query)
    ));
  }, [allSuppliers, searchParams, searchTerm]);

  const selectedSupplier = useMemo(() => (
    allSuppliers.find((supplier) => supplier.id === selectedSupplierId) || null
  ), [allSuppliers, selectedSupplierId]);
  const modalSupplier = selectedSupplier;

  async function upsertSupplier(supplier) {
    try {
      if (supplier.id) {
        const updatedSupplier = await updateAdminSupplier(supplier.id, supplier);
        setSuppliers((currentSuppliers) => {
          const nextSuppliers = currentSuppliers.map((item) => (
            item.id === updatedSupplier.id ? updatedSupplier : item
          ));
          updateAdminData((currentData) => ({
            ...currentData,
            ...getSyncedSupplierData(currentData, nextSuppliers),
          }));
          return nextSuppliers;
        });
      }
      setError('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "L'enregistrement du fournisseur a échoué."));
    }
  }

  function toggleSupplierStatus(supplier) {
    const nextStatus = supplier.status === 'Actif' ? 'Inactif' : 'Actif';
    if (selectedSupplierId === supplier.id) {
      updateEditForm('status', nextStatus);
    }
    upsertSupplier({
      ...supplier,
      status: nextStatus,
    });
  }

  function blockSupplier(supplier) {
    if (selectedSupplierId === supplier.id) {
      updateEditForm('status', 'Bloqué');
    }
    upsertSupplier({
      ...supplier,
      status: 'Bloqué',
    });
  }

  function toggleRecommendedSupplier(supplier) {
    upsertSupplier({
      ...supplier,
      isRecommended: !supplier.isRecommended,
    });
  }

  async function deleteSupplier(supplierId) {
    const previousSuppliers = suppliers;
    const nextSuppliers = suppliers.map((supplier) => (
      supplier.id === supplierId ? { ...supplier, status: 'Supprimé' } : supplier
    ));
    setSuppliers(nextSuppliers);
    if (selectedSupplierId === supplierId) setSelectedSupplierId('');
    updateAdminData((currentData) => ({
      ...currentData,
      ...getSyncedSupplierData(currentData, nextSuppliers),
    }));

    try {
      await deleteAdminSupplier(supplierId);
    } catch (apiError) {
      setSuppliers(previousSuppliers);
      updateAdminData((currentData) => ({
        ...currentData,
        ...getSyncedSupplierData(currentData, previousSuppliers),
      }));
      setError(getApiErrorMessage(apiError, 'La suppression du fournisseur a échoué.'));
    }
  }

  async function restoreSupplier(supplier) {
    await upsertSupplier({
      ...supplier,
      status: 'Actif',
    });
  }

  async function permanentDeleteSupplier(supplierId) {
    const previousSuppliers = suppliers;
    const previousOrphans = orphanedSuppliers;
    const currentSupplier = allSuppliers.find((supplier) => supplier.id === supplierId);

    if (currentSupplier?.isMissingFromDb) {
      setOrphanedSuppliers((current) => current.filter((supplier) => supplier.id !== supplierId));
      updateAdminData((currentData) => ({
        ...currentData,
        suppliers: (currentData.suppliers || []).filter((supplier) => String(supplier.id) !== String(supplierId)),
        users: (currentData.users || []).filter((user) => String(user.supplierId) !== String(supplierId)),
      }));
      if (selectedSupplierId === supplierId) closeSupplierDetail();
      return;
    }

    setSuppliers((current) => current.filter((supplier) => supplier.id !== supplierId));
    updateAdminData((currentData) => ({
      ...currentData,
      suppliers: currentData.suppliers.filter((supplier) => supplier.id !== supplierId),
    }));

    try {
      await permanentDeleteAdminSupplier(supplierId);
      if (selectedSupplierId === supplierId) closeSupplierDetail();
    } catch (apiError) {
      setSuppliers(previousSuppliers);
      setOrphanedSuppliers(previousOrphans);
      updateAdminData((currentData) => ({
        ...currentData,
        ...getSyncedSupplierData(currentData, previousSuppliers),
      }));
      setError(getApiErrorMessage(apiError, 'La suppression définitive du fournisseur a échoué.'));
    }
  }

  function getSupplierName(supplier) {
    return supplier?.companyName || supplier?.name || 'Fournisseur';
  }

  function getSupplierContact(supplier) {
    return supplier?.contact || supplier?.email || supplier?.phone || '-';
  }

  function fillSupplierForm(supplier) {
    setEditForm({
      name: getSupplierName(supplier),
      email: supplier.email || supplier.contact || '',
      phone: supplier.phone || '',
      region: supplier.region || '',
      status: supplier.status || 'Actif',
    });
  }

  function openSupplierDetail(supplier) {
    setSelectedSupplierId(supplier.id);
    fillSupplierForm(supplier);
  }

  function closeSupplierDetail() {
    setSelectedSupplierId('');
    setEditForm({
      name: '',
      email: '',
      phone: '',
      region: '',
      status: 'Actif',
    });
  }

  function updateEditForm(field, value) {
    setEditForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function submitSupplierDetail(event) {
    event.preventDefault();
    if (!modalSupplier) return;

    if (!selectedSupplier) return;

    await upsertSupplier({
      ...selectedSupplier,
      name: editForm.name.trim() || getSupplierName(selectedSupplier),
      companyName: editForm.name.trim() || getSupplierName(selectedSupplier),
      contact: editForm.email.trim() || selectedSupplier.contact,
      email: editForm.email.trim() || selectedSupplier.email,
      phone: editForm.phone.trim(),
      region: editForm.region.trim() || selectedSupplier.region,
      status: editForm.status,
    });
  }

  function renderSupplierActions(supplier) {
    const supplierName = getSupplierName(supplier);
    const isMissing = isMissingSupplier(supplier);

    return (
      <span className="admin-suppliers-actions">
        {!isMissing && (
        <button
          type="button"
          title="Modifier nom, email, téléphone et statut"
          aria-label={`Modifier ${supplierName}`}
          onClick={(event) => {
            event.stopPropagation();
            openSupplierDetail(supplier);
          }}
        >
          <Icon name="Edit" size="sm" />
        </button>
        )}
        {!isMissing && (
          <button
          type="button"
          title={supplier.status === 'Actif' ? 'Désactiver' : 'Activer'}
          aria-label={supplier.status === 'Actif' ? `Désactiver ${supplierName}` : `Activer ${supplierName}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleSupplierStatus(supplier);
          }}
        >
          <Icon name="Visibility" size="sm" />
        </button>
        )}
        {!isMissing && (
          <button
          type="button"
          title="Bloquer"
          aria-label={`Bloquer ${supplierName}`}
          onClick={(event) => {
            event.stopPropagation();
            blockSupplier(supplier);
          }}
        >
          <Icon name="VisibilityOff" size="sm" />
        </button>
        )}
        {!isMissing && (
          <button
          type="button"
          className={supplier.isRecommended ? 'is-recommended' : ''}
          title={supplier.isRecommended ? 'Retirer des boutiques recommandées' : 'Recommander'}
          aria-label={supplier.isRecommended ? `Retirer ${supplierName} des recommandations` : `Recommander ${supplierName}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleRecommendedSupplier(supplier);
          }}
        >
          <Icon name="Check" size="sm" />
        </button>
        )}
        {isMissing ? (
          <button
            type="button"
            className="is-danger"
            title="Supprimer définitivement"
            aria-label={`Supprimer définitivement ${supplierName}`}
            onClick={(event) => {
              event.stopPropagation();
              permanentDeleteSupplier(supplier.id);
            }}
          >
            <Icon name="Delete" size="sm" />
            <span className="visually-hidden">Supprimer définitivement</span>
          </button>
        ) : isDeletedStatus(supplier.status) ? (
          <button
            type="button"
            className="is-restore"
            title="Restaurer"
            aria-label={`Restaurer ${supplierName}`}
            onClick={(event) => {
              event.stopPropagation();
              restoreSupplier(supplier);
            }}
          >
            <Icon name="History" size="sm" />
          </button>
        ) : (
          <button
          type="button"
          className="is-danger"
          title="Supprimer"
          aria-label={`Supprimer ${supplierName}`}
          onClick={(event) => {
            event.stopPropagation();
            deleteSupplier(supplier.id);
          }}
        >
          <Icon name="Delete" size="sm" />
        </button>
        )}
        {isDeletedStatus(supplier.status) && !isMissing && (
          <button
            type="button"
            className="is-danger"
            title="Supprimer définitivement"
            aria-label={`Supprimer définitivement ${supplierName}`}
            onClick={(event) => {
              event.stopPropagation();
              permanentDeleteSupplier(supplier.id);
            }}
          >
            <Icon name="Delete" size="sm" />
            <span className="visually-hidden">Supprimer définitivement</span>
          </button>
        )}
      </span>
    );
  }

  const supplierColumns = [
    {
      key: 'companyName',
      label: 'Nom',
      render: (_value, supplier) => getSupplierName(supplier),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (_value, supplier) => getSupplierContact(supplier),
    },
    {
      key: 'region',
      label: 'Région',
      render: (region) => region || '-',
    },
    {
      key: 'status',
      label: 'Statut',
      render: (status, supplier) => {
        const missing = isMissingSupplier(supplier);
        const tone = missing
          ? 'neutral'
          : status === 'Actif'
            ? 'success'
            : status === 'Bloqué'
              ? 'warning'
              : 'danger';
        const label = missing ? 'Inexistant' : status || 'Actif';
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: 'products',
      label: 'Articles liés',
      render: (products, supplier) => {
        if (isMissingSupplier(supplier)) return '-';
        return products || 0;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, supplier) => renderSupplierActions(supplier),
    },
  ];

  return (
    <div className="admin-suppliers-page">
      {error && (
        <Alert variant="danger" className="admin-suppliers-alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Loader label="Chargement des fournisseurs..." />
      ) : (
        <Table
          className="admin-suppliers-list"
          columns={supplierColumns}
          data={filteredSuppliers}
          getRowId={(supplier, index) => supplier.id || `${supplier.name}-${index}`}
          onRowClick={openSupplierDetail}
          emptyLabel="Aucun fournisseur trouvé."
        />
      )}

      {modalSupplier && (
        <FournisseurModal
          supplier={modalSupplier}
          form={editForm}
          isCreating={false}
          onChange={updateEditForm}
          onClose={closeSupplierDetail}
          onSubmit={submitSupplierDetail}
          onToggleStatus={toggleSupplierStatus}
          onBlock={blockSupplier}
          onDelete={deleteSupplier}
        />
      )}

    </div>
  );
}
