import { Icon } from './ui';
import './Filterpanel.css';

function FilterGroup({ title, options, activeValue, onSelect }) {
  return (
    <section className="catalogue-filter-group">
      <h2>{title}</h2>
      <div>
        {options.map((option, index) => (
          <button
            type="button"
            className={activeValue === option ? 'is-active' : ''}
            key={`${option}-${index}`}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Filterpanel({
  filters,
  activeCategory,
  activeRoom,
  activeRange,
  activeCity,
  activeNeighborhood,
  onCategoryChange,
  onRoomChange,
  onRangeChange,
  onCityChange,
  onNeighborhoodChange,
  onWorkspaceReturn,
}) {
  return (
    <aside className="catalogue-filter-panel" aria-label="Filtres du catalogue">
      <div>
        <button
          type="button"
          className="catalogue-workspace-return"
          onClick={onWorkspaceReturn}
        >
          <Icon name="ArrowLeft" size="sm" />
        </button>
        <span className="catalogue-eyebrow"></span>
        <h1>Filtres</h1>
      </div>

      <FilterGroup title="Catégorie" options={filters.categories} activeValue={activeCategory} onSelect={onCategoryChange} />
      <FilterGroup title="Pièce" options={filters.rooms} activeValue={activeRoom} onSelect={onRoomChange} />
      <FilterGroup title="Gamme" options={filters.ranges} activeValue={activeRange} onSelect={onRangeChange} />
      <FilterGroup title="Ville" options={filters.cities} activeValue={activeCity} onSelect={onCityChange} />
      <FilterGroup title="Quartier" options={filters.neighborhoods} activeValue={activeNeighborhood} onSelect={onNeighborhoodChange} />
    </aside>
  );
}