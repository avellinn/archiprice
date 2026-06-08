export function sanitizeNumericInput(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

export function isNumericOnly(value) {
  return /^\d+$/.test(String(value || '').trim());
}
