export function getUniqueLocationValues(values = []) {
  return [...new Set(
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'fr'));
}

export function buildCityOptions(adminData = {}, { products = [] } = {}) {
  return getUniqueLocationValues([
    ...(adminData.taxonomies?.cities || []).map((item) => item.name),
    ...(adminData.regionalCoefficients || []).map((item) => item.city),
    ...(adminData.suppliers || []).map((supplier) => supplier.city || supplier.region || supplier.zone),
    adminData.supplierSettings?.settings?.city,
    ...products.map((product) => product.city),
  ]);
}

export function buildNeighborhoodOptions(adminData = {}, { products = [] } = {}) {
  return getUniqueLocationValues([
    ...(adminData.taxonomies?.neighborhoods || []).map((item) => item.name),
    ...(adminData.suppliers || []).map((supplier) => supplier.neighborhood),
    adminData.supplierSettings?.settings?.neighborhood,
    ...products.map((product) => product.neighborhood),
  ]);
}

export function buildCatalogueLocationFilters({ products = [] } = {}) {
  return {
    cities: ['Toutes', ...getUniqueLocationValues(products.map((product) => product.city))],
    neighborhoods: ['Tous', ...getUniqueLocationValues(products.map((product) => product.neighborhood))],
  };
}
