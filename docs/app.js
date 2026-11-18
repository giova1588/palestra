import * as dati from './dati.js';
import { oggi, formatoData, giorniTra, kg, esc } from './util.js';
import { ultimeSerie, aumentoDovuto, valoriProposti, posizioniRange, prestazione } from './progressione.js';
import { creaEsportazione, leggiEsportazione, nomeFile } from './esporta.js';
import { grafico } from './grafico.js';

const app = document.getElementById('app');
const boxErrore = document.getElementById('errore');
let stato;
let persistente = false;
let bozza; // copia della scheda in modifica
let promemoria = false; // dopo un'esportazione, per la prima home che si disegna

// --- errori e salvataggi ---

function mostraErrore(testo, conEsporta = true) {
  boxErrore.innerHTML = `${esc(testo)}${conEsporta ? ' <button data-azione="esporta">Esporta ora</button>' : ''}`;
  boxErrore.hidden = false;
}
const nascondiErrore = () => { boxErrore.hidden = true; };

async function salva(lavoro) {
  try { await lavoro(); nascondiErrore(); return true; }
  catch (e) { mostraErrore(`Salvataggio non riuscito: ${e?.message || e}. Quanto hai appena inserito non è salvato.`); return false; }
}

// --- home ---

function giornoProposto() {
  const giorni = stato.scheda.giorni;
  const ultima = [...stato.sedute].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)).at(-1);
  const i = ultima ? giorni.findIndex(g => g.id === ultima.giorno) : -1;
  return giorni[(i + 1) % giorni.length]?.id;
}

function giorniDaEsportazione() {
  const riferimento = stato.impostazioni.ultimaEsportazione || [...stato.sedute, ...stato.misure].map(x => x.data).sort()[0];
  return riferimento ? giorniTra(riferimento, oggi()) : 0;
}

function home() {
  const aperta = stato.sedute.find(s => !s.chiusa);
  const giorni = giorniDaEsportazione();
  const avviso = giorni > (persistente ? 14 : 7)
    ? `<div class="avviso" data-test="avviso-esporta">Ultima esportazione ${giorni} giorni fa: esporta ora. <button data-azione="esporta">Esporta</button></div>` : '';
  const ricorda = promemoria
    ? '<div class="promemoria" data-test="promemoria">File passato a Drive: controlla che sia comparso nella cartella palestra-esportazioni.</div>' : '';
  promemoria = false;
  const proposto = giornoProposto();
  const seduta = aperta
    ? `<button class="primario" data-azione="riprendi">Riprendi seduta ${esc(aperta.giorno)}</button>`
    : stato.scheda.giorni.length
      ? `<div class="riga"><select id="giorno" aria-label="Giorno">${stato.scheda.giorni.map(g =>
        `<option value="${esc(g.id)}" ${g.id === proposto ? 'selected' : ''}>${esc(g.nome)}</option>`).join('')}</select>
        <button class="primario" data-azione="inizia">Inizia seduta</button></div>`
      : '<p>Nessuna scheda: importa il file di avvio da Scheda e dati.</p>';
  app.innerHTML = `${ricorda}${avviso}${seduta}
    <button data-azione="misura">Misura</button>
    <section>${grafico(stato.misure)}</section>
    <button data-azione="scheda">Scheda e dati</button>`;
}

// --- seduta ---

async function inizia(giornoId) {
  const s = { id: crypto.randomUUID(), data: oggi(), giorno: giornoId, chiusa: false, serie: [] };
  if (await salva(() => dati.salvaSeduta(s))) { stato.sedute.push(s); mostraSeduta(s.id); }
}

function barra(prec, es) {
  const posizioni = posizioniRange(prec, es);
  if (!posizioni.length) return '';
  return `<div class="barra"><span>${es.rangeMin}</span><div class="pista">${posizioni.map(p =>
    `<i style="left:${Math.round(p * 100)}%"></i>`).join('')}</div><span>${es.rangeMax}</span></div>`;
}

