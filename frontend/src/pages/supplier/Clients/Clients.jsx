import './Clients.css';
import { useMemo, useState } from 'react';
import { Alert, Badge, Icon, Table, Text } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import { useAdminData } from '../../../services/adminData';

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

function isNotificationForSupplier(notification, user, adminData) {
  const supplierIds = [
    user?.supplierId,
    user?.supplier?._id,
    user?.supplier?.id,
    user?.id,
    user?._id,
  ].filter(Boolean).map(String);

  const supplierNames = [
    user?.shopName,
    user?.companyName,
    user?.storeLabel,
    user?.name,
    adminData.supplierSettings?.shopProfile?.name,
  ].map(normalizeKey).filter(Boolean);
  const supplierContacts = [
    user?.email,
    user?.supplier?.email,
    adminData.supplierSettings?.shopProfile?.email,
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
  const [selectedClient, setSelectedClient] = useState(null);
  const [pendingClientDelete, setPendingClientDelete] = useState(null);
  const clients = useMemo(() => {
    const notifications = adminData.supplierClientNotifications || [];
    return notifications.filter((notification) => (
      isNotificationForSupplier(notification, user, adminData)
    )).map((notification) => ({
      ...notification,
      articleImages: normalizeArticleImages(notification),
      createdAtLabel: formatDateTime(notification.createdAt),
    }));
  }, [adminData, user]);

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
          <Text as="span" size="sm" variant="bold" className="workspace-eyebrow">
            Relation commerciale
          </Text>
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
        <div className="supplier-client-modal-backdrop" role="presentation">
          <section className="supplier-client-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-client-detail-title">
            <header>
              <h2 id="supplier-client-detail-title">Informations du client</h2>
              <button type="button" aria-label="Fermer" onClick={() => setSelectedClient(null)}>
                <Icon name="Close" size="sm" />
              </button>
            </header>

            <div className="supplier-client-detail-grid">
              <article>
                <span>Nom</span>
                <strong>{selectedClient.clientName || 'Non renseigné'}</strong>
              </article>
              <article>
                <span>Profession</span>
                <strong>{selectedClient.clientProfession || 'Non renseignée'}</strong>
              </article>
              <article>
                <span>Email</span>
                <strong>{selectedClient.clientEmail || 'Non renseigné'}</strong>
              </article>
              <article>
                <span>Numéro</span>
                <strong>{selectedClient.clientPhone || 'Non renseigné'}</strong>
              </article>
              <article>
                <span>Projet</span>
                <strong>{selectedClient.projectName || 'Projet non renseigné'}</strong>
              </article>
              <article>
                <span>Simulation</span>
                <strong>{selectedClient.simulationTotalLabel || 'Simulation non renseignée'}</strong>
              </article>
              <article>
                <span>Date</span>
                <strong>{selectedClient.createdAtLabel || formatDateTime(selectedClient.createdAt)}</strong>
              </article>
              <article>
                <span>Statut</span>
                <strong>{selectedClient.status || 'Nouveau'}</strong>
              </article>
            </div>

            <section className="supplier-client-detail-images">
              <h3>Images des articles choisis</h3>
              {selectedClient.articleImages?.length ? (
                <div className="supplier-clients-images">
                  {selectedClient.articleImages.map((image, index) => (
                    <a
                      key={`${image.secure_url}-${index}`}
                      href={image.secure_url}
                      target="_blank"
                      rel="noreferrer"
                      title={image.name}
                    >
                      Image {index + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p>Aucune image Cloudinary liée à ce client.</p>
              )}
            </section>

            <footer>
              <button type="button" className="supplier-client-close" onClick={() => setSelectedClient(null)}>
                Fermer
              </button>
              <button
                type="button"
                className="supplier-client-delete"
                onClick={() => {
                  setPendingClientDelete(selectedClient);
                  setSelectedClient(null);
                }}
              >
                Supprimer
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
