import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { leggiEsportazione } from '../../docs/esporta.js';
import { apri, importa, importaProva, testoDiProva, cambiaGiorno } from './aiuti.js';

const vaiAScheda = page => page.getByRole('button', { name: 'Scheda e dati' }).click();

test('senza condivisione il file si scarica ed è reimportabile', async ({ page }) => {
  await apri(page);
  await importaProva(page);
  await vaiAScheda(page);
  const scaricamento = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta' }).click();
  const d = await scaricamento;
  expect(d.suggestedFilename()).toBe('palestra-export-01-12-2026.md');
  const r = await leggiEsportazione(await readFile(await d.path(), 'utf8'));
  expect(r.ok).toBe(true);
  expect(r.riepilogo.sedute).toBe(2);
});

test('con la condivisione riuscita la data di esportazione si aggiorna', async ({ page }) => {
  await apri(page, { data: '2026-11-28T10:00:00', condivisione: 'ok' });
  await importaProva(page);
  await cambiaGiorno(page, '2026-12-01T10:00:00');
  await vaiAScheda(page);
  await expect(page.locator('[data-test=ultima-esportazione]')).toContainText('28-11-2026');
  await page.getByRole('button', { name: 'Esporta' }).click();
  await vaiAScheda(page);
  await expect(page.locator('[data-test=ultima-esportazione]')).toContainText('01-12-2026');
});

test('con la condivisione annullata la data resta', async ({ page }) => {
  await apri(page, { data: '2026-11-28T10:00:00', condivisione: 'annullata' });
  await importaProva(page);
  await cambiaGiorno(page, '2026-12-01T10:00:00');
  await vaiAScheda(page);
  await page.getByRole('button', { name: 'Esporta' }).click();
  await expect(page.locator('[data-test=ultima-esportazione]')).toContainText('28-11-2026');
  await expect(page.locator('#errore')).toBeHidden();
});

test('avviso di esportazione oltre 14 giorni con memoria persistente', async ({ page }) => {
  await apri(page, { data: '2026-11-28T10:00:00' });
  await importaProva(page);
  await cambiaGiorno(page, '2026-12-12T10:00:00');
  await expect(page.locator('[data-test=avviso-esporta]')).toHaveCount(0);
  await cambiaGiorno(page, '2026-12-13T10:00:00');
  await expect(page.locator('[data-test=avviso-esporta]')).toBeVisible();
});

test('avviso di esportazione oltre 7 giorni senza memoria persistente', async ({ page }) => {
  await apri(page, { data: '2026-11-28T10:00:00', persistente: false });
  await importaProva(page);
  await cambiaGiorno(page, '2026-12-05T10:00:00');
  await expect(page.locator('[data-test=avviso-esporta]')).toHaveCount(0);
  await cambiaGiorno(page, '2026-12-06T10:00:00');
  await expect(page.locator('[data-test=avviso-esporta]')).toBeVisible();
});

test('importare sopra sedute più recenti chiede conferma con avviso', async ({ page }) => {
  await apri(page);
  await importaProva(page);
  await page.getByRole('button', { name: 'Inizia seduta' }).click();
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  await page.getByRole('button', { name: 'Torna alla home' }).click();
  const messaggi = await importa(page, await testoDiProva(), false);
  await expect.poll(() => messaggi.length).toBe(1);
  expect(messaggi[0]).toContain('più recenti');
  await page.getByRole('button', { name: 'Torna alla home' }).click();
  await expect(page.getByRole('button', { name: 'Riprendi seduta A' })).toBeVisible();
});

test('un file modificato è rifiutato e i dati restano', async ({ page }) => {
  await apri(page);
  await importa(page, await testoDiProva(t => t.replace('"reps":12', '"reps":13')));
  await expect(page.locator('#errore')).toContainText('codice di controllo');
  await page.getByRole('button', { name: 'Torna alla home' }).click();
  await expect(page.getByText('Nessuna scheda')).toBeVisible();
});
