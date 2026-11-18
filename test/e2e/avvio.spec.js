import { test, expect } from '@playwright/test';

test('la pagina si apre', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Registro palestra');
});
