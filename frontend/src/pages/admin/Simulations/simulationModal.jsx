import './simulationModal.css';
import { Alert, Icon } from '../../../components/ui';

function normalizeItemImages(items = []) {
  return items.flatMap((item) => {
    const images = Array.isArray(item.images) ? item.images : [];
    const normalizedImages = images.map((image) => ({
      name: image?.name || item.name || 'Image article',
      secure_url: image?.secure_url || image?.url || '',
    }));

    if (item.imageUrl) {
      normalizedImages.unshift({ name: item.name || 'Image article', secure_url: item.imageUrl });
    }

    return normalizedImages;
  }).filter((image, index, images) => (
    image.secure_url && images.findIndex((item) => item.secure_url === image.secure_url) === index
  ));
}

export default function SimulationModal({ simulation, onClose }) {
  if (!simulation) return null;

  const selectedItems = simulation.items || [];
  const articleImages = normalizeItemImages(selectedItems);

  return (
    <div className="simulation-modal-backdrop" role="presentation">
      <section className="simulation-modal" role="dialog" aria-modal="true" aria-labelledby="simulation-modal-title">
        <header>
          <h2 id="simulation-modal-title">Détail de la simulation</h2>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <section className="simulation-modal__card">
          <h3>Informations générales</h3>
          <div className="simulation-modal__detail-grid">
            <article>
              <span>Utilisateur</span>
              <strong>{simulation.user || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Email</span>
              <strong>{simulation.email || 'Non renseigné'}</strong>
            </article>
            <article>
              <span>Date</span>
              <strong>{simulation.date || '-'}</strong>
            </article>
            <article>
              <span>Ville / Projet</span>
              <strong>{simulation.city || '-'}</strong>
            </article>


          </div>
        </section>

        <section className="simulation-modal__card">
          <h3>Articles ({selectedItems.length})</h3>
          <div className="simulation-modal__items">
            {selectedItems.length === 0 ? (
              <p>Aucun article disponible.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Qté</th>
                    <th>Prix unit. HT</th>
                    <th>Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, index) => (
                    <tr key={`${simulation.id || 'simulation'}-${item.name}-${index}`}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.price}</td>
                      <td>{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="simulation-modal__card">
          <h3>Images Cloudinary des articles choisis</h3>
          {articleImages.length ? (
            <div className="simulation-modal__image-links">
              {articleImages.map((image, index) => (
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
            <Alert variant="info">Aucune image Cloudinary liée à cette simulation.</Alert>
          )}
        </section>

        <footer>
          <button type="button" className="simulation-modal__close" onClick={onClose}>
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
