import { giorniTra, formatoData, kg } from './util.js';

const perData = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);

export function mediaMobile(misure, giorni = 7) {
  const pesi = misure.filter(m => m.peso != null).sort(perData);
  return pesi.map(m => {
    const finestra = pesi.filter(x => x.data <= m.data && giorniTra(x.data, m.data) < giorni);
    return { data: m.data, valore: finestra.reduce((s, x) => s + x.peso, 0) / finestra.length };
  });
}

export function grafico(misure, larghezza = 340, altezza = 180) {
  const pesi = misure.filter(m => m.peso != null).sort(perData);
  if (pesi.length < 2) return '<p class="vuoto">Servono almeno due pesate per il grafico.</p>';
  const vite = misure.filter(m => m.vita != null).sort(perData);
  const date = [...pesi, ...vite].map(m => m.data).sort();
  const inizio = date[0];
  const durata = Math.max(1, giorniTra(inizio, date.at(-1)));
  const margine = 28;
  const x = d => margine + (giorniTra(inizio, d) / durata) * (larghezza - 2 * margine);
  const scala = valori => {
    const lo = Math.min(...valori), hi = Math.max(...valori), pad = (hi - lo) * 0.1 || 0.5;
    return v => altezza - 20 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (altezza - 30);
  };
  const linea = (punti, y, classe) =>
    `<polyline class="${classe}" points="${punti.map(p => `${x(p.data).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>`;
  const yPeso = scala(pesi.map(m => m.peso));
  const valoriPeso = pesi.map(m => m.peso);
  let svg = `<svg viewBox="0 0 ${larghezza} ${altezza}" role="img" aria-label="Andamento del peso">`;
  svg += pesi.map(m => `<circle class="pesata" cx="${x(m.data).toFixed(1)}" cy="${yPeso(m.peso).toFixed(1)}" r="2.5"/>`).join('');
  svg += linea(mediaMobile(pesi).map(m => ({ data: m.data, v: m.valore })), yPeso, 'media');
  if (vite.length >= 2) svg += linea(vite.map(m => ({ data: m.data, v: m.vita })), scala(vite.map(m => m.vita)), 'vita');
  svg += `<text x="2" y="12">${kg(Math.max(...valoriPeso))}</text><text x="2" y="${altezza - 22}">${kg(Math.min(...valoriPeso))}</text>`;
  svg += `<text x="${margine}" y="${altezza - 4}">${formatoData(inizio)}</text>`;
  svg += `<text x="${larghezza - margine}" y="${altezza - 4}" text-anchor="end">${formatoData(date.at(-1))}</text></svg>`;
  svg += `<p class="legenda"><span>punti: pesate</span><span>linea: media 7 giorni</span>${vite.length >= 2 ? '<span>tratteggio: vita</span>' : ''}</p>`;
  return svg;
}
