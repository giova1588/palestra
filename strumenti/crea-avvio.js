// Il JSON con i dati veri sta fuori dal repository (nel vault): qui entra solo il percorso.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { creaEsportazione, leggiEsportazione } from '../docs/esporta.js';
import { oggi, formatoData } from '../docs/util.js';

const [percorsoStato, cartella] = process.argv.slice(2);
if (!percorsoStato || !cartella) {
  console.error('Uso: node strumenti/crea-avvio.js <stato.json> <cartella di uscita>');
  process.exit(1);
}
const al = oggi();
const testo = await creaEsportazione(JSON.parse(readFileSync(percorsoStato, 'utf8')), null, al);
const verifica = await leggiEsportazione(testo);
if (!verifica.ok) { console.error(verifica.errore); process.exit(1); }
const percorso = join(cartella, `palestra-avvio-${formatoData(al)}.md`);
writeFileSync(percorso, testo);
console.log(`Scritto ${percorso}: ${verifica.riepilogo.sedute} sedute, ${verifica.riepilogo.misure} misure.`);
