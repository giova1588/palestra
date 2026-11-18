# Registro palestra

Web app da installare sul telefono per registrare le serie in palestra, le pesate e la circonferenza vita. I dati restano sul telefono e si esportano ogni 2 settimane in un file markdown. Non c'è nessun server e l'app non fa chiamate di rete.

## Installazione sul telefono (Android, Chrome)

1. Apri in Chrome https://giova1588.github.io/palestra/ con la rete attiva: la prima apertura la richiede, dopo l'installazione l'app funziona anche senza.
2. Menu ⋮ → **Installa app** (o **Aggiungi a schermata Home**).
3. Da qui in poi apri l'app dall'icona, non dal browser: l'app installata è il modo in cui Chrome concede più facilmente la memoria persistente, e la riga **Memoria persistente** (vedi sotto) dice se è stata concessa.

## Aggiornamenti

Quando compare **Nuova versione**, toccalo: l'app si ricarica e i dati restano.

## Primo avvio

1. Salva il file di avvio (`palestra-avvio-….md`) su Drive o sul telefono.
2. Nell'app: **Scheda e dati** → **Importa** → scegli il file. L'app mostra cosa contiene e chiede conferma.
3. Controlla la riga **Memoria persistente**: deve dire «sì». Se dice «no», l'avviso di esportazione scatta dopo 7 giorni invece che 14: esporta più spesso.

Cosa guardare: dopo l'importazione la home mostra **Inizia seduta** con il giorno proposto e il grafico del peso. Se compare un messaggio rosso, il file non è stato importato e i dati di prima sono intatti.

## In palestra

**Inizia seduta**, apri l'esercizio, controlla i valori già compilati, correggi con − e + e premi **Fatto** dopo ogni serie. Ogni serie si salva subito: se chiudi l'app, la seduta riprende da dov'eri. Quando l'app scrive «+2,5 kg: tutte le serie a 12 l'ultima volta», il carico proposto è già aumentato. Una seduta lasciata aperta si chiude da sola il giorno dopo.

Per togliere o correggere una serie: **Togli** accanto alla serie, conferma, poi la riga di inserimento si ripropone con i suoi valori; correggi con − e + e premi **Fatto**. Le serie successive si rinumerano. **Fine seduta** su una seduta senza serie la elimina.

## Misure

**Misura**: peso, % di grasso e vita, anche uno solo dei tre. La stessa data sovrascrive la misura precedente: cambiando la data i campi si ricaricano con i valori di quel giorno (vuoti se non c'è una misura). **Togli misura**, dopo conferma, la cancella.

## Esportazione ogni 2 settimane

**Scheda e dati** → **Esporta** → **Salva su Drive** → cartella `palestra-esportazioni`. Il file contiene tutto ciò che è successo dall'esportazione precedente e, in fondo, un blocco che permette di ripristinare tutti i dati. Se annulli il menu, l'esportazione non conta e l'avviso resta. Dopo l'invio controlla su Drive che il file sia comparso nella cartella: l'app non può saperlo.

## Ripristino

Telefono nuovo o dati persi: installa l'app e importa l'**ultimo** file esportato. Si perde solo ciò che è stato registrato dopo quell'esportazione.

## Per chi modifica il codice

- **Non cambiare mai l'indirizzo dell'app** (nome del repository, account, cartella pubblicata): i dati sul telefono sono legati all'indirizzo, e con un indirizzo nuovo l'app ripartirebbe vuota. Se serve davvero: prima esporta, poi importa nel nuovo indirizzo.
- A ogni pubblicazione cambia `CACHE` in `docs/sw.js` (es. `palestra-2`): è ciò che fa comparire «Nuova versione» sul telefono.
- Il service worker cancella solo le cache `palestra-*`: l'origine github.io è condivisa con altri progetti dello stesso account.
- Nessun dato personale nel repository: i test usano dati inventati in `test/fixture.js`, e il file di avvio si genera fuori di qui con `node strumenti/crea-avvio.js <stato.json> <cartella>`.
- Se cambia la forma dei dati, aumenta `FORMATO` in `docs/esporta.js` e scrivi lì la conversione dal formato precedente.

Sviluppo, con Node e Python installati:

```
npm install
npx playwright install chromium
npm test
```

`npm test` lancia i test della logica (`node --test`) e quelli dell'interfaccia su un telefono simulato (Playwright), compreso un test che fallisce se l'app tenta una chiamata di rete esterna.
