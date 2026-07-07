import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const BUDGET_EXPANDED_MS = 4 * 60_000;

/**
 * Gère le panneau budget : expansion/collapse avec timer automatique,
 * sélection des produits, et calcul du résumé budgétaire.
 *
 * @param {{
 *   products: object[],
 *   initialBudgetTarget?: string,
 *   initialProductIds?: string[],
 *   initialExpanded?: boolean,
 * }} options
 *
 * @returns {{
 *   budgetTarget: string,
 *   setBudgetTarget: Function,
 *   selectedProductIds: string[],
 *   setSelectedProductIds: Function,
 *   selectedProducts: object[],
 *   budgetSummary: object,
 *   isBudgetExpanded: boolean,
 *   setIsBudgetExpanded: Function,
 *   canDisplayBudget: (opts: {isProjectGateCompleted: boolean, activeProjectId: string, pendingProjectPayload: object}) => boolean,
 *   expandBudget: Function,
 *   scheduleBudgetCollapse: Function,
 *   toggleProduct: (productId: string, opts: {isTreated: boolean}) => string,
 * }}
 */
export function useBudgetSimulation({
  products,
  initialBudgetTarget = '',
  initialProductIds = [],
  initialExpanded = false,
}) {
  const [budgetTarget, setBudgetTarget] = useState(initialBudgetTarget);
  const [selectedProductIds, setSelectedProductIds] = useState(initialProductIds);
  const [isBudgetExpanded, setIsBudgetExpanded] = useState(initialExpanded);
  const budgetCollapseTimerRef = useRef(null);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedProductIds.includes(String(p.id ?? '').trim())),
    [products, selectedProductIds],
  );

  const budgetSummary = useMemo(() => {
    const min = selectedProducts.reduce((total, p) => total + p.minPrice, 0);
    const max = selectedProducts.reduce((total, p) => total + p.maxPrice, 0);
    const target = Number(String(budgetTarget || '').replace(/[^\d]/g, ''));
    const hasTarget = Number.isFinite(target) && target > 0;
    const overage = hasTarget ? Math.max(max - target, 0) : 0;
    return { min, max, overage, target, hasTarget };
  }, [budgetTarget, selectedProducts]);

  const scheduleBudgetCollapse = useCallback(() => {
    if (budgetCollapseTimerRef.current) window.clearTimeout(budgetCollapseTimerRef.current);
    budgetCollapseTimerRef.current = window.setTimeout(() => {
      setIsBudgetExpanded(false);
    }, BUDGET_EXPANDED_MS);
  }, []);

  function expandBudget() {
    setIsBudgetExpanded(true);
    scheduleBudgetCollapse();
  }

  function canDisplayBudget({ isProjectGateCompleted, activeProjectId, pendingProjectPayload }) {
    return selectedProducts.length > 0
      || isProjectGateCompleted
      || Boolean(activeProjectId)
      || Boolean(pendingProjectPayload);
  }

  /**
   * Toggle un produit dans la sélection.
   * @returns {'added'|'removed'|'locked'} — action réalisée
   */
  function toggleProduct(productId, { isTreated = false } = {}) {
    if (isTreated) return 'locked';

    const normalizedId = String(productId ?? '').trim();
    const isAdding = !selectedProductIds.includes(normalizedId);
    const nextIds = isAdding
      ? [...selectedProductIds, normalizedId]
      : selectedProductIds.filter((id) => id !== normalizedId);

    setSelectedProductIds(nextIds);

    if (isAdding) expandBudget();
    return isAdding ? 'added' : 'removed';
  }

  // Relance le timer à chaque fois que le panneau s'ouvre.
  useEffect(() => {
    if (isBudgetExpanded) scheduleBudgetCollapse();
  }, [isBudgetExpanded, scheduleBudgetCollapse]);

  useEffect(() => () => {
    if (budgetCollapseTimerRef.current) window.clearTimeout(budgetCollapseTimerRef.current);
  }, []);

  return {
    budgetTarget,
    setBudgetTarget,
    selectedProductIds,
    setSelectedProductIds,
    selectedProducts,
    budgetSummary,
    isBudgetExpanded,
    setIsBudgetExpanded,
    canDisplayBudget,
    expandBudget,
    scheduleBudgetCollapse,
    toggleProduct,
  };
}
