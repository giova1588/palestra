import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ultimeSerie, aumentoDovuto, valoriProposti, posizioniRange, prestazione } from '../../docs/progressione.js';

const es = { id: 'chest', nome: 'Chest press', serie: 4, rangeMin: 8, rangeMax: 12, passo: 2.5, nota: '' };
const s = (n, kg, reps) => ({ esercizioId: 'chest', nome: 'Chest press', rangeMin: 8, rangeMax: 12, n, kg, reps, rir: null });

test('aumento quando tutte le serie previste sono al massimo', () => {
  assert.equal(aumentoDovuto([s(1, 50, 12), s(2, 50, 12), s(3, 50, 12), s(4, 50, 12)], es), true);
});
test('nessun aumento se una serie è sotto il massimo', () => {
  assert.equal(aumentoDovuto([s(1, 50, 12), s(2, 50, 12), s(3, 50, 12), s(4, 50, 11)], es), false);
});
test('nessun aumento con meno serie delle previste', () => {
  assert.equal(aumentoDovuto([s(1, 50, 12), s(2, 50, 12), s(3, 50, 12)], es), false);
});
test('le serie oltre le previste non contano', () => {
  assert.equal(aumentoDovuto([s(1, 50, 12), s(2, 50, 12), s(3, 50, 12), s(4, 50, 12), s(5, 50, 9)], es), true);
  assert.equal(aumentoDovuto([s(1, 50, 12), s(2, 50, 12), s(3, 50, 12), s(4, 50, 11), s(5, 50, 12)], es), false);
});
test('nessun aumento con carichi diversi fra le serie', () => {
  assert.equal(aumentoDovuto([s(1, 50, 12), s(2, 50, 12), s(3, 47.5, 12), s(4, 50, 12)], es), false);
});
test('nessun aumento senza precedenti', () => {
  assert.equal(aumentoDovuto(null, es), false);
});
test('senza aumento si ripete la volta scorsa', () => {
  assert.deepEqual(valoriProposti([s(1, 50, 12), s(2, 50, 11), s(3, 50, 10), s(4, 50, 9)], es),
    [{ kg: 50, reps: 12 }, { kg: 50, reps: 11 }, { kg: 50, reps: 10 }, { kg: 50, reps: 9 }]);
});
test('con aumento: nuovo carico e minimo del range', () => {
  assert.deepEqual(valoriProposti([s(1, 50, 12), s(2, 50, 12), s(3, 50, 12), s(4, 50, 12)], es),
    Array(4).fill({ kg: 52.5, reps: 8 }));
});
test('con meno serie della volta scorsa si ripete l\'ultima', () => {
  assert.deepEqual(valoriProposti([s(1, 50, 10), s(2, 50, 9), s(3, 50, 8)], es)[3], { kg: 50, reps: 8 });
});
test('senza precedenti i valori sono vuoti', () => {
  assert.deepEqual(valoriProposti(null, es), Array(4).fill({ kg: null, reps: null }));
});
test('ultimeSerie prende la seduta più recente con l\'esercizio ed esclude quella in corso', () => {
  const sedute = [
    { id: 'a', data: '2026-11-10', giorno: 'A', chiusa: true, serie: [s(2, 50, 10), s(1, 50, 11)] },
    { id: 'b', data: '2026-11-13', giorno: 'B', chiusa: true, serie: [{ ...s(1, 100, 10), esercizioId: 'legpress' }] },
    { id: 'c', data: '2026-11-17', giorno: 'A', chiusa: false, serie: [s(1, 52.5, 8)] },
  ];
  assert.deepEqual(ultimeSerie(sedute, 'chest', 'c'), [s(1, 50, 11), s(2, 50, 10)]);
  assert.deepEqual(ultimeSerie(sedute, 'chest'), [s(1, 52.5, 8)]);
  assert.equal(ultimeSerie(sedute, 'lat'), null);
});
test('posizioni nel range, limitate fra 0 e 1', () => {
  assert.deepEqual(posizioniRange([s(1, 50, 8), s(2, 50, 10), s(3, 50, 12), s(4, 50, 14)], es), [0, 0.5, 1, 1]);
  assert.deepEqual(posizioniRange(null, es), []);
});
test('prestazione leggibile', () => {
  assert.equal(prestazione([s(1, 50, 12), s(2, 50, 11)]), '50 kg: 12 · 11');
  assert.equal(prestazione([s(1, 50, 12), s(2, 47.5, 10)]), '50×12 · 47,5×10');
  assert.equal(prestazione(null), 'prima volta');
});
