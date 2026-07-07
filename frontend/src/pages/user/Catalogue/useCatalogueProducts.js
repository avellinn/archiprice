import { useCallback, useEffect, useMemo, useState } from 'react';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { fetchCatalogueProducts } from '../../../services/catalogueProducts';
import { getSaleUnit } from '../../../constants/productTaxonomy';

const VISUAL_TONES = {
  sofa: 'linen',
  table: 'wood',
  lamp: 'amber',
  tile: 'stone',
  paint: 'sage',
  chair: 'night',
  shelf: 'wood',
  'wall-light': 'amber',
};

export function parsePrice(value) {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsedValue = Number(normalized);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

export function formatCurrency(value) {
  return formatFCFA(value);
}

export function formatOptionalCurrency(value) {
  return value > 0 ? formatFCFA(value) : 'À définir';
}

export function formatProductPrice(product) {
  const price = product.priceExcludingTax ?? product.minPrice ?? product.unitPrice ?? 0;
  const unitLabel = getSaleUnit(product.unit)?.label || product.unit || 'unité';
  return `${formatFCFA(price)} / ${unitLabel.toLocaleLowerCase('fr')}`;
}

export function normalizeBudgetInput(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

export function formatBudgetInputValue(value) {
  const amount = parsePrice(value);
  return amount > 0 ? formatFCFA(amount) : '';
}

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.secure_url || image.url || '';
}

function getCoefficient(city, regionalCoefficients) {
  const item = regionalCoefficients.find((coefficient) => coefficient.city === city);
  const value = Number(String(item?.coefficient || '1').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function buildCatalogueProduct(product, adminData) {
  const { settings } = adminData;
  const basePrice = parsePrice(product.price ?? product.unitPrice);
  const margin = Number(settings.margin || 0) / 100;
  const vat = product.priceExcludingTax !== undefined
    ? 0
    : Number(settings.vat || 0) / 100;
  const regionalCoefficient = getCoefficient(product.city, adminData.regionalCoefficients);
  const minPrice = Math.round(basePrice * regionalCoefficient);
  const maxPrice = Math.round(basePrice * (1 + margin) * (1 + vat) * regionalCoefficient);
  const supplier = adminData.suppliers.find((item) => item.name === product.supplier);
  const locationLabel = [product.city, product.neighborhood].filter(Boolean).join(' · ');
  const imageDocuments = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : [];
  const images = imageDocuments.length > 0
    ? imageDocuments.map(getImageUrl).filter(Boolean)
    : [product.image].filter(Boolean);
  const primaryImage = images[0] || '';

  return {
    ...product,
    id: String(product.id ?? '').trim(),
    minPrice,
    maxPrice,
    shop: supplier?.name || product.supplier || product.supplierName || product.shop,
    shopZone: locationLabel || supplier?.region || product.city,
    tone: VISUAL_TONES[product.visual] || 'linen',
    image: primaryImage,
    images,
    imageDocuments,
  };
}

function isPublishedCatalogueProduct(product) {
  return !product.publicationStatus || product.publicationStatus === 'Validé';
}

function isSupplierVisible(product, adminData) {
  const supplier = (adminData.suppliers || []).find((item) => (
    item.name === product.supplier || item.companyName === product.supplier
  ));
  if (!supplier) return true;
  return !['Bloqué', 'Supprimé'].includes(supplier.status);
}

/**
 * Charge les produits du catalogue, applique les transformations de prix
 * (marges, TVA, coefficients régionaux) et expose les produits publiés filtrés.
 *
 * @returns {{
 *   products: object[],
 *   publishedCatalogueProducts: object[],
 *   isLoadingProducts: boolean,
 *   productsError: string,
 *   loadCatalogueProducts: (options?: {silent?: boolean, force?: boolean}) => void,
 * }}
 */
export function useCatalogueProducts() {
  const [adminData] = useAdminData();
  const [catalogueProducts, setCatalogueProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState('');

  const loadCatalogueProducts = useCallback(({ silent = false, force = false } = {}) => {
    if (!silent) setIsLoadingProducts(true);

    fetchCatalogueProducts({ force })
      .then((items) => {
        setCatalogueProducts(items);
        setProductsError('');
      })
      .catch((error) => {
        setCatalogueProducts([]);
        setProductsError(getApiErrorMessage(error, 'Impossible de charger le catalogue.'));
      })
      .finally(() => {
        if (!silent) setIsLoadingProducts(false);
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadCatalogueProducts, 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalogueProducts]);

  useRealtimeRefresh(
    () => loadCatalogueProducts({ silent: true, force: true }),
    ['admin-products', 'supplier-products', 'suppliers', 'catalogue-config'],
  );

  const products = useMemo(() => (
    catalogueProducts
      .filter(isPublishedCatalogueProduct)
      .filter((product) => isSupplierVisible(product, adminData))
      .map((product) => buildCatalogueProduct(product, adminData))
  ), [adminData, catalogueProducts]);

  const publishedCatalogueProducts = useMemo(() => (
    catalogueProducts
      .filter(isPublishedCatalogueProduct)
      .filter((product) => isSupplierVisible(product, adminData))
      .filter((product) => product.supplierUserId)
  ), [adminData, catalogueProducts]);

  return {
    products,
    publishedCatalogueProducts,
    isLoadingProducts,
    productsError,
    loadCatalogueProducts,
  };
}
