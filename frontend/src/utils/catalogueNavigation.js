export function normalizeProductSelectionIds(ids = []) {
  return [...new Set((ids || [])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean))];
}

export function mergeSelectedProductIds(currentIds = [], nextIds = []) {
  const normalizedCurrent = normalizeProductSelectionIds(currentIds);
  const normalizedNext = normalizeProductSelectionIds(nextIds);

  return Array.from(new Set([...normalizedCurrent, ...normalizedNext]));
}
