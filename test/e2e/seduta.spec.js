import { test, expect } from '@playwright/test';
import { apri, importaProva, cambiaGiorno } from './aiuti.js';

async function iniziaA(page) {
  await apri(page);
  await importaProva(page);
  await page.getByRole('button', { name: 'Inizia seduta' }).click();
}

test('valori precompilati, barra del range e avviso di aumento', async ({ page }) => {
  await iniziaA(page);
  const chest = page.locator('details[data-esercizio="chest"]');
  await chest.locator('summary').click();
  await expect(chest.locator('[data-test=aumento]')).toContainText("+2,5 kg: tutte le serie a 12 l'ultima volta");
  await expect(chest.locator('[name=kg]')).toHaveValue('52.5');
  await expect(chest.locator('[name=reps]')).toHaveValue('8');
  await expect(chest.locator('.nota')).toHaveText('sella 3');
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await expect(lat.locator('.prec')).toHaveText('Volta scorsa: 45 kg: 10 · 9 · 9 · 8');
  await expect(lat.locator('[data-test=aumento]')).toHaveCount(0);
  await expect(lat.locator('[name=kg]')).toHaveValue('45');
  await expect(lat.locator('[name=reps]')).toHaveValue('10');
  await expect(lat.locator('.pista i')).toHaveCount(4);
});

test('una serie confermata si salva e la seduta riprende dopo il ricaricamento', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  await expect(lat.locator('.conta')).toHaveText('1/4');
  await expect(lat.locator('[name=reps]')).toHaveValue('9');
  await page.reload();
  await page.getByRole('button', { name: 'Riprendi seduta A' }).click();
  await expect(page.locator('details[data-esercizio="lat"] .conta')).toHaveText('1/4');
});

test('Fatte tutte registra in un tocco le serie rimaste con gli stessi valori', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  await expect(lat.locator('.conta')).toHaveText('1/4');
  await lat.locator('[name=kg]').fill('47.5');
  await lat.locator('[name=reps]').fill('10');
  await lat.getByRole('button', { name: 'Fatte tutte (3)' }).click();
  await expect(lat.locator('.conta')).toHaveText('4/4');
  await expect(lat.locator('.fatte li')).toHaveText([/^45 kg × 10/, /^47,5 kg × 10/, /^47,5 kg × 10/, /^47,5 kg × 10/]);
  await expect(lat.getByRole('button', { name: /Fatte tutte/ })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Riprendi seduta A' }).click();
  await expect(page.locator('details[data-esercizio="lat"] .conta')).toHaveText('4/4');
});

test('i pulsanti + e − usano il passo dell\'esercizio', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.locator('[data-campo=kg][data-azione=piu]').click();
  await expect(lat.locator('[name=kg]')).toHaveValue('47.5');
  await lat.locator('[data-campo=reps][data-azione=meno]').click();
  await expect(lat.locator('[name=reps]')).toHaveValue('9');
});

test('una seduta aperta si chiude da sola il giorno dopo', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  await cambiaGiorno(page, '2026-12-02T10:00:00');
  await expect(page.getByRole('button', { name: 'Inizia seduta' })).toBeVisible();
  await expect(page.locator('#giorno')).toHaveValue('B');
});

test('Fine seduta chiude e propone il giorno successivo', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  await page.getByRole('button', { name: 'Fine seduta' }).click();
  await expect(page.locator('#giorno')).toHaveValue('B');
});

test('un errore di scrittura lascia la serie non confermata e lo dice', async ({ page }) => {
  await iniziaA(page);
  await page.evaluate(() => { IDBObjectStore.prototype.put = function () { throw new Error('disco pieno'); }; });
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  await expect(page.locator('#errore')).toContainText('Salvataggio non riuscito');
  await expect(page.locator('#errore').getByRole('button', { name: 'Esporta ora' })).toBeVisible();
  await expect(lat.locator('.conta')).toHaveText('0/4');
  await expect(lat.locator('[name=kg]')).toHaveValue('45');
});

test('un doppio tocco su Fatto registra una sola serie', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).dblclick();
  await expect(lat.locator('.conta')).toHaveText('1/4');
  await page.reload();
  await page.getByRole('button', { name: 'Riprendi seduta A' }).click();
  await expect(page.locator('details[data-esercizio="lat"] .conta')).toHaveText('1/4');
});

test('Togli serie: rinumera le successive e precompila la riga con la serie tolta', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  // dopo ogni Fatto la schermata si ridisegna: si aspetta il conteggio prima di toccare la riga nuova
  for (const [i, rir] of ['', '2', ''].entries()) {
    if (rir) await lat.locator('[name=rir]').selectOption(rir);
    await lat.getByRole('button', { name: 'Fatto' }).click();
    await expect(lat.locator('.conta')).toHaveText(`${i + 1}/4`);
  }
  await expect(lat.locator('.conta')).toHaveText('3/4');
  const messaggi = [];
  page.once('dialog', d => { messaggi.push(d.message()); d.accept(); });
  await lat.getByRole('button', { name: 'Togli serie 2' }).click();
  await expect(lat.locator('.conta')).toHaveText('2/4');
  expect(messaggi).toEqual(['Togliere la serie 2: 45 kg × 9?']);
  await expect(lat.locator('.serie > span')).toHaveText('Serie 3');
  await expect(lat.locator('[name=kg]')).toHaveValue('45');
  await expect(lat.locator('[name=reps]')).toHaveValue('9');
  await expect(lat.locator('[name=rir]')).toHaveValue('2');
  await page.reload();
  await page.getByRole('button', { name: 'Riprendi seduta A' }).click();
  const n = await page.evaluate(async () => (await (await import('/dati.js')).leggiTutto()).sedute.find(s => !s.chiusa).serie.map(x => x.n));
  expect(n).toEqual([1, 2]);
});

test('Togli serie rifiutato dalla conferma non cambia nulla', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  page.once('dialog', d => d.dismiss());
  await lat.getByRole('button', { name: 'Togli serie 1' }).click();
  await expect(lat.locator('.conta')).toHaveText('1/4');
});

test('Togli serie con salvataggio fallito ripristina lo stato e lo dice', async ({ page }) => {
  await iniziaA(page);
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  await page.evaluate(() => { IDBObjectStore.prototype.put = function () { throw new Error('disco pieno'); }; });
  page.once('dialog', d => d.accept());
  await lat.getByRole('button', { name: 'Togli serie 1' }).click();
  await expect(page.locator('#errore')).toContainText('Salvataggio non riuscito');
  await expect(lat.locator('.conta')).toHaveText('1/4');
});

test('Fine seduta senza serie elimina la seduta', async ({ page }) => {
  await iniziaA(page);
  await page.getByRole('button', { name: 'Fine seduta' }).click();
  await expect(page.locator('#giorno')).toHaveValue('A');
  await page.reload();
  await expect(page.locator('#giorno')).toHaveValue('A');
  const n = await page.evaluate(async () => (await (await import('/dati.js')).leggiTutto()).sedute.length);
  expect(n).toBe(2);
});
