import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCT_CATEGORIES,
  getProductSubcategory,
  isUnitAllowedForSubcategory,
  validateProductClassification,
} from '../../shared/productTaxonomy.mjs';

test('chaque sous-catégorie possède des unités et une unité par défaut autorisée', () => {
  assert.equal(PRODUCT_CATEGORIES.length, 15);
  PRODUCT_CATEGORIES.forEach((category) => {
    assert.ok(category.subcategories.length > 0, category.name);
    category.subcategories.forEach((subcategory) => {
      assert.ok(subcategory.allowedUnits.length > 0, subcategory.name);
      assert.ok(subcategory.allowedUnits.includes(subcategory.defaultUnit), subcategory.name);
    });
  });
});

test('les associations métier autorisées sont acceptées', () => {
  assert.equal(isUnitAllowedForSubcategory('Mobilier', 'Canapés', 'u'), true);
  assert.equal(isUnitAllowedForSubcategory('Mobilier', 'Canapés', 'lot'), true);
  assert.equal(isUnitAllowedForSubcategory('Revêtements de sol', 'Carrelage', 'm2'), true);
  assert.equal(isUnitAllowedForSubcategory('Peinture et finitions', 'Peinture intérieure', 'l'), true);
  assert.equal(getProductSubcategory('Revêtements de sol', 'Carrelage').defaultUnit, 'm2');
});

test('les associations incohérentes sont refusées', () => {
  assert.equal(validateProductClassification({ category: 'Mobilier', subcategory: 'Canapés', unit: 'm2' }).valid, false);
  assert.equal(validateProductClassification({ category: 'Peinture et finitions', subcategory: 'Peinture intérieure', unit: 'u' }).valid, false);
  assert.equal(validateProductClassification({ category: 'Revêtements de sol', subcategory: 'Carrelage', unit: 'l' }).valid, false);
});
