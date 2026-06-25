const SALE_UNITS = Object.freeze([
  { value: 'u', label: 'Pièce' },
  { value: 'lot', label: 'Lot' },
  { value: 'm', label: 'Mètre' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'l', label: 'Litre' },
  { value: 'kg', label: 'Kg' },
  { value: 'carton', label: 'Carton' },
  { value: 'palette', label: 'Palette' },
  { value: 'roll', label: 'Rouleau' },
  { value: 'sac', label: 'Sac' },
  { value: 'pot', label: 'Pot' },
  { value: 'bidon', label: 'Bidon' },
  { value: 'box', label: 'Boîte' },
  { value: 'tonne', label: 'Tonne' },
  { value: 'bar', label: 'Barre' },
]);

const UNIT_BY_LABEL = new Map(SALE_UNITS.map((unit) => [unit.label, unit.value]));

function subcategory(name, unitLabels) {
  const allowedUnits = unitLabels.map((label) => UNIT_BY_LABEL.get(label));
  return Object.freeze({ name, allowedUnits: Object.freeze(allowedUnits), defaultUnit: allowedUnits[0] });
}

const PRODUCT_CATEGORIES = Object.freeze([
  {
    name: 'Mobilier',
    subcategories: [
      subcategory('Canapés', ['Pièce', 'Lot']), subcategory('Fauteuils', ['Pièce', 'Lot']),
      subcategory('Chaises', ['Pièce', 'Lot']), subcategory('Tables', ['Pièce', 'Lot']),
      subcategory('Bureaux', ['Pièce']), subcategory('Meubles TV', ['Pièce']),
      subcategory('Bibliothèques', ['Pièce']), subcategory('Buffets', ['Pièce']),
      subcategory('Armoires', ['Pièce']), subcategory('Commodes', ['Pièce']),
      subcategory('Lits', ['Pièce']), subcategory('Matelas', ['Pièce']),
      subcategory('Mobilier extérieur', ['Pièce', 'Lot']),
    ],
  },
  {
    name: 'Revêtements de sol',
    subcategories: [
      subcategory('Carrelage', ['m²', 'Carton', 'Palette']), subcategory('Parquet', ['m²', 'Carton']),
      subcategory('Sol PVC', ['m²', 'Rouleau']), subcategory('Moquette', ['m²', 'Rouleau']),
      subcategory('Béton ciré', ['m²', 'Sac']), subcategory('Vinyle', ['m²', 'Rouleau']),
    ],
  },
  {
    name: 'Revêtements muraux',
    subcategories: [
      subcategory('Papier peint', ['Rouleau', 'm²']), subcategory('Panneaux décoratifs', ['Pièce', 'm²']),
      subcategory('Parement mural', ['m²', 'Carton']), subcategory('Lambris', ['m²', 'Pièce']),
    ],
  },
  {
    name: 'Peinture et finitions',
    subcategories: [
      subcategory('Peinture intérieure', ['Litre', 'Pot', 'Bidon']),
      subcategory('Peinture extérieure', ['Litre', 'Pot', 'Bidon']),
      subcategory('Vernis', ['Litre']), subcategory('Enduit', ['Sac', 'Kg']),
      subcategory('Résine', ['Litre', 'Bidon']),
    ],
  },
  {
    name: 'Éclairage',
    subcategories: [
      subcategory('Suspensions', ['Pièce']), subcategory('Lustres', ['Pièce']),
      subcategory('Appliques murales', ['Pièce']), subcategory('Spots', ['Pièce', 'Boîte']),
      subcategory('Lampadaires', ['Pièce']), subcategory('Lampes de table', ['Pièce']),
      subcategory('Rubans LED', ['Mètre', 'Rouleau']),
    ],
  },
  {
    name: 'Sanitaire',
    subcategories: [
      subcategory('Lavabos', ['Pièce']), subcategory('Vasques', ['Pièce']), subcategory('WC', ['Pièce']),
      subcategory('Douches', ['Pièce']), subcategory('Baignoires', ['Pièce']),
      subcategory('Robinetterie', ['Pièce', 'Lot']), subcategory('Éviers', ['Pièce']),
    ],
  },
  {
    name: 'Cuisine',
    subcategories: [
      subcategory('Meubles bas', ['Pièce']), subcategory('Meubles hauts', ['Pièce']),
      subcategory('Plans de travail', ['Mètre', 'Pièce']), subcategory('Électroménager', ['Pièce']),
      subcategory('Crédences', ['m²', 'Pièce']),
    ],
  },
  {
    name: 'Textiles et décoration',
    subcategories: [
      subcategory('Rideaux', ['Mètre', 'Pièce']), subcategory('Voilages', ['Mètre', 'Pièce']),
      subcategory('Tapis', ['Pièce']), subcategory('Coussins', ['Pièce', 'Lot']),
      subcategory('Linge de maison', ['Pièce', 'Lot']),
    ],
  },
  {
    name: 'Portes et menuiseries',
    subcategories: [
      subcategory('Portes intérieures', ['Pièce']), subcategory('Portes extérieures', ['Pièce']),
      subcategory('Fenêtres', ['Pièce']), subcategory('Baies vitrées', ['Pièce']),
      subcategory('Escaliers', ['Pièce']), subcategory('Garde-corps', ['Mètre', 'Pièce']),
    ],
  },
  {
    name: 'Électricité',
    subcategories: [
      subcategory('Câbles', ['Mètre', 'Rouleau']), subcategory('Gaines', ['Mètre', 'Rouleau']),
      subcategory('Prises', ['Pièce']), subcategory('Interrupteurs', ['Pièce']),
      subcategory('Tableaux électriques', ['Pièce']), subcategory('Disjoncteurs', ['Pièce']),
    ],
  },
  {
    name: 'Plomberie',
    subcategories: [
      subcategory('Tuyaux PVC', ['Mètre', 'Barre']), subcategory('Tuyaux cuivre', ['Mètre', 'Barre']),
      subcategory('Raccords', ['Pièce']), subcategory('Vannes', ['Pièce']), subcategory('Pompes', ['Pièce']),
    ],
  },
  {
    name: 'Climatisation et ventilation',
    subcategories: [
      subcategory('Climatiseurs', ['Pièce']), subcategory('Ventilateurs', ['Pièce']),
      subcategory("Extracteurs d'air", ['Pièce']), subcategory('Gaines de ventilation', ['Mètre']),
    ],
  },
  {
    name: 'Matériaux de construction',
    subcategories: [
      subcategory('Ciment', ['Sac', 'Tonne']), subcategory('Sable', ['m³', 'Tonne']),
      subcategory('Gravier', ['m³', 'Tonne']), subcategory('Briques', ['Pièce', 'Palette']),
      subcategory('Parpaings', ['Pièce', 'Palette']), subcategory('Acier', ['Barre', 'Tonne']),
    ],
  },
  {
    name: 'Aménagement extérieur',
    subcategories: [
      subcategory('Pavés', ['m²', 'Palette']), subcategory('Gazon synthétique', ['m²', 'Rouleau']),
      subcategory('Clôtures', ['Mètre', 'Pièce']), subcategory('Pergolas', ['Pièce']),
      subcategory('Mobilier de jardin', ['Pièce', 'Lot']),
    ],
  },
  {
    name: 'Accessoires et décoration',
    subcategories: [
      subcategory('Miroirs', ['Pièce']), subcategory('Tableaux', ['Pièce']),
      subcategory('Objets décoratifs', ['Pièce']), subcategory('Vases', ['Pièce']),
      subcategory('Horloges', ['Pièce']),
    ],
  },
].map((category) => Object.freeze({
  ...category,
  subcategories: Object.freeze(category.subcategories),
})));

