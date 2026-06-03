import './Clients.css';
import { useMemo } from 'react';
import { Badge, Table, Text } from '../../../components/ui';
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

const CLIENT_COLUMNS = [
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
      <Badge tone={status === 'Nouveau' ? 'success' : 'warning'}>{status}</Badge>
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
            >
              Image {index + 1}
            </a>
          ))}
          {images.length > 4 && <span>+{images.length - 4}</span>}
        </div>
      );
    },
  },
];

export default function Clients() {
  const { user } = useAuth();
  const [adminData] = useAdminData();
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

      <Table
        className="supplier-clients-table"
        columns={CLIENT_COLUMNS}
        data={clients}
        getRowId={(client) => client.id}
        emptyLabel="Aucun client  pour le moment..."
      />
    </div>
  );
}
