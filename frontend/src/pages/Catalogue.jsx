import Text from '../components/Text';

const CATALOGUE_ITEMS = [
  { name: 'Maison individuelle', category: 'Résidentiel', price: 'À partir de 450 000 FCFA' },
  { name: 'Immeuble R+2', category: 'Collectif', price: 'À partir de 1 800 000 FCFA' },
  { name: 'Local commercial', category: 'Professionnel', price: 'À partir de 720 000 FCFA' },
];

export default function Catalogue() {
  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="workspace-eyebrow">
            Catalogue
          </Text>
          <h1>Explorer catalogue</h1>
        </div>
      </div>

      <section className="workspace-card">
        <div className="catalogue-grid">
          {CATALOGUE_ITEMS.map((item) => (
            <article className="catalogue-item" key={item.name}>
              <Text as="strong" variant="bold" size="md">
                {item.name}
              </Text>
              <Text as="span" size="sm" className="muted">
                {item.category}
              </Text>
              <Text as="span" variant="bold" size="sm">
                {item.price}
              </Text>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
