import { test, expect } from '@playwright/test';
import { statoDiProva } from '../fixture.js';

test('sostituisce, rilegge dopo un ricaricamento e aggiorna i dati', async ({ page }) => {
  await page.goto('/');
  const stato = statoDiProva();
  await page.evaluate(async s => (await import('./dati.js')).sostituisciTutto(s), stato);
  await page.reload();
  expect(await page.evaluate(async () => (await import('./dati.js')).leggiTutto())).toEqual(stato);
  const misura = { data: '2026-11-28', peso: 79.6, grasso: null, vita: 89 };
  await page.evaluate(async m => (await import('./dati.js')).salvaMisura(m), misura);
  const misure = await page.evaluate(async () => (await (await import('./dati.js')).leggiTutto()).misure);
  expect(misure).toHaveLength(3);
  expect(misure.at(-1)).toEqual(misura);
});

test('una scrittura che fallisce rifiuta la promessa', async ({ page }) => {
  await page.goto('/');
  const errore = await page.evaluate(async () => {
    IDBObjectStore.prototype.put = function () { throw new Error('disco pieno'); };
    try { await (await import('./dati.js')).salvaImpostazioni({}); return null; } catch (e) { return e.message; }
  });
  expect(errore).toBe('disco pieno');
});
