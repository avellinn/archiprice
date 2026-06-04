import './Fichiers.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Icon } from '../../../components/ui';
import { MAX_FILES_PER_UPLOAD } from '../../../constants/uploads';
import { getApiErrorMessage } from '../../../services/api';
import { deleteSupplierProductImage, fetchSupplierWorkspace, subscribeSupplierWorkspaceChange } from '../../../services/supplier';

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
      };
    }).filter((file) => file.url);
  });
}

export default function Fichiers() {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFileId, setDeletingFileId] = useState('');
  const [pendingImageDelete, setPendingImageDelete] = useState(null);
  const [uploadLimitMessage, setUploadLimitMessage] = useState('');

  function loadWorkspace() {
    let cancelled = false;

    fetchSupplierWorkspace()
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data);
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
  const localFiles = useMemo(() => files.map((file, index) => ({
    id: `local-${file.name}-${index}`,
    productName: 'Import manuel',
    name: file.name,
    type: file.type || 'Fichier local',
    size: file.size,
    url: file.type?.startsWith('image/') ? URL.createObjectURL(file) : '',
    isLocal: true,
  })), [files]);
  const visibleFiles = [...uploadedFiles, ...localFiles];

  useEffect(() => () => {
    localFiles.forEach((file) => {
      if (file.url) URL.revokeObjectURL(file.url);
    });
  }, [localFiles]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFilesChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    const acceptedFiles = selectedFiles.slice(0, MAX_FILES_PER_UPLOAD);

    if (selectedFiles.length > MAX_FILES_PER_UPLOAD) {
      setUploadLimitMessage(`Maximum ${MAX_FILES_PER_UPLOAD} fichiers par import. Les ${MAX_FILES_PER_UPLOAD} premiers fichiers ont été ajoutés.`);
    } else {
      setUploadLimitMessage('');
    }

    setFiles((currentFiles) => [...currentFiles, ...acceptedFiles]);
    event.target.value = '';
  }

  function removeLocalFile(fileId) {
    setFiles((currentFiles) => currentFiles.filter((file, index) => `local-${file.name}-${index}` !== fileId));
  }

  async function confirmProductImageDelete() {
    const file = pendingImageDelete;
    if (!file.productId || !file.publicId) return;

    setDeletingFileId(file.id);
    setError('');
    setPendingImageDelete(null);

    try {
      const updatedProduct = await deleteSupplierProductImage(file.productId, file.publicId);

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        products: (currentWorkspace?.products || []).map((product) => (
          product.id === updatedProduct.id ? updatedProduct : product
        )),
      }));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Impossible de supprimer l'image."));
    } finally {
      setDeletingFileId('');
    }
  }

  function removeProductImage(file) {
    setPendingImageDelete(file);
  }

  return (
    <div className="supplier-files-page">
      <header className="supplier-files-header">
        <h1>
          <Icon name="Folder" size="sm" />
          Fichiers
        </h1>
        <div className="supplier-files-header__actions">
          <Button type="button" size="sm" onClick={openFilePicker}>
            Importer des fichiers
          </Button>
          <button type="button" aria-label="Options d'import">
            <Icon name="ChevronDown" size="sm" />
          </button>
        </div>
      </header>

      <section className="supplier-files-panel">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="supplier-files-input"
          onChange={handleFilesChange}
        />

        {isLoading && <p className="supplier-files-status">Chargement des fichiers...</p>}
        {error && (
          <Alert variant="danger" className="supplier-files-status" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {pendingImageDelete && (
          <Alert
            variant="warning"
            className="supplier-files-status supplier-files-confirm-alert"
            title="Supprimer l'image"
            onClose={() => setPendingImageDelete(null)}
          >
            <span>Supprimer l'image "{pendingImageDelete.name}" ?</span>
            <span className="supplier-files-confirm-alert__actions">
              <button type="button" onClick={() => setPendingImageDelete(null)}>Annuler</button>
              <button type="button" onClick={confirmProductImageDelete}>Supprimer</button>
            </span>
          </Alert>
        )}
        {uploadLimitMessage && (
          <Alert variant="warning" className="supplier-files-status" onClose={() => setUploadLimitMessage('')}>
            {uploadLimitMessage}
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
                  {file.url ? <img src={file.url} alt={file.name} /> : <Icon name="Folder" size="lg" />}
                </div>
                <div className="supplier-file-card__body">
                  <strong>{file.name}</strong>
                  <span>{file.productName}</span>
                  <small>{file.type} · {formatFileSize(file.size)}</small>
                </div>
                {file.isLocal && <span className="supplier-file-card__badge">Sélectionné</span>}
                {file.isLocal && (
                  <button
                    type="button"
                    className="supplier-file-card__delete"
                    title="Supprimer le fichier"
                    onClick={() => removeLocalFile(file.id)}
                  >
                    <Icon name="Delete" size="sm" />
                  </button>
                )}
                {!file.isLocal && file.publicId && (
                  <button
                    type="button"
                    className="supplier-file-card__delete"
                    title="Supprimer l'image"
                    disabled={deletingFileId === file.id}
                    onClick={() => removeProductImage(file)}
                  >
                    <Icon name="Delete" size="sm" />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        {!isLoading && !error && visibleFiles.length > 0 && (
          <div className="supplier-files-empty supplier-files-empty--compact">
            <Button type="button" variant="outline" size="sm" onClick={openFilePicker}>
              Charger des fichiers
            </Button>
            {files.length > 0 && (
              <small>{files.length} fichier(s) sélectionné(s). {MAX_FILES_PER_UPLOAD} maximum par import.</small>
            )}
          </div>
        )}
      </section>

      
    </div>
  );
}
