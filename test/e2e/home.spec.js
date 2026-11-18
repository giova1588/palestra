import { test, expect } from '@playwright/test';
import { apri, importaProva } from './aiuti.js';

test('senza dati invita a importare la scheda', async ({ page }) => {
  await apri(page);
  await expect(page.getByText('Nessuna scheda')).toBeVisible();
});

test('importa il file di prova: grafico e giorno proposto', async ({ page }) => {
  await apri(page);
  await importaProva(page);
  await expect(page.locator('svg circle.pesata')).toHaveCount(3);
  await expect(page.locator('#giorno')).toHaveValue('A');
});

test('salva una misura', async ({ page }) => {
  await apri(page);
  await importaProva(page);
  await page.getByRole('button', { name: 'Misura' }).click();
  await page.getByLabel('Peso (kg)').fill('80.6');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(page.locator('svg circle.pesata')).toHaveCount(4);
});

test('una misura vuota è rifiutata', async ({ page }) => {
  await apri(page);
  await page.getByRole('button', { name: 'Misura' }).click();
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(page.locator('#errore')).toContainText('Inserisci almeno');
});

test('modifica della scheda salvata e ritrovata dopo il ricaricamento', async ({ page }) => {
  await apri(page);
  await importaProva(page);
  await page.getByRole('button', { name: 'Scheda e dati' }).click();
  await page.getByRole('button', { name: 'Aggiungi esercizio' }).first().click();
  await page.locator('fieldset').first().locator('.esercizio').last().getByLabel('Nome').fill('Hip thrust');
  await page.getByRole('button', { name: 'Salva scheda' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Inizia seduta' }).click();
  await expect(page.locator('details')).toHaveCount(3);
  await expect(page.locator('details').last()).toContainText('Hip thrust');
});

test('una scheda con range invertito è rifiutata', async ({ page }) => {
  await apri(page);
  await importaProva(page);
  await page.getByRole('button', { name: 'Scheda e dati' }).click();
  const riga = page.locator('.esercizio').first();
  await riga.locator('[name=rangeMin]').fill('12');
  await riga.locator('[name=rangeMax]').fill('8');
  await page.getByRole('button', { name: 'Salva scheda' }).click();
  await expect(page.locator('#errore')).toContainText("Controlla l'esercizio");
});

test('mostra se la memoria non è persistente', async ({ page }) => {
  await apri(page, { persistente: false });
  await page.getByRole('button', { name: 'Scheda e dati' }).click();
  await expect(page.locator('[data-test=persistenza]')).toContainText('no');
});
