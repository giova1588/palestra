import { kg } from './util.js';

// Serie dell'esercizio nell'ultima seduta in cui è stato fatto, in ordine; null se mai fatto.
export function ultimeSerie(sedute, esercizioId, escludiSedutaId = null) {
  const fatte = sedute
    .filter(s => s.id !== escludiSedutaId && s.serie.some(x => x.esercizioId === esercizioId))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  if (!fatte.length) return null;
  return fatte[0].serie.filter(x => x.esercizioId === esercizioId).sort((a, b) => a.n - b.n);
}

// Spec, sezione 2: contano solo le prime N serie previste, tutte al massimo del range e allo stesso carico.
export function aumentoDovuto(serie, esercizio) {
  if (!serie || serie.length < esercizio.serie) return false;
  const prime = serie.slice(0, esercizio.serie);
  return prime.every(x => x.kg === prime[0].kg && x.reps >= esercizio.rangeMax);
}

export function valoriProposti(serie, esercizio) {
  const aumento = aumentoDovuto(serie, esercizio);
  return Array.from({ length: esercizio.serie }, (_, i) => {
    if (!serie) return { kg: null, reps: null };
    if (aumento) return { kg: serie[0].kg + esercizio.passo, reps: esercizio.rangeMin };
    const s = serie[Math.min(i, serie.length - 1)];
    return { kg: s.kg, reps: s.reps };
  });
}

export function posizioniRange(serie, esercizio) {
  if (!serie) return [];
  const ampiezza = esercizio.rangeMax - esercizio.rangeMin || 1;
  return serie.map(x => Math.min(1, Math.max(0, (x.reps - esercizio.rangeMin) / ampiezza)));
}

export function prestazione(serie) {
  if (!serie || !serie.length) return 'prima volta';
  if (serie.every(x => x.kg === serie[0].kg)) return `${kg(serie[0].kg)} kg: ${serie.map(x => x.reps).join(' · ')}`;
  return serie.map(x => `${kg(x.kg)}×${x.reps}`).join(' · ');
}
