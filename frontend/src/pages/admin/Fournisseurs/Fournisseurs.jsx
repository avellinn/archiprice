import './Fournisseurs.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Icon, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import {
  createAdminSupplier,
  deleteAdminSupplier,
  fetchAdminSuppliers,
  updateAdminSupplier,
} from '../../../services/adminMongo';
import FournisseurModal from './fournisseurModal';

const EMPTY_SUPPLIER = {
  id: '',
  name: '',
  companyName: '',
  contact: '',
  email: '',
  phone: '',
  region: '',
  status: 'Actif',
  products: 0,
};

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
  };
}

export default function Fournisseurs() {
  const [searchParams] = useSearchParams();
  const [adminData, updateAdminData] = useAdminData();
  const cachedSuppliersRef = useRef(adminData.suppliers || []);
  const [suppliers, setSuppliers] = useState(() => adminData.suppliers || []);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    status: 'Actif',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm] = useState('');

  useEffect(() => {
    cachedSuppliersRef.current = adminData.suppliers || [];
  }, [adminData.suppliers]);

  useEffect(() => {
    let cancelled = false;

    fetchAdminSuppliers()
      .then((list) => {
        if (!cancelled) {
          setSuppliers(list);
          updateAdminData((currentData) => ({
            ...currentData,
            suppliers: list.map(normalizeSupplierForWorkspace),
          }));
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) {
          setSuppliers(cachedSuppliersRef.current);
          setError(getApiErrorMessage(apiError, 'Impossible de charger les fournisseurs Mongo.'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [updateAdminData]);

  const filteredSuppliers = useMemo(() => {
    const query = [searchTerm, searchParams.get('q') || ''].join(' ').trim().toLowerCase();
    if (!query) return suppliers;

    return suppliers.filter((supplier) => (
      String(supplier.companyName || supplier.name || '').toLowerCase().includes(query)
      || String(supplier.contact || '').toLowerCase().includes(query)
      || String(supplier.email || '').toLowerCase().includes(query)
      || String(supplier.phone || '').toLowerCase().includes(query)
      || String(supplier.region || '').toLowerCase().includes(query)
    ));
  }, [searchParams, searchTerm, suppliers]);

  const selectedSupplier = useMemo(() => (
    suppliers.find((supplier) => supplier.id === selectedSupplierId) || null
  ), [selectedSupplierId, suppliers]);
  const modalSupplier = isCreatingSupplier ? {
    ...EMPTY_SUPPLIER,
    name: editForm.name || 'Nouveau fournisseur',
    companyName: editForm.name || 'Nouveau fournisseur',
    contact: editForm.email || '',
    email: editForm.email || '',
    phone: editForm.phone || '',
    region: editForm.region || '',
    status: editForm.status || 'Actif',
  } : selectedSupplier;

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
            suppliers: nextSuppliers.map(normalizeSupplierForWorkspace),
          }));
          return nextSuppliers;
        });
      } else {
        const createdSupplier = await createAdminSupplier(supplier);
        setSuppliers((currentSuppliers) => {
          const nextSuppliers = [createdSupplier, ...currentSuppliers];
          updateAdminData((currentData) => ({
            ...currentData,
            suppliers: nextSuppliers.map(normalizeSupplierForWorkspace),
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

  async function deleteSupplier(supplierId) {
    const previousSuppliers = suppliers;
    const nextSuppliers = suppliers.filter((supplier) => supplier.id !== supplierId);
    setSuppliers(nextSuppliers);
    if (selectedSupplierId === supplierId) setSelectedSupplierId('');
    updateAdminData((currentData) => ({
      ...currentData,
      suppliers: nextSuppliers.map(normalizeSupplierForWorkspace),
    }));

    try {
      await deleteAdminSupplier(supplierId);
    } catch (apiError) {
      setSuppliers(previousSuppliers);
      updateAdminData((currentData) => ({
        ...currentData,
        suppliers: previousSuppliers.map(normalizeSupplierForWorkspace),
      }));
      setError(getApiErrorMessage(apiError, 'La suppression du fournisseur a échoué.'));
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
    setIsCreatingSupplier(false);
    setSelectedSupplierId(supplier.id);
    fillSupplierForm(supplier);
  }

  function openCreateSupplier() {
    setSelectedSupplierId('');
    setIsCreatingSupplier(true);
    setEditForm({
      name: '',
      email: '',
      phone: '',
      region: '',
      status: 'Actif',
    });
  }

  function closeSupplierDetail() {
    setSelectedSupplierId('');
    setIsCreatingSupplier(false);
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

    if (isCreatingSupplier) {
      const email = editForm.email.trim();
      await upsertSupplier({
        name: editForm.name.trim(),
        companyName: editForm.name.trim(),
        contact: email || undefined,
        email: email || undefined,
        phone: editForm.phone.trim(),
        region: editForm.region.trim(),
        status: editForm.status,
        products: 0,
      });
      closeSupplierDetail();
      return;
    }

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

    return (
      <span className="admin-suppliers-actions">
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
      render: (status) => (
        <Badge tone={status === 'Actif' ? 'success' : status === 'Bloqué' ? 'warning' : 'danger'}>
          {status || 'Actif'}
        </Badge>
      ),
    },
    {
      key: 'products',
      label: 'Articles liés',
      render: (products) => products || 0,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, supplier) => renderSupplierActions(supplier),
    },
  ];

  return (
    <div className="admin-suppliers-page">
      <header className="admin-suppliers-header">


        

        <Button type="button" icon={<Icon name="Add" size="sm" />} className="admin-products-add" onClick={openCreateSupplier}>
          Ajouter un fournisseur
        </Button>
      </header>

      {error && (
        <Alert variant="danger" className="admin-suppliers-alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Table
        className="admin-suppliers-list"
        columns={supplierColumns}
        data={isLoading ? [] : filteredSuppliers}
        getRowId={(supplier, index) => supplier.id || `${supplier.name}-${index}`}
        onRowClick={openSupplierDetail}
        emptyLabel={isLoading ? 'Chargement des fournisseurs Mongo...' : 'Aucun fournisseur trouvé.'}
      />

      {modalSupplier && (
        <FournisseurModal
          supplier={modalSupplier}
          form={editForm}
          isCreating={isCreatingSupplier}
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
