import './Clients.css';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Icon, Table } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { useAdminData } from '../../../services/adminData';
import { fetchSupplierWorkspace } from '../../../services/supplier';
import ClientModal from './clientModal';

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDateTime(value) {
  if (!value) return 'Non renseignée';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    }).format(new Date(value));
}

function normalizeArticleImages(notification) {
  const directImages = Array.isArray(notification.articleImages) ? notification.articleImages : [];
  const articleImages = Array.isArray(notification.selectedArticles)
    ? notification.selectedArticles.flatMap((article) => (
      Array.isArray(article.images)
        ? article.images.map((image) => ({
          ...image,
          name: image.name || article.name,
        }))
        : []
    ))
    : [];

  return [...directImages, ...articleImages]
    .map((image) => ({
      name: image?.name || 'Image article',
      secure_url: image?.secure_url || image?.url || '',
      public_id: image?.public_id || '',
    }))
    .filter((image, index, images) => (
      image.secure_url && images.findIndex((item) => item.secure_url === image.secure_url) === index
    ));
}

function isNotificationForSupplier(notification, user, supplierProfile) {
  const supplierIds = [
    user?.supplierId,
    user?.supplier?._id,
    user?.supplier?.id,
    supplierProfile?._id,
    supplierProfile?.id,
    user?.id,
    user?._id,
  ].filter(Boolean).map(String);

  const supplierNames = [
    supplierProfile?.companyName,
    supplierProfile?.name,
    supplierProfile?.shopLabel,
    supplierProfile?.storeLabel,
    user?.shopName,
    user?.companyName,
    user?.storeLabel,
    user?.name,
  ].map(normalizeKey).filter(Boolean);
  const supplierContacts = [
    supplierProfile?.email,
    supplierProfile?.contact,
    user?.email,
    user?.supplier?.email,
  ].map(normalizeKey).filter(Boolean);
  const hasSupplierIdentity = supplierIds.length > 0 || supplierNames.length > 0 || supplierContacts.length > 0;

  const notificationSupplierId = String(notification.supplierId || '');
  const notificationSupplierName = normalizeKey(notification.supplierName);
  const notificationSupplierContact = normalizeKey(notification.supplierContact);

  if (!hasSupplierIdentity) return true;

  return (
    supplierIds.includes(notificationSupplierId)
    || supplierNames.includes(notificationSupplierName)
    || supplierContacts.includes(notificationSupplierContact)
  );
}

export default function Clients() {
  const { user } = useAuth();
  const [adminData, updateAdminData] = useAdminData();
  const [supplierProfile, setSupplierProfile] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [pendingClientDelete, setPendingClientDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((workspace) => {
        if (!cancelled) setSupplierProfile(workspace?.supplier || null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const clients = useMemo(() => {
    const notifications = adminData.supplierClientNotifications || [];
    return notifications.filter((notification) => (
      isNotificationForSupplier(notification, user, supplierProfile)
    )).map((notification) => ({
      ...notification,
      articleImages: normalizeArticleImages(notification),
      createdAtLabel: formatDateTime(notification.createdAt),
    }));
  }, [adminData.supplierClientNotifications, supplierProfile, user]);

  function confirmClientDelete() {
    if (!pendingClientDelete) return;

    updateAdminData((currentData) => ({
      ...currentData,
      supplierClientNotifications: (currentData.supplierClientNotifications || []).filter((client) => (
        client.id !== pendingClientDelete.id
      )),
    }));
    if (selectedClient?.id === pendingClientDelete.id) {
      setSelectedClient(null);
    }
    setPendingClientDelete(null);
  }

  const clientColumns = [
    { key: 'clientName', label: 'Nom' },
    { key: 'clientProfession', label: 'Profession' },
    { key: 'clientEmail', label: 'Email' },
    { key: 'clientPhone', label: 'Numéro' },
    { key: 'projectName', label: 'Projet' },
    { key: 'simulationTotalLabel', label: 'Simulation' },
    { key: 'createdAtLabel', label: 'Date' },
    {
      key: 'status',
      label: 'Statut',
      render: (status) => (
        <Badge tone={status === 'Nouveau' ? 'success' : status === 'Archivé' ? 'danger' : 'warning'}>{status}</Badge>
      ),
    },
    {
      key: 'articleImages',
      label: 'Images articles',
      render: (images) => {
        if (!images?.length) return <span className="supplier-clients-images__empty">Aucun lien</span>;

        return (
          <div className="supplier-clients-images">
            {images.slice(0, 4).map((image, index) => (
              <a
                key={`${image.secure_url}-${index}`}
                href={image.secure_url}
                target="_blank"
                rel="noreferrer"
                title={image.name}
                onClick={(event) => event.stopPropagation()}
              >
                Image {index + 1}
              </a>
            ))}
            {images.length > 4 && <span>+{images.length - 4}</span>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, client) => (
        <span className="supplier-clients-actions">
          <button
            type="button"
            title="Supprimer"
            aria-label={`Supprimer ${client.clientName}`}
            onClick={(event) => {
              event.stopPropagation();
              setPendingClientDelete(client);
            }}
          >
            <Icon name="Delete" size="sm" />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="supplier-clients-page">
      <div className="workspace-heading">
        <div>
          
          <h1>Clients</h1>
        </div>
      </div>

      {pendingClientDelete && (
        <Alert
          variant="warning"
          title="Suppression client"
          className="supplier-clients-alert"
          onClose={() => setPendingClientDelete(null)}
        >
          <span>Supprimer le client "{pendingClientDelete.clientName}" ?</span>
          <span className="supplier-clients-alert__actions">
            <button type="button" onClick={() => setPendingClientDelete(null)}>Annuler</button>
            <button type="button" onClick={confirmClientDelete}>Supprimer</button>
          </span>
        </Alert>
      )}

      <Table
        className="supplier-clients-table"
        columns={clientColumns}
        data={clients}
        getRowId={(client) => client.id}
        onRowClick={setSelectedClient}
        emptyLabel="Aucun client  pour le moment..."
      />

      {selectedClient && (
        <ClientModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onDelete={(client) => {
            setPendingClientDelete(client);
            setSelectedClient(null);
          }}
        />
      )}
    </div>
  );
}
