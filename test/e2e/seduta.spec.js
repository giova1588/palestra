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