function bloccoEsercizio(s, es, aperto) {
  const fatte = s.serie.filter(x => x.esercizioId === es.id).sort((a, b) => a.n - b.n);
  const prec = ultimeSerie(stato.sedute, es.id, s.id);
  const n = fatte.length + 1;
  const ultima = fatte.at(-1);
  const proposta = valoriProposti(prec, es)[n - 1] || (ultima ? { kg: ultima.kg, reps: ultima.reps } : { kg: null, reps: null });
  const pulsanti = (campo, passo) => [
    `<button data-azione="meno" data-campo="${campo}" data-passo="${passo}" aria-label="meno">−</button>`,
    `<button data-azione="piu" data-campo="${campo}" data-passo="${passo}" aria-label="più">+</button>`];
  const [menoKg, piuKg] = pulsanti('kg', es.passo);
  const [menoReps, piuReps] = pulsanti('reps', 1);
  return `<details data-esercizio="${esc(es.id)}" ${aperto ? 'open' : ''}>
    <summary>${esc(es.nome)} <span class="conta">${fatte.length}/${es.serie}</span></summary>
    ${es.nota ? `<p class="nota">${esc(es.nota)}</p>` : ''}
    <p class="prec">Volta scorsa: ${esc(prestazione(prec))}</p>
    ${barra(prec, es)}
    ${aumentoDovuto(prec, es) ? `<p class="aumento" data-test="aumento">+${kg(es.passo)} kg: tutte le serie a ${es.rangeMax} l'ultima volta</p>` : ''}
    ${fatte.length ? `<ol class="fatte">${fatte.map(x => `<li>${kg(x.kg)} kg × ${x.reps}${x.rir == null ? '' : ` · RIR ${x.rir}`} <button data-azione="togli-serie" data-seduta="${esc(s.id)}" data-esercizio="${esc(es.id)}" data-n="${x.n}" aria-label="Togli serie ${x.n}">Togli</button></li>`).join('')}</ol>` : ''}
    <div class="serie" data-n="${n}">
      <span>Serie ${n}${n > es.serie ? ' (in più)' : ''}</span>
      <div class="campo">${menoKg}<input name="kg" type="number" inputmode="decimal" step="any" aria-label="kg" value="${proposta.kg ?? ''}"><span>kg</span>${piuKg}</div>
      <div class="campo">${menoReps}<input name="reps" type="number" inputmode="numeric" aria-label="ripetizioni" value="${proposta.reps ?? ''}"><span>rip.</span>${piuReps}</div>
      <select name="rir" aria-label="RIR"><option value="">RIR</option>${[0, 1, 2, 3, 4].map(v => `<option value="${v}">${v}</option>`).join('')}</select>
      <button class="primario" data-azione="fatto" data-seduta="${esc(s.id)}" data-esercizio="${esc(es.id)}">Fatto</button>
    </div>
  </details>`;
}

function mostraSeduta(id, aperto = null) {
  const s = stato.sedute.find(x => x.id === id);
  const giorno = stato.scheda.giorni.find(g => g.id === s.giorno) || { nome: `Giorno ${s.giorno}`, esercizi: [] };
  app.innerHTML = `<h1>${esc(giorno.nome)} · ${formatoData(s.data)}</h1>
    ${giorno.esercizi.map(es => bloccoEsercizio(s, es, es.id === aperto)).join('')}
    <button class="primario" data-azione="fine" data-seduta="${esc(s.id)}">Fine seduta</button>
    <button data-azione="home">Torna alla home</button>`;
}

function cambia(pulsante, verso) {
  const input = pulsante.parentElement.querySelector('input');
  const valore = Math.max(0, (Number(input.value) || 0) + verso * Number(pulsante.dataset.passo));
  input.value = Math.round(valore * 100) / 100;
}

async function fatto(pulsante) {
  const riga = pulsante.closest('.serie');
  const s = stato.sedute.find(x => x.id === pulsante.dataset.seduta);
  const es = stato.scheda.giorni.flatMap(g => g.esercizi).find(e => e.id === pulsante.dataset.esercizio);
  const campoKg = riga.querySelector('[name=kg]').value;
  const reps = Number(riga.querySelector('[name=reps]').value);
  const rir = riga.querySelector('[name=rir]').value;
  if (campoKg === '' || !(Number(campoKg) >= 0) || !Number.isInteger(reps) || reps < 1) {
    mostraErrore('Inserisci un carico e un numero di ripetizioni validi.', false);
    return;
  }
  s.serie.push({ esercizioId: es.id, nome: es.nome, rangeMin: es.rangeMin, rangeMax: es.rangeMax,
    n: Number(riga.dataset.n), kg: Number(campoKg), reps, rir: rir === '' ? null : Number(rir) });
  pulsante.disabled = true; // un secondo tocco prima del salvataggio registrerebbe una serie doppia
  if (await salva(() => dati.salvaSeduta(s))) mostraSeduta(s.id, es.id);
  else { s.serie.pop(); pulsante.disabled = false; }
}

async function togliSerie(b) {
  const s = stato.sedute.find(x => x.id === b.dataset.seduta);
  const n = Number(b.dataset.n);
  const x = s.serie.find(r => r.esercizioId === b.dataset.esercizio && r.n === n);
  if (!confirm(`Togliere la serie ${n}: ${kg(x.kg)} kg × ${x.reps}?`)) return;
  const prima = s.serie;
  s.serie = prima.filter(r => r !== x).map(r => (r.esercizioId === x.esercizioId && r.n > n ? { ...r, n: r.n - 1 } : r));
  if (!(await salva(() => dati.salvaSeduta(s)))) { s.serie = prima; return; }
  mostraSeduta(s.id, x.esercizioId);
  // la serie tolta si corregge con − e +: la riga di inserimento riparte dai suoi valori
  const riga = app.querySelector(`details[data-esercizio="${CSS.escape(x.esercizioId)}"] .serie`);
  riga.querySelector('[name=kg]').value = x.kg;
  riga.querySelector('[name=reps]').value = x.reps;
  riga.querySelector('[name=rir]').value = x.rir ?? '';
}

async function fine(id) {
  const s = stato.sedute.find(x => x.id === id);
  if (!s.serie.length) { // una seduta aperta per errore non deve restare in archivio
    if (await salva(() => dati.eliminaSeduta(id))) { stato.sedute = stato.sedute.filter(x => x !== s); home(); }
    return;
  }
  s.chiusa = true;
  if (await salva(() => dati.salvaSeduta(s))) home();
  else s.chiusa = false;
}

async function chiudiSeduteVecchie() {
  for (const s of stato.sedute.filter(x => !x.chiusa && x.data < oggi())) {
    s.chiusa = true;
    await salva(() => dati.salvaSeduta(s));
  }
}

// --- misura ---

function mostraMisura(data = oggi()) {
  const m = stato.misure.find(x => x.data === data) || {};
  const campo = (nome, etichetta) =>
    `<label>${etichetta} <input name="${nome}" type="number" inputmode="decimal" step="any" value="${m[nome] ?? ''}"></label>`;
  app.innerHTML = `<h1>Misura</h1>
    <label>Data <input name="data" type="date" value="${data}"></label>
    ${campo('peso', 'Peso (kg)')}${campo('grasso', 'Grasso (%)')}${campo('vita', 'Vita (cm)')}
    <button class="primario" data-azione="salva-misura">Salva</button>
    ${m.data ? '<button data-azione="togli-misura">Togli misura</button>' : ''}
    <button data-azione="home">Torna alla home</button>`;
}

async function togliMisura() {
  const data = app.querySelector('[name=data]').value;
  if (!confirm(`Togliere la misura del ${formatoData(data)}?`)) return;
  if (await salva(() => dati.eliminaMisura(data))) { stato.misure = stato.misure.filter(x => x.data !== data); home(); }
}

async function salvaMisura() {
  const valore = n => app.querySelector(`[name=${n}]`).value;
  const numero = n => (valore(n) === '' ? null : Number(valore(n)));
  const m = { data: valore('data'), peso: numero('peso'), grasso: numero('grasso'), vita: numero('vita') };
  const misurati = [m.peso, m.grasso, m.vita].filter(v => v != null);
  if (!m.data || !misurati.length || misurati.some(v => !(v > 0))) {
    mostraErrore('Inserisci almeno un valore maggiore di zero e la data.', false);
    return;
  }
  if (await salva(() => dati.salvaMisura(m))) {
    stato.misure = stato.misure.filter(x => x.data !== m.data).concat(m);
    home();
  }
}

// --- scheda e dati ---

function mostraScheda() {
  bozza = structuredClone(stato.scheda);
  disegnaScheda();
}

function disegnaScheda() {
  const ultima = stato.impostazioni.ultimaEsportazione;
  const numero = (nome, valore, etichetta, passo = '1') =>
    `<label>${etichetta} <input name="${nome}" type="number" step="${passo}" value="${valore}"></label>`;
  app.innerHTML = `<h1>Scheda e dati</h1>
    ${bozza.giorni.map((g, gi) => `<fieldset>
      <legend><input name="nomeGiorno" data-g="${gi}" aria-label="Nome del giorno" value="${esc(g.nome)}"></legend>
      ${g.esercizi.map((e, ei) => `<div class="esercizio" data-g="${gi}" data-i="${ei}">
        <input name="nome" aria-label="Nome" value="${esc(e.nome)}">
        ${numero('serie', e.serie, 'Serie')}${numero('rangeMin', e.rangeMin, 'Da')}${numero('rangeMax', e.rangeMax, 'a')}${numero('passo', e.passo, 'Passo kg', 'any')}
        <input name="nota" aria-label="Nota" placeholder="Regolazioni della macchina" value="${esc(e.nota)}">
        <button data-azione="su">Su</button><button data-azione="giu">Giù</button><button data-azione="togli">Togli</button>
      </div>`).join('')}
      <button data-azione="aggiungi-esercizio" data-g="${gi}">Aggiungi esercizio</button>
    </fieldset>`).join('')}
    <button data-azione="aggiungi-giorno">Aggiungi giorno</button>
    <button class="primario" data-azione="salva-scheda">Salva scheda</button>
    <h2>Dati</h2>
    <p data-test="persistenza">Memoria persistente: ${persistente ? 'sì' : 'no, avviso di esportazione a 7 giorni'}</p>
    <p data-test="ultima-esportazione">Ultima esportazione: ${ultima ? formatoData(ultima) : 'mai'}</p>
    <button data-azione="esporta">Esporta</button>
    <label class="bottone">Importa <input id="importa" type="file" accept=".md,text/markdown,text/plain" hidden></label>
    <button data-azione="home">Torna alla home</button>`;
}

function leggiBozza() {
  app.querySelectorAll('[name=nomeGiorno]').forEach(i => { bozza.giorni[i.dataset.g].nome = i.value.trim(); });
  app.querySelectorAll('.esercizio').forEach(r => {
    const v = n => r.querySelector(`[name=${n}]`).value;
    Object.assign(bozza.giorni[r.dataset.g].esercizi[r.dataset.i], {
      nome: v('nome').trim(), serie: Number(v('serie')), rangeMin: Number(v('rangeMin')),
      rangeMax: Number(v('rangeMax')), passo: Number(v('passo')), nota: v('nota').trim(),
    });
  });
}

function modificaScheda(azione, pulsante) {
  leggiBozza();
  const riga = pulsante.closest('.esercizio');
  if (riga) {
    const lista = bozza.giorni[riga.dataset.g].esercizi;
    const i = Number(riga.dataset.i);
    if (azione === 'togli') lista.splice(i, 1);
    if (azione === 'su' && i > 0) [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]];
    if (azione === 'giu' && i < lista.length - 1) [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]];
  }
  if (azione === 'aggiungi-esercizio') {
    bozza.giorni[pulsante.dataset.g].esercizi.push({ id: crypto.randomUUID(), nome: 'Nuovo esercizio', serie: 4, rangeMin: 8, rangeMax: 12, passo: 2.5, nota: '' });
  }
  if (azione === 'aggiungi-giorno') {
    const id = String.fromCharCode(65 + bozza.giorni.length);
    bozza.giorni.push({ id, nome: `Giorno ${id}`, esercizi: [] });
  }
  disegnaScheda();
}

async function salvaScheda() {
  leggiBozza();
  const errato = bozza.giorni.flatMap(g => g.esercizi).find(e => !e.nome || !(Number.isInteger(e.serie) && e.serie >= 1)
    || !(e.rangeMin >= 1 && e.rangeMax >= e.rangeMin) || !(e.passo > 0));
  if (errato) {
    mostraErrore(`Controlla l'esercizio «${errato.nome || 'senza nome'}»: almeno una serie, range con il minimo non superiore al massimo, passo maggiore di zero.`, false);
    return;
  }
  if (await salva(() => dati.salvaScheda(bozza))) { stato.scheda = structuredClone(bozza); home(); }
}

