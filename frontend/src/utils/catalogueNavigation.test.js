import { describe, it, expect } from 'vitest';
import { mergeSelectedProductIds, normalizeProductSelectionIds } from './catalogueNavigation.js';

describe('catalogueNavigation', () => {
  it('mergeSelectedProductIds adds new ids without duplicates', () => {
    expect(mergeSelectedProductIds(['1', '2'], ['2', '3', 4])).toEqual(['1', '2', '3', '4']);
  });

  it('normalizeProductSelectionIds handles empty and numeric values', () => {
    expect(normalizeProductSelectionIds(['1', '', 2, null])).toEqual(['1', '2']);
    expect(normalizeProductSelectionIds([])).toEqual([]);
  });
});
