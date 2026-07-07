import Icon from '../../../components/Icon';

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

/**
 * Panneau de filtres latéral du catalogue.
 */
export default function CatalogueFilterpanel({
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
  onInteract,
  onMinimize,
}) {
  function handleSelect(onSelect) {
    return (value) => {
      onInteract?.();
      onSelect(value);
    };
  }

  return (
    <aside
      className="catalogue-filter-panel catalogue-filter-panel--expanded"
      aria-label="Filtres du catalogue"
    >
      <div className="catalogue-filter-panel__header">
        <button
          type="button"
          className="catalogue-panel-minimize"
          aria-label="Réduire les filtres"
          onClick={onMinimize}
        >
          <Icon name="ChevronLeft" size="sm" />
        </button>
      </div>

      <FilterGroup
        title="Catégorie"
        options={filters.categories}
        activeValue={activeCategory}
        onSelect={handleSelect(onCategoryChange)}
      />
      <FilterGroup
        title="Pièce"
        options={filters.rooms}
        activeValue={activeRoom}
        onSelect={handleSelect(onRoomChange)}
      />
      <FilterGroup
        title="Gamme"
        options={filters.ranges}
        activeValue={activeRange}
        onSelect={handleSelect(onRangeChange)}
      />
      <FilterGroup
        title="Ville"
        options={filters.cities}
        activeValue={activeCity}
        onSelect={handleSelect(onCityChange)}
      />
      <FilterGroup
        title="Quartier"
        options={filters.neighborhoods}
        activeValue={activeNeighborhood}
        onSelect={handleSelect(onNeighborhoodChange)}
      />
    </aside>
  );
}
