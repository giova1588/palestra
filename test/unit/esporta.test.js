import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaEsportazione, leggiEsportazione, nomeFile, impronta, FORMATO } from '../../docs/esporta.js';
import { statoDiProva } from '../fixture.js';

test('nome del file', () => {
  assert.equal(nomeFile('2026-12-01'), 'palestra-export-01-12-2026.md');
});
test('andata e ritorno restituisce lo stato identico', async () => {
  const stato = statoDiProva();
  const r = await leggiEsportazione(await creaEsportazione(stato, null, '2026-12-01'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.stato, stato);
  assert.deepEqual(r.riepilogo, { sedute: 2, misure: 3, ultimaSeduta: '2026-11-27' });
});
test('le tabelle coprono solo il periodo dall\'ultima esportazione', async () => {
  const testo = await creaEsportazione(statoDiProva(), '2026-11-25', '2026-12-01');
  assert.match(testo, /### 27-11-2026, giorno B/);
  assert.doesNotMatch(testo, /### 24-11-2026/);
  assert.match(testo, /\| 26-11-2026 \| 80,4 \|  \| 90 \|/);
});
test('carichi correnti con aumento in attesa', async () => {
  const testo = await creaEsportazione(statoDiProva(), null, '2026-12-01');
  assert.match(testo, /\| A \| Chest press \| 50 kg: 12 · 12 · 12 · 12 \| sì, \+2,5 kg \|/);
  assert.match(testo, /\| A \| Lat machine \| 45 kg: 10 · 9 · 9 · 8 \| no \|/);
});
test('un file modificato è rifiutato', async () => {
  const testo = (await creaEsportazione(statoDiProva(), null, '2026-12-01')).replace('"reps":12', '"reps":13');
  const r = await leggiEsportazione(testo);
  assert.equal(r.ok, false);
  assert.match(r.errore, /codice di controllo/);
});
test('un file di una versione più recente è rifiutato', async () => {
  const testo = (await creaEsportazione(statoDiProva(), null, '2026-12-01')).replace(`"formato":${FORMATO}`, `"formato":${FORMATO + 1}`);
  const r = await leggiEsportazione(testo);
  assert.equal(r.ok, false);
  assert.match(r.errore, /più recente/);
});
test('un file senza blocco di ripristino è rifiutato', async () => {
  assert.equal((await leggiEsportazione('# niente')).ok, false);
});
test('uno stato con forma sbagliata è rifiutato anche con codice giusto', async () => {
  const stato = { sedute: 'no' };
  const corpo = JSON.stringify({ formato: FORMATO, impronta: await impronta(JSON.stringify(stato)), stato });
  const r = await leggiEsportazione('```json palestra-ripristino\n' + corpo + '\n```\n');
  assert.equal(r.ok, false);
  assert.match(r.errore, /non è valido/);
});
