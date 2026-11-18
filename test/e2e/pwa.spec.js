import { test, expect } from '@playwright/test';
import { apri, importaProva } from './aiuti.js';

test.describe('installazione', () => {
  test.use({ serviceWorkers: 'allow' });

  test('il service worker si attiva e l\'app si apre senza rete', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveTitle('Registro palestra');
    await expect(page.getByText('Nessuna scheda')).toBeVisible();
  });

  test('manifest e icone raggiungibili', async ({ request }) => {
    const manifest = await (await request.get('manifest.json')).json();
    expect(manifest.name).toBe('Registro palestra');
    for (const icona of manifest.icons) expect((await request.get(icona.src)).ok()).toBe(true);
  });
});

test('nessuna chiamata di rete fuori dall\'indirizzo dell\'app', async ({ page, baseURL }) => {
  const esterne = [];
  page.on('request', r => {
    const u = r.url();
    if (!u.startsWith(baseURL) && !u.startsWith('data:') && !u.startsWith('blob:')) esterne.push(u);
  });
  await apri(page);
  await importaProva(page);
  await page.getByRole('button', { name: 'Inizia seduta' }).click();
  const lat = page.locator('details[data-esercizio="lat"]');
  await lat.locator('summary').click();
  await lat.getByRole('button', { name: 'Fatto' }).click();
  await page.getByRole('button', { name: 'Fine seduta' }).click();
  await page.getByRole('button', { name: 'Misura' }).click();
  await page.getByLabel('Peso (kg)').fill('80.2');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByRole('button', { name: 'Scheda e dati' }).click();
  const scaricamento = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta' }).click();
  await scaricamento;
  expect(esterne).toEqual([]);
});
