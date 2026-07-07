import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminData } from '../../../services/adminData';
import { buildCatalogueLocationFilters } from '../../../utils/locationOptions';

const FILTER_COLLAPSE_MS = 60_000;

function buildFieldFilter(products, field, allLabel) {
  const values = [...new Set(
    products
      .map((product) => String(product?.[field] || '').trim())
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'fr'));

  return [allLabel, ...values];
}

/**
 * Gère l'état des filtres actifs, le panneau filtres (expand/collapse avec timer),
 * et calcule les produits filtrés + les options de salle depuis adminData.
 *
 * @param {{
 *   products: object[],
 *   publishedCatalogueProducts: object[],
 *   catalogueSearchTerm: string,
 *   initialSnapshot?: object,
 * }} options
 *
 * @returns {{
 *   filters: object,
 *   activeCategory: string,
 *   activeRoom: string,
 *   activeRange: string,
 *   activeCity: string,
 *   activeNeighborhood: string,
 *   selectedCategory: string,
 *   selectedRoom: string,
 *   selectedRange: string,
 *   selectedCity: string,
 *   selectedNeighborhood: string,
 *   setSelectedCategory: Function,
 *   setSelectedRoom: Function,
 *   setSelectedRange: Function,
 *   setSelectedCity: Function,
 *   setSelectedNeighborhood: Function,
 *   filteredProducts: object[],
 *   isFilterExpanded: boolean,
 *   shouldShowFilterPanel: boolean,
 *   handleExpandFilters: Function,
 *   handleCollapseFilters: Function,
 *   handleFilterInteract: Function,
 *   roomOptions: object[],
 * }}
 */
export function useCatalogueFilters({
  products,
  publishedCatalogueProducts,
  catalogueSearchTerm = '',
  initialSnapshot = {},
}) {
  const [adminData] = useAdminData();
  const [selectedCategory, setSelectedCategory] = useState(initialSnapshot.selectedCategory || 'Tout');
  const [selectedRoom, setSelectedRoom] = useState(initialSnapshot.selectedRoom || 'Toutes');
  const [selectedRange, setSelectedRange] = useState(initialSnapshot.selectedRange || 'Toutes');
  const [selectedCity, setSelectedCity] = useState(initialSnapshot.selectedCity || 'Toutes');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(initialSnapshot.selectedNeighborhood || 'Tous');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const filterCollapseTimerRef = useRef(null);

  const filters = useMemo(() => {
    const locationFilters = buildCatalogueLocationFilters({ products: publishedCatalogueProducts });
    return {
      categories: buildFieldFilter(publishedCatalogueProducts, 'category', 'Tout'),
      rooms: buildFieldFilter(publishedCatalogueProducts, 'room', 'Toutes'),
      ranges: buildFieldFilter(publishedCatalogueProducts, 'range', 'Toutes'),
      cities: locationFilters.cities,
      neighborhoods: locationFilters.neighborhoods,
    };
  }, [publishedCatalogueProducts]);

  const activeCategory = filters.categories.includes(selectedCategory) ? selectedCategory : 'Tout';
  const activeRoom = filters.rooms.includes(selectedRoom) ? selectedRoom : 'Toutes';
  const activeRange = filters.ranges.includes(selectedRange) ? selectedRange : 'Toutes';
  const activeCity = filters.cities.includes(selectedCity) ? selectedCity : 'Toutes';
  const activeNeighborhood = filters.neighborhoods.includes(selectedNeighborhood) ? selectedNeighborhood : 'Tous';

  const hasCatalogueProducts = products.length > 0;
  const hasCatalogueFilters = Object.values(adminData?.taxonomies || {}).some((items) => (
    Array.isArray(items) && items.length > 0
  ));
  const shouldShowFilterPanel = hasCatalogueProducts && hasCatalogueFilters;

  const filteredProducts = useMemo(
    () => products.filter((product) => {
      const matchesFilters = (
        (activeCategory === 'Tout' || product.category === activeCategory)
        && (activeRoom === 'Toutes' || product.room === activeRoom)
        && (activeRange === 'Toutes' || product.range === activeRange)
        && (activeCity === 'Toutes' || product.city === activeCity)
        && (activeNeighborhood === 'Tous' || product.neighborhood === activeNeighborhood)
      );
      const matchesSearch = !catalogueSearchTerm
        || [product.name, product.category, product.room, product.range, product.shop, product.shopZone, product.city, product.neighborhood]
          .some((value) => String(value || '').toLowerCase().includes(catalogueSearchTerm));

      return matchesFilters && matchesSearch;
    }),
    [activeCategory, activeCity, activeNeighborhood, activeRange, activeRoom, catalogueSearchTerm, products],
  );

  const roomOptions = useMemo(() => (
    (adminData.taxonomies?.rooms || [])
      .map((room) => room?.name || room?.label || room)
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }))
  ), [adminData.taxonomies?.rooms]);

  const resetFilterCollapseTimer = useCallback(() => {
    if (filterCollapseTimerRef.current) window.clearTimeout(filterCollapseTimerRef.current);
    if (!shouldShowFilterPanel || !isFilterExpanded) return;

    filterCollapseTimerRef.current = window.setTimeout(() => {
      setIsFilterExpanded(false);
    }, FILTER_COLLAPSE_MS);
  }, [isFilterExpanded, shouldShowFilterPanel]);

  useEffect(() => {
    resetFilterCollapseTimer();
    return () => {
      if (filterCollapseTimerRef.current) window.clearTimeout(filterCollapseTimerRef.current);
    };
  }, [resetFilterCollapseTimer]);

  function handleExpandFilters() {
    setIsFilterExpanded(true);
  }

  function handleCollapseFilters() {
    setIsFilterExpanded(false);
  }

  function handleFilterInteract() {
    resetFilterCollapseTimer();
  }

  return {
    filters,
    activeCategory,
    activeRoom,
    activeRange,
    activeCity,
    activeNeighborhood,
    selectedCategory,
    selectedRoom,
    selectedRange,
    selectedCity,
    selectedNeighborhood,
    setSelectedCategory,
    setSelectedRoom,
    setSelectedRange,
    setSelectedCity,
    setSelectedNeighborhood,
    filteredProducts,
    isFilterExpanded,
    shouldShowFilterPanel,
    handleExpandFilters,
    handleCollapseFilters,
    handleFilterInteract,
    roomOptions,
  };
}
