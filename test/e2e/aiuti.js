import { creaEsportazione } from '../../docs/esporta.js';
import { statoDiProva } from '../fixture.js';

// condivisione: 'assente' (si scarica il file), 'ok' (condivisione riuscita), 'annullata' (menu chiuso)
export async function apri(page, { data = '2026-12-01T10:00:00', persistente = true, condivisione = 'assente' } = {}) {
  await page.clock.setFixedTime(new Date(data));
  await page.addInitScript(([p, modo]) => {
    Object.defineProperty(navigator, 'storage', { value: { persist: async () => p, persisted: async () => p }, configurable: true });
    const share = modo === 'ok' ? async () => {} : modo === 'annullata' ? async () => { throw new DOMException('annullata', 'AbortError'); } : undefined;
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: share ? () => true : undefined, configurable: true });
  }, [persistente, condivisione]);
  await page.goto('/');
}

export async function testoDiProva(trasforma = t => t) {
  return trasforma(await creaEsportazione(statoDiProva(), null, '2026-11-28'));
}

export async function importa(page, testo, accetta = true) {
  const messaggi = [];
  page.once('dialog', d => { messaggi.push(d.message()); accetta ? d.accept() : d.dismiss(); });
  await page.getByRole('button', { name: 'Scheda e dati' }).click();
  await page.setInputFiles('#importa', { name: 'prova.md', mimeType: 'text/plain', buffer: Buffer.from(testo) });
  return messaggi;
}

export async function importaProva(page) {
  await importa(page, await testoDiProva());
  await page.getByRole('button', { name: 'Inizia seduta' }).waitFor();
}

export async function cambiaGiorno(page, data) {
  await page.clock.setFixedTime(new Date(data));
  await page.reload();
}
