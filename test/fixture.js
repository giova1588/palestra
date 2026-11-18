const serie = (id, nome, min, max, valori) =>
  valori.map(([kg, reps], i) => ({ esercizioId: id, nome, rangeMin: min, rangeMax: max, n: i + 1, kg, reps, rir: null }));

export function statoDiProva() {
  return {
    scheda: { giorni: [
      { id: 'A', nome: 'Giorno A', esercizi: [
        { id: 'chest', nome: 'Chest press', serie: 4, rangeMin: 8, rangeMax: 12, passo: 2.5, nota: 'sella 3' },
        { id: 'lat', nome: 'Lat machine', serie: 4, rangeMin: 8, rangeMax: 12, passo: 2.5, nota: '' },
      ] },
      { id: 'B', nome: 'Giorno B', esercizi: [
        { id: 'legpress', nome: 'Leg press', serie: 4, rangeMin: 8, rangeMax: 12, passo: 5, nota: '' },
      ] },
    ] },
    sedute: [
      { id: 's1', data: '2026-11-24', giorno: 'A', chiusa: true, serie: [
        ...serie('chest', 'Chest press', 8, 12, [[50, 12], [50, 12], [50, 12], [50, 12]]),
        ...serie('lat', 'Lat machine', 8, 12, [[45, 10], [45, 9], [45, 9], [45, 8]]),
      ] },
      { id: 's2', data: '2026-11-27', giorno: 'B', chiusa: true,
        serie: serie('legpress', 'Leg press', 8, 12, [[100, 12], [100, 11], [100, 10], [100, 10]]) },
    ],
    misure: [
      { data: '2026-11-24', peso: 80, grasso: 18, vita: null },
      { data: '2026-11-26', peso: 80.4, grasso: null, vita: 90 },
      { data: '2026-11-28', peso: 79.8, grasso: null, vita: null },
    ],
    impostazioni: {},
  };
}
