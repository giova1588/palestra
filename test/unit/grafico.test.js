import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaMobile, grafico } from '../../docs/grafico.js';

const misure = [
  { data: '2026-11-24', peso: 80, grasso: null, vita: 90 },
  { data: '2026-11-26', peso: 80.4, grasso: null, vita: null },
  { data: '2026-11-28', peso: 79.8, grasso: null, vita: 89 },
  { data: '2026-12-05', peso: 81, grasso: null, vita: null },
];

test('media mobile sugli ultimi 7 giorni', () => {
  const m = mediaMobile(misure).map(x => Math.round(x.valore * 100) / 100);
  assert.deepEqual(m, [80, 80.2, 80.07, 81]);
});
test('misure senza peso escluse dalla media', () => {
  assert.equal(mediaMobile([{ data: '2026-11-24', peso: null, grasso: null, vita: 90 }]).length, 0);
});
test('grafico con pesate, media e vita', () => {
  const svg = grafico(misure);
  assert.equal(svg.match(/<circle class="pesata"/g).length, 4);
  assert.match(svg, /<polyline class="media"/);
  assert.match(svg, /<polyline class="vita"/);
});
test('con meno di due pesate nessun grafico', () => {
  assert.match(grafico(misure.slice(0, 1)), /Servono almeno due pesate/);
});
