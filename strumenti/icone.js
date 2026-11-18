// Genera le icone PNG richieste da Chrome per l'installazione, a partire da docs/icona.svg.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync('docs/icona.svg', 'utf8');
const browser = await chromium.launch();
for (const lato of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: lato, height: lato } });
  await page.setContent(`<style>body{margin:0}svg{width:${lato}px;height:${lato}px;display:block}</style>${svg}`);
  await page.screenshot({ path: `docs/icona-${lato}.png` });
}
await browser.close();
