import { useMemo, useState } from 'react';
import Button from '../components/Button';
import Icon from '../components/Icon';

const FILTERS = {
  categories: ['Tout', 'Mobilier', 'Luminaire', 'Revêtement', 'Sanitaire', 'Décoration'],
  rooms: ['Toutes', 'Salon', 'Chambre', 'Bureau', 'Douche', 'Appartement', 'Espace externe'],
  ranges: ['Toutes', 'Essentiel', 'Confort', 'Premium'],
};

const PRODUCTS = [
  {
    id: 'canape-lima',
    name: 'Canapé Lima',
    category: 'Mobilier',
    room: 'Salon',
    range: 'Confort',
    minPrice: 185000,
    maxPrice: 320000,
    shop: 'Maison Pro',
    tone: 'linen',
  },
  {
    id: 'suspension-nova',
    name: 'Suspension Nova',
    category: 'Luminaire',
    room: 'Salon',
    range: 'Premium',
    minPrice: 42000,
    maxPrice: 88000,
    shop: 'BatiPlus Déco',
    tone: 'amber',
  },
  {
    id: 'carrelage-matera',
    name: 'Carrelage Matera',
    category: 'Revêtement',
    room: 'Appartement',
    range: 'Confort',
    minPrice: 9500,
    maxPrice: 18000,
    shop: 'Archi Matériaux',
    tone: 'stone',
  },
  {
    id: 'vasque-elio',
    name: 'Vasque Elio',
    category: 'Sanitaire',
    room: 'Douche',
    range: 'Premium',
    minPrice: 76000,
    maxPrice: 145000,
    shop: 'Maison Pro',
    tone: 'ceramic',
  },
  {
    id: 'bureau-oslo',
    name: 'Bureau Oslo',
    category: 'Mobilier',
    room: 'Bureau',
    range: 'Essentiel',
    minPrice: 68000,
    maxPrice: 125000,
    shop: 'Maison Pro',
    tone: 'wood',
  },
  {
    id: 'fauteuil-kora',
    name: 'Fauteuil Kora',
    category: 'Mobilier',
    room: 'Chambre',
    range: 'Confort',
    minPrice: 54000,
    maxPrice: 98000,
    shop: 'BatiPlus Déco',
    tone: 'sage',
  },
  {
    id: 'applique-mina',
    name: 'Applique Mina',
    category: 'Luminaire',
    room: 'Chambre',
    range: 'Essentiel',
    minPrice: 18000,
    maxPrice: 39000,
    shop: 'Archi Matériaux',
    tone: 'night',
  },
  {
    id: 'table-terrasse',
    name: 'Table terrasse',
    category: 'Décoration',
    room: 'Espace externe',
    range: 'Premium',
    minPrice: 115000,
    maxPrice: 210000,
    shop: 'Jardin & Terrasse',
    tone: 'garden',
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Catalogue() {
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedRoom, setSelectedRoom] = useState('Toutes');
  const [selectedRange, setSelectedRange] = useState('Toutes');
  const [budgetTarget, setBudgetTarget] = useState(650000);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const filteredProducts = useMemo(
    () => PRODUCTS.filter((product) => (
      (selectedCategory === 'Tout' || product.category === selectedCategory)
      && (selectedRoom === 'Toutes' || product.room === selectedRoom)
      && (selectedRange === 'Toutes' || product.range === selectedRange)
    )),
    [selectedCategory, selectedRange, selectedRoom],
  );

  const selectedProducts = useMemo(
    () => PRODUCTS.filter((product) => selectedProductIds.includes(product.id)),
    [selectedProductIds],
  );

  const budgetSummary = useMemo(() => {
    const min = selectedProducts.reduce((total, product) => total + product.minPrice, 0);
    const max = selectedProducts.reduce((total, product) => total + product.maxPrice, 0);
    const overage = Math.max(max - budgetTarget, 0);

    return { min, max, overage };
  }, [budgetTarget, selectedProducts]);

  function toggleProduct(productId) {
    setSelectedProductIds((currentIds) => (
      currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId]
    ));
  }

  return (
    <div className="catalogue-page catalogue-page--products">
      <aside className="catalogue-filter-panel" aria-label="Filtres du catalogue">
        <div>
          <span className="catalogue-eyebrow">Explorer Catalogue</span>
          <h1>Filtres</h1>
        </div>

        <section className="catalogue-filter-group">
          <h2>Catégorie</h2>
          <div>
            {FILTERS.categories.map((category) => (
              <button
                type="button"
                className={selectedCategory === category ? 'is-active' : ''}
                key={category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className="catalogue-filter-group">
          <h2>Pièce</h2>
          <div>
            {FILTERS.rooms.map((room) => (
              <button
                type="button"
                className={selectedRoom === room ? 'is-active' : ''}
                key={room}
                onClick={() => setSelectedRoom(room)}
              >
                {room}
              </button>
            ))}
          </div>
        </section>

        <section className="catalogue-filter-group">
          <h2>Gamme</h2>
          <div>
            {FILTERS.ranges.map((range) => (
              <button
                type="button"
                className={selectedRange === range ? 'is-active' : ''}
                key={range}
                onClick={() => setSelectedRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="catalogue-product-main">
        <div className="catalogue-product-heading">
          <div>
            <span className="catalogue-eyebrow">Cartes produits</span>
            <h2>{filteredProducts.length} produits disponibles</h2>
          </div>

        </div>

        <section className="catalogue-product-grid" aria-label="Produits du catalogue">
          {filteredProducts.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);

            return (
              <article className="catalogue-product-card" key={product.id}>
                <div className={`catalogue-product-photo catalogue-product-photo--${product.tone}`}>
                  <span>{product.category}</span>
                </div>
                <div className="catalogue-product-card__body">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.shop}</p>
                  </div>
                  <strong>
                    {formatCurrency(product.minPrice)} - {formatCurrency(product.maxPrice)}
                  </strong>
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? 'outline' : 'primary'}
                    icon={<Icon name={isSelected ? 'Check' : 'Add'} size="sm" />}
                    onClick={() => toggleProduct(product.id)}
                  >
                    {isSelected ? 'Ajouté' : 'Ajouter'}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <aside className="catalogue-budget-panel" aria-label="Simulation budget live">
        <div className="catalogue-budget-card">
          <span className="catalogue-eyebrow">Simulation budget live</span>
          <h2>Budget</h2>

          <label className="catalogue-budget-field">
            Budget cible
            <input
              type="number"
              min="0"
              step="10000"
              value={budgetTarget}
              onChange={(event) => setBudgetTarget(Number(event.target.value))}
            />
          </label>

          <dl className="catalogue-budget-list">
            <div>
              <dt>Estimation min</dt>
              <dd>{formatCurrency(budgetSummary.min)}</dd>
            </div>
            <div>
              <dt>Estimation max</dt>
              <dd>{formatCurrency(budgetSummary.max)}</dd>
            </div>
            <div className={budgetSummary.overage > 0 ? 'is-over' : 'is-ok'}>
              <dt>Dépassement éventuel</dt>
              <dd>{budgetSummary.overage > 0 ? formatCurrency(budgetSummary.overage) : 'Aucun'}</dd>
            </div>
          </dl>

          <p>
            {selectedProducts.length === 0
              ? 'Ajoutez des produits pour lancer la simulation.'
              : `${selectedProducts.length} produit(s) ajouté(s) au panier budget.`}
          </p>
        </div>
      </aside>
    </div>
  );
}
