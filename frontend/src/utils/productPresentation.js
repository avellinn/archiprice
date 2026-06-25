import { getSaleUnit } from '../constants/productTaxonomy';
import { translateWorkspaceText } from './workspaceLanguage';

const PRODUCT_LABELS_EN = { Pièce: 'Room' };

export function getProductImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

export function getProductImages(product) {
  const images = Array.isArray(product?.images)
    ? product.images.map(getProductImageUrl).filter(Boolean)
    : [];
  const primaryImage = getProductImageUrl(product?.image || product?.imageUrl);
  return [...new Set([primaryImage, ...images].filter(Boolean))];
}

export function getLocalizedProductField(product, field, language = 'fr') {
  const normalizedLanguage = String(language || '').toLowerCase().startsWith('en') ? 'en' : 'fr';
  const translatedValue = product?.translations?.[normalizedLanguage]?.[field];
  const sourceValue = translatedValue || product?.[field] || '';
  return translateWorkspaceText(sourceValue, normalizedLanguage);
}

function formatFCFA(amount, language) {
  const locale = String(language || '').toLowerCase().startsWith('en') ? 'en-US' : 'fr-FR';
  return `${new Intl.NumberFormat(locale).format(Number(amount || 0))} FCFA`;
}

function formatPricePerUnit(amount, unitValue, language) {
  const unitLabel = getSaleUnit(unitValue)?.label || unitValue || 'unité';
  return `${formatFCFA(amount, language)} / ${translateWorkspaceText(unitLabel, language)}`;
}

function getProductDimensions(product, language) {
  let dimensions = product?.dimensions && typeof product.dimensions === 'object'
    ? product.dimensions
    : {};
  if (typeof product?.dimensions === 'string') {
    try {
      dimensions = JSON.parse(product.dimensions);
    } catch {
      dimensions = {};
    }
  }
  return [
    ['Longueur', dimensions.length],
    ['Largeur', dimensions.width],
    ['Épaisseur', dimensions.thickness],
    ['Poids', dimensions.weight],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => [translateWorkspaceText(label, language), value]);
}

export function getProductDetailSections(product, language = 'fr') {
  const isEnglish = String(language || '').toLowerCase().startsWith('en');
  const label = (value) => (isEnglish && PRODUCT_LABELS_EN[value]) || translateWorkspaceText(value, language);
  const value = (field) => getLocalizedProductField(product, field, language);
  const unitLabel = getSaleUnit(product?.unit)?.label || product?.unit || 'unité';
  const pricingRows = [
    [label('Prix HT'), product?.priceExcludingTax !== undefined ? formatPricePerUnit(product.priceExcludingTax, product.unit, language) : ''],
    [label('TVA'), product?.vatRate !== undefined ? `${product.vatRate}%` : ''],
    [label('Prix TTC'), product?.unitPrice || product?.price ? formatFCFA(product.unitPrice || product.price, language) : ''],
    [label('Unité de vente'), translateWorkspaceText(unitLabel, language)],
    [label('Quantité minimale'), product?.minimumOrderQuantity ? `${product.minimumOrderQuantity} ${translateWorkspaceText(unitLabel, language)}` : ''],
    [label('Gamme'), value('range')],
    [label('Disponibilité'), value('availability')],
  ].filter(([, rowValue]) => String(rowValue || '').trim());
  const organizationRows = [
    [label('Pièce'), value('room')],
    [label('Catégorie'), value('category')],
    [label('Sous-catégorie'), value('subcategory')],
    [label('Localisation'), [product?.city, product?.neighborhood].filter(Boolean).join(', ')],
    [label('Boutique'), product?.supplierName || product?.shop || product?.supplier],
  ].filter(([, rowValue]) => String(rowValue || '').trim());
  const description = getLocalizedProductField(product, 'description', language);
  const descriptionRows = description ? [[label('Description'), description]] : [];

  return [
    { id: 'pricing', title: label('Dimensions et tarif'), rows: [...pricingRows, ...getProductDimensions(product, language)] },
    { id: 'organization', title: label('Organisation fournisseur'), rows: organizationRows },
    { id: 'description', title: label('Détails produit'), rows: descriptionRows },
  ].filter((section) => section.rows.length > 0);
}

export function normalizeExportedProduct(item) {
  return {
    ...item,
    name: item?.name || 'Produit sans nom',
    unitPrice: item?.unitPrice ?? item?.rawPrice ?? 0,
    priceExcludingTax: item?.priceExcludingTax ?? item?.rawPrice ?? 0,
    image: item?.image || item?.imageUrl || '',
    images: item?.images || [],
  };
}

export function createExportedProductSnapshot(product) {
  const images = getProductImages(product);
  return {
    id: product?.id || product?._id || product?.catalogueProductId || '',
    name: product?.name || '',
    description: product?.description || '',
    translations: product?.translations || undefined,
    category: product?.category || '',
    subcategory: product?.subcategory || '',
    room: product?.room || '',
    range: product?.range || '',
    availability: product?.availability || '',
    city: product?.city || '',
    neighborhood: product?.neighborhood || '',
    supplier: product?.supplier || '',
    supplierName: product?.supplierName || product?.shop || '',
    unit: product?.unit || '',
    unitPrice: Number(product?.unitPrice ?? product?.price ?? 0),
    priceExcludingTax: Number(product?.priceExcludingTax ?? product?.unitPrice ?? product?.price ?? 0),
    vatRate: Number(product?.vatRate || 0),
    minimumOrderQuantity: Number(product?.minimumOrderQuantity || 1),
    dimensions: product?.dimensions || {},
    image: images[0] || '',
    imageUrl: images[0] || '',
    images,
  };
}