const normalizeName = (value) => String(value || '').trim().toLocaleLowerCase('fr');

function getProductCategory(categoryName) {
  const normalizedName = normalizeName(categoryName);
  return PRODUCT_CATEGORIES.find((category) => normalizeName(category.name) === normalizedName) || null;
}

function getProductSubcategory(categoryName, subcategoryName) {
  const category = getProductCategory(categoryName);
  const normalizedName = normalizeName(subcategoryName);
  return category?.subcategories.find((item) => normalizeName(item.name) === normalizedName) || null;
}

function getSaleUnit(unitValue) {
  return SALE_UNITS.find((unit) => unit.value === unitValue) || null;
}

function isUnitAllowedForSubcategory(categoryName, subcategoryName, unitValue) {
  return Boolean(getProductSubcategory(categoryName, subcategoryName)?.allowedUnits.includes(unitValue));
}

function validateProductClassification({ category, subcategory: subcategoryName, unit }) {
  const matchedCategory = getProductCategory(category);
  if (!matchedCategory) return { valid: false, message: 'Catégorie produit invalide' };

  const matchedSubcategory = getProductSubcategory(matchedCategory.name, subcategoryName);
  if (!matchedSubcategory) return { valid: false, message: 'Sous-catégorie invalide pour cette catégorie' };

  if (!matchedSubcategory.allowedUnits.includes(unit)) {
    return { valid: false, message: `L’unité ${getSaleUnit(unit)?.label || unit} n’est pas autorisée pour ${matchedSubcategory.name}` };
  }

  return { valid: true, category: matchedCategory, subcategory: matchedSubcategory };
}

const SALE_UNIT_VALUES = Object.freeze(SALE_UNITS.map((unit) => unit.value));

export {
  PRODUCT_CATEGORIES,
  SALE_UNITS,
  SALE_UNIT_VALUES,
  getProductCategory,
  getProductSubcategory,
  getSaleUnit,
  isUnitAllowedForSubcategory,
  validateProductClassification,
};
