import { useRef, useState } from 'react';
import { Button, Icon } from '../../components/ui';

export default function Fichiers() {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFilesChange(event) {
    setFiles(Array.from(event.target.files || []));
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
          {files.length > 0 && (
            <small>{files.length} fichier(s) sélectionné(s)</small>
          )}
        </div>
      </section>

      <button type="button" className="supplier-files-help">
        En savoir plus sur fichiers
      </button>
    </div>
  );
}
