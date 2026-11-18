const NOME = 'palestra';
let promessaDb;

function apri() {
  promessaDb ??= new Promise((ok, ko) => {
    const r = indexedDB.open(NOME, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('sedute', { keyPath: 'id' });
      r.result.createObjectStore('misure', { keyPath: 'data' });
      r.result.createObjectStore('chiavi'); // scheda e impostazioni
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
  return promessaDb;
}

const esito = req => new Promise((ok, ko) => { req.onsuccess = () => ok(req.result); req.onerror = () => ko(req.error); });
const fine = t => new Promise((ok, ko) => {
  t.oncomplete = () => ok();
  t.onerror = t.onabort = () => ko(t.error || new Error('Scrittura non riuscita'));
});

export async function leggiTutto() {
  const t = (await apri()).transaction(['sedute', 'misure', 'chiavi'], 'readonly');
  const [sedute, misure, scheda, impostazioni] = await Promise.all([
    esito(t.objectStore('sedute').getAll()),
    esito(t.objectStore('misure').getAll()),
    esito(t.objectStore('chiavi').get('scheda')),
    esito(t.objectStore('chiavi').get('impostazioni')),
  ]);
  return { scheda: scheda || { giorni: [] }, sedute, misure, impostazioni: impostazioni || {} };
}

async function scrivi(negozio, valore, chiave) {
  const t = (await apri()).transaction(negozio, 'readwrite');
  const finita = fine(t);
  t.objectStore(negozio).put(valore, chiave);
  return finita;
}

async function elimina(negozio, chiave) {
  const t = (await apri()).transaction(negozio, 'readwrite');
  const finita = fine(t);
  t.objectStore(negozio).delete(chiave);
  return finita;
}

export const salvaSeduta = seduta => scrivi('sedute', seduta);
export const salvaMisura = misura => scrivi('misure', misura);
export const eliminaSeduta = id => elimina('sedute', id);
export const eliminaMisura = data => elimina('misure', data);
export const salvaScheda = scheda => scrivi('chiavi', scheda, 'scheda');
export const salvaImpostazioni = impostazioni => scrivi('chiavi', impostazioni, 'impostazioni');

export async function sostituisciTutto(stato) {
  const t = (await apri()).transaction(['sedute', 'misure', 'chiavi'], 'readwrite');
  const finita = fine(t);
  try {
    for (const n of ['sedute', 'misure', 'chiavi']) t.objectStore(n).clear();
    stato.sedute.forEach(s => t.objectStore('sedute').put(s));
    stato.misure.forEach(m => t.objectStore('misure').put(m));
    t.objectStore('chiavi').put(stato.scheda, 'scheda');
    t.objectStore('chiavi').put(stato.impostazioni, 'impostazioni');
  } catch (e) {
    // senza abort la transazione si confermerebbe con i clear già fatti
    t.abort();
    finita.catch(() => {});
    throw e;
  }
  return finita;
}

export async function chiediPersistenza() {
  if (!navigator.storage?.persist) return false;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}
