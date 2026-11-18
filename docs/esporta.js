import { formatoData, kg } from './util.js';
import { ultimeSerie, aumentoDovuto, prestazione } from './progressione.js';

export const FORMATO = 1;
const APERTURA = '```json palestra-ripristino';

export async function impronta(testo) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function nomeFile(alIso) {
  return `palestra-export-${formatoData(alIso)}.md`;
}

const perData = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
const valore = x => (x == null ? '' : kg(x));

function tabellaSeduta(s) {
  const righe = new Map();
  for (const x of [...s.serie].sort((a, b) => a.n - b.n)) {
    if (!righe.has(x.esercizioId)) righe.set(x.esercizioId, { nome: x.nome, serie: [] });
    righe.get(x.esercizioId).serie.push(`${kg(x.kg)}×${x.reps}${x.rir == null ? '' : ` (RIR ${x.rir})`}`);
  }
  return [`### ${formatoData(s.data)}, giorno ${s.giorno}`, '', '| Esercizio | Serie |', '|---|---|',
    ...[...righe.values()].map(r => `| ${r.nome} | ${r.serie.join(' · ')} |`), ''].join('\n');
}

export async function creaEsportazione(stato, dal, al) {
  const nelPeriodo = x => (!dal || x.data >= dal) && x.data <= al;
  const sedute = stato.sedute.filter(nelPeriodo).sort(perData);
  const misure = stato.misure.filter(nelPeriodo).sort(perData);
  const carichi = stato.scheda.giorni.flatMap(g => g.esercizi.map(e => {
    const prec = ultimeSerie(stato.sedute, e.id);
    return `| ${g.id} | ${e.nome} | ${prestazione(prec)} | ${aumentoDovuto(prec, e) ? `sì, +${kg(e.passo)} kg` : 'no'} |`;
  }));
  const blocco = JSON.stringify({ formato: FORMATO, impronta: await impronta(JSON.stringify(stato)), stato });
  return [
    '---', `date: ${formatoData(al)}`, 'tags: [palestra]', 'project: palestra', 'type: attivita', '---',
    `# Registro palestra, esportazione del ${formatoData(al)}`, '',
    `Periodo: ${dal ? `dal ${formatoData(dal)}` : "dall'inizio"} al ${formatoData(al)}. Sedute: ${sedute.length}. Misure: ${misure.length}. Formato dei dati: ${FORMATO}.`, '',
    '## Sedute', '',
    ...(sedute.length ? sedute.map(tabellaSeduta) : ['Nessuna seduta nel periodo.', '']),
    '## Misure', '',
    ...(misure.length
      ? ['| Data | Peso (kg) | Grasso (%) | Vita (cm) |', '|---|---|---|---|',
        ...misure.map(m => `| ${formatoData(m.data)} | ${valore(m.peso)} | ${valore(m.grasso)} | ${valore(m.vita)} |`)]
      : ['Nessuna misura nel periodo.']),
    '', '## Carichi correnti', '', '| Giorno | Esercizio | Ultima prestazione | Aumento in attesa |', '|---|---|---|---|', ...carichi,
    '', '## Blocco di ripristino', '', "Non modificare: serve all'app per ripartire da questo file.", '',
    APERTURA, blocco, '```', '',
  ].join('\n');
}

const dataIso = x => testo(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);
const testo = x => typeof x === 'string';
const numero = x => typeof x === 'number';
const numeroONull = x => x === null || numero(x);

function valido(s) {
  return !!s && Array.isArray(s.sedute) && Array.isArray(s.misure) && !!s.scheda && Array.isArray(s.scheda.giorni)
    && !!s.impostazioni && typeof s.impostazioni === 'object'
    && s.sedute.every(x => !!x && testo(x.id) && dataIso(x.data) && Array.isArray(x.serie)
      && x.serie.every(r => !!r && numero(r.kg) && numero(r.reps)))
    && s.misure.every(m => !!m && dataIso(m.data) && numeroONull(m.peso) && numeroONull(m.grasso) && numeroONull(m.vita))
    && s.scheda.giorni.every(g => !!g && Array.isArray(g.esercizi) && g.esercizi.every(e => !!e && testo(e.id) && testo(e.nome)
      && numero(e.serie) && numero(e.rangeMin) && numero(e.rangeMax) && numero(e.passo)));
}

export async function leggiEsportazione(testo) {
  const i = testo.indexOf(APERTURA);
  if (i < 0) return { ok: false, errore: 'Il file non contiene il blocco di ripristino.' };
  const inizio = testo.indexOf('\n', i) + 1;
  const fine = testo.indexOf('\n```', inizio);
  if (fine < 0) return { ok: false, errore: 'Il blocco di ripristino è incompleto.' };
  let corpo;
  try { corpo = JSON.parse(testo.slice(inizio, fine)); } catch { return { ok: false, errore: 'Il blocco di ripristino non è leggibile.' }; }
  // scorciatoia: con un solo formato non ci sono conversioni; quando nasce il formato 2, la conversione dall'1 va qui.
  if (typeof corpo.formato !== 'number' || corpo.formato > FORMATO) {
    return { ok: false, errore: "Il file viene da una versione più recente dell'app: aggiorna l'app e riprova." };
  }
  if (await impronta(JSON.stringify(corpo.stato)) !== corpo.impronta) {
    return { ok: false, errore: 'Il file è stato modificato o è incompleto: il codice di controllo non corrisponde.' };
  }
  if (!valido(corpo.stato)) return { ok: false, errore: 'Il contenuto del blocco di ripristino non è valido.' };
  const ultima = corpo.stato.sedute.reduce((m, s) => (s.data > m ? s.data : m), '');
  return { ok: true, stato: corpo.stato, riepilogo: { sedute: corpo.stato.sedute.length, misure: corpo.stato.misure.length, ultimaSeduta: ultima || null } };
}
