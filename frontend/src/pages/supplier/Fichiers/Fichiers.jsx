import './Fichiers.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Icon, Loader } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import {
  deleteSupplierFile,
  fetchSupplierFiles,
  fetchSupplierWorkspace,
  resetSupplierFiles,
  subscribeSupplierWorkspaceChange,
  uploadSupplierFiles,
} from '../../../services/supplier';

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return 'Taille non renseignée';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function getProductFiles(products = []) {
  return products.flatMap((product) => {
    const images = Array.isArray(product.images) ? product.images : [];

    return images.map((image, index) => {
      const metadata = image?.metadata || {};

      return {
        id: `${product.id || product._id || product.name}-${image?.public_id || index}`,
        productId: product.id || product._id || '',
        publicId: image?.public_id || '',
        productName: product.name || 'Produit sans nom',
        name: metadata.originalName || `${product.name || 'produit'}-${index + 1}`,
        type: metadata.mimeType || 'Image produit',
        size: metadata.bytes,
        url: getImageUrl(image),
        isProductImage: true,
      };
    }).filter((file) => file.url);
  });
}

export default function Fichiers() {
  const fileInputRef = useRef(null);
  const [cloudFiles, setCloudFiles] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFileId, setDeletingFileId] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hiddenCloudinaryFileIds, setHiddenCloudinaryFileIds] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  function loadWorkspace() {
    let cancelled = false;

    Promise.all([fetchSupplierWorkspace(), fetchSupplierFiles()])
      .then(([data, remoteFiles]) => {
        if (!cancelled) {
          setWorkspace(data);
          setCloudFiles(remoteFiles);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger vos fichiers.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }

  useEffect(() => {
    const cancelLoad = loadWorkspace();
    const unsubscribe = subscribeSupplierWorkspaceChange(() => {
      loadWorkspace();
    });

    return () => {
      cancelLoad();
      unsubscribe();
    };
  }, []);

  const uploadedFiles = useMemo(() => getProductFiles(workspace?.products || []), [workspace?.products]);
  const independentCloudFiles = useMemo(() => cloudFiles.map((file) => ({
    id: String(file._id || file.id || file.public_id),
    productName: 'Médiathèque Cloudinary',
    name: file.metadata?.originalName || file.public_id || 'Fichier',
    type: file.metadata?.mimeType || file.resourceType || 'Média',
    size: file.metadata?.bytes,
    url: file.secure_url || '',
    resourceType: file.resourceType || 'image',
    isIndependent: true,
  })), [cloudFiles]);
  const allCloudFiles = [...independentCloudFiles, ...uploadedFiles];
  const visibleFiles = allCloudFiles.filter((file) => !hiddenCloudinaryFileIds.includes(file.id));

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFilesChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    setIsUploading(true);
    setError('');
    try {
      setCloudFiles(await uploadSupplierFiles(selectedFiles));
      setSuccessMessage(`${selectedFiles.length} fichier(s) stocké(s) sur Cloudinary.`);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Impossible d'envoyer les fichiers sur Cloudinary."));
    } finally {
      setIsUploading(false);
    }
  }

  function hideProductImage(file) {
    setDeletingFileId(file.id);
    setError('');
    setHiddenCloudinaryFileIds((currentIds) => [...new Set([...currentIds, file.id])]);
    window.setTimeout(() => {
      setDeletingFileId('');
    }, 120);
  }

  async function removeFile(file) {
    if (file.isProductImage) {
      hideProductImage(file);
      setSuccessMessage("L'image produit est masquée de cette médiathèque, sans modifier le produit.");
      return;
    }

    setDeletingFileId(file.id);
    setError('');
    try {
      setCloudFiles(await deleteSupplierFile(file.id));
      setSuccessMessage('Fichier supprimé définitivement de la médiathèque.');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de supprimer ce fichier.'));
    } finally {
      setDeletingFileId('');
    }
  }

  async function confirmResetFiles() {
    setDeletingFileId('all');
    setError('');
    setSuccessMessage('');
    setIsResetConfirmOpen(false);
    try {
      setCloudFiles(await resetSupplierFiles());
      setSuccessMessage(
        'Médiathèque vidée. Les images liées aux produits restent intactes sur Cloudinary.',
      );
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Impossible de réinitialiser la médiathèque.'));
    } finally {
      setDeletingFileId('');
    }
  }

  return (
    <div className="supplier-files-page">
      <header className="supplier-files-header">
        <h1>
          <Icon name="Folder" size="sm" />
          Fichiers
        </h1>
        <div className="supplier-files-header__actions">
          <Button
            type="button"
            size="sm"
            icon={<Icon name="History" size="sm" />}
            disabled={visibleFiles.length === 0 || deletingFileId === 'all'}
            onClick={() => setIsResetConfirmOpen(true)}
          >
            Réinitialiser
          </Button>
        </div>
      </header>

      <section className="supplier-files-panel">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="supplier-files-input"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf"
          onChange={handleFilesChange}
        />

        {isLoading && <Loader className="supplier-files-status" label="Chargement des fichiers..." />}
        {isUploading && <Loader className="supplier-files-status" label="Envoi vers Cloudinary..." />}
        {error && (
          <Alert variant="danger" className="supplier-files-status" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {isResetConfirmOpen && (
          <Alert
            variant="warning"
            className="supplier-files-status supplier-files-confirm-alert"
            title="Réinitialiser les fichiers"
            autoCloseMs={0}
            onClose={() => setIsResetConfirmOpen(false)}
          >
            <span>
              Supprimer définitivement les fichiers indépendants ? Les images utilisées par les produits
              resteront intactes.
            </span>
            <span className="supplier-files-confirm-alert__actions">
              <button type="button" onClick={() => setIsResetConfirmOpen(false)}>Annuler</button>
              <button type="button" onClick={confirmResetFiles}>Réinitialiser</button>
            </span>
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" className="supplier-files-status" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}
        {!isLoading && !error && visibleFiles.length === 0 && (
          <div className="supplier-files-empty">
            <div className="supplier-files-art" aria-hidden="true">
              <span className="supplier-files-art__video">
                <i />
              </span>
              <span className="supplier-files-art__image" />
              <span className="supplier-files-art__document">
                <i />
                <b />
                <b />
                <b />
              </span>
            </div>
            <h2>Chargez et gérez vos fichiers</h2>
            <p>Les fichiers peuvent être des images, des vidéos, des documents, etc.</p>
            <Button type="button" variant="outline" size="sm" onClick={openFilePicker}>
              Charger des fichiers
            </Button>
          </div>
        )}

        {!isLoading && !error && visibleFiles.length > 0 && (
          <div className="supplier-files-grid">
            {visibleFiles.map((file) => (
              <article key={file.id} className="supplier-file-card">
                <div className="supplier-file-card__preview">
                  {file.url && file.resourceType === 'video' ? (
                    <video src={file.url} controls preload="metadata" aria-label={file.name} />
                  ) : file.url && String(file.type).startsWith('image/') ? (
                    <img src={file.url} alt={file.name} />
                  ) : file.url && String(file.type).includes('pdf') ? (
                    <a href={file.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${file.name}`}>
                      <Icon name="Folder" size="lg" />
                    </a>
                  ) : file.url ? (
                    <img src={file.url} alt={file.name} />
                  ) : (
                    <Icon name="Folder" size="lg" />
                  )}
                </div>
                <div className="supplier-file-card__body">
                  <strong>{file.name}</strong>
                  <span>{file.productName}</span>
                  <small>{file.type} · {formatFileSize(file.size)}</small>
                </div>
                <button
                  type="button"
                  className="supplier-file-card__delete"
                  title={file.isProductImage
                    ? 'Masquer de cette vue sans modifier le produit'
                    : 'Supprimer définitivement de la médiathèque'}
                  disabled={deletingFileId === file.id}
                  onClick={() => removeFile(file)}
                >
                  <Icon name="Delete" size="sm" />
                </button>
              </article>
            ))}
          </div>
        )}

        {!isLoading && !error && visibleFiles.length > 0 && (
          <div className="supplier-files-empty supplier-files-empty--compact">
            <Button type="button" variant="outline" size="sm" onClick={openFilePicker}>
              Charger des fichiers
            </Button>
            <small>Les fichiers importés restent disponibles sur Cloudinary.</small>
          </div>
        )}
      </section>

      
    </div>
  );
}