// --- esportazione e importazione ---

function scarica(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000); // revocato subito, il download può non partire
}

async function esporta() {
  const al = oggi();
  try {
    const testo = await creaEsportazione(stato, stato.impostazioni.ultimaEsportazione || null, al);
    // Chrome per Android condivide text/plain, non text/markdown.
    const file = new File([testo], nomeFile(al), { type: 'text/plain' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: file.name });
    else scarica(file);
  } catch (e) {
    if (e.name !== 'AbortError') mostraErrore(`Esportazione non riuscita: ${e.message}`, false);
    return;
  }
  stato.impostazioni = { ...stato.impostazioni, ultimaEsportazione: al };
  if (await salva(() => dati.salvaImpostazioni(stato.impostazioni))) { promemoria = true; home(); }
}

async function importa(file) {
  const r = await leggiEsportazione(await file.text());
  if (!r.ok) { mostraErrore(r.errore, false); return; }
  const ultimaLocale = stato.sedute.reduce((m, s) => (s.data > m ? s.data : m), '');
  let messaggio = `Il file contiene ${r.riepilogo.sedute} sedute e ${r.riepilogo.misure} misure`
    + `${r.riepilogo.ultimaSeduta ? `, ultima seduta ${formatoData(r.riepilogo.ultimaSeduta)}` : ''}.\nI dati sul telefono saranno sostituiti.`;
  if (ultimaLocale && (!r.riepilogo.ultimaSeduta || ultimaLocale > r.riepilogo.ultimaSeduta)) {
    messaggio += `\n\nATTENZIONE: sul telefono ci sono sedute più recenti (fino al ${formatoData(ultimaLocale)}) che andranno perse.`;
  }
  if (!confirm(messaggio)) return;
  // I dati appena importati sono tutti in un file: per l'avviso contano come esportati oggi.
  const nuovo = { ...r.stato, impostazioni: { ...r.stato.impostazioni, ultimaEsportazione: oggi() } };
  if (await salva(() => dati.sostituisciTutto(nuovo))) { stato = nuovo; home(); }
}

