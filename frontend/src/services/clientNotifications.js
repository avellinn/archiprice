import { notifyDemandesChange } from './demandes';

export function getUserProfession(user) {
  return user?.profession || user?.type || user?.accountType || user?.role || 'Client';
}

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

export function getArticleCloudinaryLinks(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const normalizedImages = images
    .map((image) => ({
      name: product?.name || 'Article',
      secure_url: getImageUrl(image),
      public_id: typeof image === 'object' ? image.public_id || '' : '',
    }))
    .filter((image) => image.secure_url);

  if (normalizedImages.length > 0) return normalizedImages;

  const singleImage = getImageUrl(product?.image);
  return singleImage ? [{ name: product?.name || 'Article', secure_url: singleImage, public_id: '' }] : [];
}

export function buildSupplierClientNotification({
  shop,
  user,
  project,
  simulation = {},
  products = [],
  message = '',
  demande = null,
}) {
  const now = new Date().toISOString();
  const userId = user?.id || user?._id || 'client';
  const supplierKey = shop?.id || shop?._id || shop?.name || shop?.companyName || 'boutique';
  const notificationId = demande?.id || `supplier-client-${supplierKey}-${userId}-${Date.now()}`;
  const supplierName = shop?.name || shop?.companyName || demande?.supplierName || '';
  const supplierContact = shop?.contact || shop?.email || demande?.supplierContact || '';

  return {
    id: notificationId,
    sourceNotificationId: notificationId,
    supplierId: shop?.id || shop?._id || demande?.supplierId || '',
    supplierName,
    supplierContact,
    clientId: user?.id || user?._id || demande?.clientId || '',
    clientName: user?.name || user?.fullName || user?.email || demande?.clientName || 'Client ArchiPrice',
    clientProfession: getUserProfession(user),
    clientEmail: user?.email || demande?.clientEmail || '',
    clientPhone: user?.phone || user?.telephone || user?.phoneNumber || 'Non renseigné',
    projectId: project?.id || demande?.projectId || '',
    projectName: project?.name || demande?.projectName || 'Projet sans nom',
    simulationTotal: simulation.total || 0,
    simulationTotalLabel: simulation.totalLabel || '',
    articleCount: simulation.count || products.length,
    categories: simulation.categories || [],
    articleImages: products.flatMap(getArticleCloudinaryLinks),
    selectedArticles: products.map((product) => ({
      id: product.id || product._id || '',
      name: product.name || 'Article sans nom',
      category: product.category || '',
      unitPrice: Number(product.unitPrice || product.price || 0),
      images: getArticleCloudinaryLinks(product),
    })),
    type: 'Demande',
    message,
    messages: demande?.messages || (message ? [{
      id: `message-${Date.now()}`,
      senderRole: 'user',
      senderName: user?.name || user?.fullName || user?.email || 'Client ArchiPrice',
      message,
      createdAt: now,
    }] : []),
    status: demande?.status || 'Nouveau',
    createdAt: demande?.createdAt || now,
    updatedAt: demande?.updatedAt || now,
  };
}

export function upsertSupplierClientNotification(updateAdminData, notification) {
  if (!notification?.id) return;

  updateAdminData((currentData) => {
    const notifications = currentData.supplierClientNotifications || [];
    const exists = notifications.some((item) => item.id === notification.id);

    return {
      ...currentData,
      supplierClientNotifications: exists
        ? notifications.map((item) => (item.id === notification.id ? { ...item, ...notification } : item))
        : [notification, ...notifications],
    };
  });

  notifyDemandesChange({ action: 'upserted-local', demande: notification });
}
