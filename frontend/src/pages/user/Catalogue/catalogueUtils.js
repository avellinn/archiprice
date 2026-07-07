import { formatFCFA, parsePrice } from './useCatalogueProducts';

export function extractProjectBudget(project) {
  const budgetTarget = Number(project?.budgetTarget);
  if (Number.isFinite(budgetTarget) && budgetTarget > 0) return budgetTarget;
  const budgetMatch = (project?.description || '').match(/Estimation budget\s*:\s*([^\n]+)/i);
  const budget = Number(String(budgetMatch?.[1] || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(budget) && budget > 0 ? budget : null;
}

export function buildProjectDescription({ selectedProducts, budgetTarget, budgetSummary, baseDescription = '' }) {
  const configuredRoom = String(baseDescription).match(/Type de pièce\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const rooms = configuredRoom || [...new Set(selectedProducts.map((p) => p.room))].join(', ');
  const shops = [...new Set(selectedProducts.map((p) => p.shop))].join(', ');
  const productList = selectedProducts.map((p) => `- ${p.name} (${p.shop})`).join('\n');

  return [
    `Type de pièce : ${rooms || 'Non renseigné'}`,
    `Estimation budget : ${budgetTarget ? formatFCFA(budgetTarget) : 'Non renseigné'}`,
    `Estimation min : ${formatFCFA(budgetSummary.min)}`,
    `Estimation max : ${formatFCFA(budgetSummary.max)}`,
    `Boutiques : ${shops || 'Non renseigné'}`,
    'Articles sélectionnés :',
    productList,
  ].join('\n');
}

export function getGeneratedProjectName() {
  return `Projet catalogue ${new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())}`;
}

export function buildProjectProductPayload(product) {
  return {
    name: product.name,
    description: [
      `Boutique : ${product.shop}`,
      `Gamme : ${product.range}`,
      `Prix min : ${product.minPrice}`,
      `Prix max : ${product.maxPrice}`,
    ].join('\n'),
    category: product.category,
    subcategory: product.subcategory || '',
    unit: product.unit,
    unitPrice: product.maxPrice,
    priceExcludingTax: product.priceExcludingTax ?? product.minPrice,
    vatRate: product.vatRate ?? 0,
    minimumOrderQuantity: product.minimumOrderQuantity ?? 1,
    images: product.imageDocuments || [],
    catalogueProductId: product.id,
  };
}

export function projectProductMatchesCatalogue(projectProduct, catalogueProduct) {
  if (projectProduct.catalogueProductId) {
    return String(projectProduct.catalogueProductId) === String(catalogueProduct.id);
  }
  return (
    String(projectProduct.name || '').trim().toLocaleLowerCase('fr') ===
    String(catalogueProduct.name || '').trim().toLocaleLowerCase('fr') &&
    String(projectProduct.category || '').trim().toLocaleLowerCase('fr') ===
    String(catalogueProduct.category || '').trim().toLocaleLowerCase('fr')
  );
}

export function isProductSelected(productId, selectedProductIds) {
  return selectedProductIds.includes(String(productId ?? '').trim());
}

export function computeBudgetSummary(selectedProducts, budgetTarget) {
  const min = selectedProducts.reduce((total, p) => total + p.minPrice, 0);
  const max = selectedProducts.reduce((total, p) => total + p.maxPrice, 0);
  const target = parsePrice(budgetTarget);
  const hasTarget = target > 0;
  const overage = hasTarget ? Math.max(max - target, 0) : 0;
  return { min, max, overage, target, hasTarget };
}
