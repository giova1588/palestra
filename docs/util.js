export function oggi(ora = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${ora.getFullYear()}-${p(ora.getMonth() + 1)}-${p(ora.getDate())}`;
}

export function formatoData(iso) {
  const [a, m, g] = iso.split('-');
  return `${g}-${m}-${a}`;
}

export function giorniTra(isoDa, isoA) {
  return Math.round((Date.parse(isoA) - Date.parse(isoDa)) / 86400000);
}

export function kg(numero) {
  return String(numero).replace('.', ',');
}

export function esc(testo) {
  return String(testo).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