// --- eventi e avvio ---

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-azione]');
  if (!b) return;
  const a = b.dataset.azione;
  if (a === 'home') { nascondiErrore(); home(); }
  else if (a === 'inizia') inizia(document.getElementById('giorno').value);
  else if (a === 'riprendi') mostraSeduta(stato.sedute.find(s => !s.chiusa).id);
  else if (a === 'misura') mostraMisura();
  else if (a === 'salva-misura') salvaMisura();
  else if (a === 'togli-misura') togliMisura();
  else if (a === 'togli-serie') togliSerie(b);
  else if (a === 'scheda') mostraScheda();
  else if (a === 'salva-scheda') salvaScheda();
  else if (['su', 'giu', 'togli', 'aggiungi-esercizio', 'aggiungi-giorno'].includes(a)) modificaScheda(a, b);
  else if (a === 'esporta') esporta();
  else if (a === 'meno' || a === 'piu') cambia(b, a === 'piu' ? 1 : -1);
  else if (a === 'fatto') fatto(b);
  else if (a === 'fine') fine(b.dataset.seduta);
});

document.addEventListener('change', ev => {
  if (ev.target.name === 'data' && ev.target.type === 'date' && ev.target.value) mostraMisura(ev.target.value);
  if (ev.target.id === 'importa' && ev.target.files[0]) importa(ev.target.files[0]);
});

async function avvio() {
  stato = await dati.leggiTutto();
  persistente = await dati.chiediPersistenza();
  await chiudiSeduteVecchie();
  home();
}

avvio().catch(e => mostraErrore(`Avvio non riuscito: ${e?.message || e}`, false));

// --- installazione e aggiornamenti ---

let aggiornamentoChiesto = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nuovo = reg.installing;
      nuovo.addEventListener('statechange', () => {
        if (nuovo.state !== 'installed' || !navigator.serviceWorker.controller) return;
        const box = document.getElementById('aggiorna');
        box.innerHTML = 'Nuova versione disponibile. <button id="pulsante-aggiorna">Aggiorna</button>';
        box.hidden = false;
        document.getElementById('pulsante-aggiorna').onclick = () => { aggiornamentoChiesto = true; nuovo.postMessage('aggiorna'); };
      });
    });
  });
  // Si ricarica solo su richiesta: al primo avvio clients.claim cambia il controller senza che serva.
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (aggiornamentoChiesto) location.reload(); });
}
