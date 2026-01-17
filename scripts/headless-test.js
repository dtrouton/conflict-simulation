#!/usr/bin/env node
/**
 * Headless test script for conflict simulation
 * Run with: node scripts/headless-test.js
 */

const Country = require('../js/country.js');
const CountrySelector = require('../js/country-selector.js');
const Conflict = require('../js/conflict.js');
const SimulationEngine = require('../js/simulation.js');

// Test countries with proper values
const testCountries = [
  new Country({
    name: 'United States',
    code: 'US',
    military: { expenditure: 778000000000, personnel: 1400000, nuclear: true },
    economy: { gdp: 21430000000000, gdpPerCapita: 65000 },
    geography: { coordinates: [39.8283, -98.5795], capital: [38.9072, -77.0369], area: 9833517, borders: ['CA', 'MX'], population: 331000000 },
    alliances: ['NATO'],
    resources: ['oil', 'coal', 'natural_gas']
  }),
  new Country({
    name: 'China',
    code: 'CN',
    military: { expenditure: 261000000000, personnel: 2035000, nuclear: true },
    economy: { gdp: 14342000000000, gdpPerCapita: 10500 },
    geography: { coordinates: [35.8617, 104.1954], capital: [39.9042, 116.4074], area: 9596961, borders: ['RU', 'IN', 'KP'], population: 1439000000 },
    alliances: ['SCO'],
    resources: ['coal', 'rare_earth', 'iron']
  }),
  new Country({
    name: 'Russia',
    code: 'RU',
    military: { expenditure: 65100000000, personnel: 1014000, nuclear: true },
    economy: { gdp: 1483000000000, gdpPerCapita: 10200 },
    geography: { coordinates: [61.5240, 105.3188], capital: [55.7558, 37.6176], area: 17098242, borders: ['CN', 'KP', 'FI'], population: 146000000 },
    alliances: ['CSTO'],
    resources: ['oil', 'natural_gas', 'minerals']
  }),
  new Country({
    name: 'India',
    code: 'IN',
    military: { expenditure: 72900000000, personnel: 1455550, nuclear: true },
    economy: { gdp: 2875000000000, gdpPerCapita: 2100 },
    geography: { coordinates: [20.5937, 78.9629], capital: [28.6139, 77.2090], area: 3287263, borders: ['CN', 'PK', 'BD'], population: 1380000000 },
    alliances: ['QUAD'],
    resources: ['coal', 'iron', 'manganese']
  }),
  new Country({
    name: 'United Kingdom',
    code: 'GB',
    military: { expenditure: 59200000000, personnel: 153290, nuclear: true },
    economy: { gdp: 2829000000000, gdpPerCapita: 42330 },
    geography: { coordinates: [55.3781, -3.4360], capital: [51.5074, -0.1278], area: 243610, borders: ['IE'], population: 67000000 },
    alliances: ['NATO'],
    resources: ['oil', 'natural_gas', 'coal']
  })
];

console.log('=== HEADLESS CONFLICT SIMULATION TEST ===\n');

// 1. Test military strength calculations
console.log('--- Military Strength Rankings ---');
const strengths = testCountries.map(c => ({
  name: c.name,
  military: c.getMilitaryStrength(),
  economic: c.getEconomicPower()
})).sort((a, b) => b.military - a.military);

strengths.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name}: Military=${s.military.toFixed(0)}, Economic=${s.economic.toFixed(0)}`);
});

// 2. Test a specific matchup
console.log('\n--- USA vs UK Direct Matchup Test ---');
const usa = testCountries.find(c => c.code === 'US');
const uk = testCountries.find(c => c.code === 'GB');

const testConflict = new Conflict(usa, uk);
console.log(`USA Military: ${usa.getMilitaryStrength().toFixed(0)}`);
console.log(`UK Military: ${uk.getMilitaryStrength().toFixed(0)}`);

// Run 100 battle calculations to see probability distribution
let usaWins = 0;
for (let i = 0; i < 100; i++) {
  const prob = testConflict.calculateBattleOutcome();
  if (Math.random() < prob) usaWins++;
}
console.log(`USA win rate over 100 battles: ${usaWins}%`);

// 3. Run full simulation test
console.log('\n--- Full Simulation Test (10 conflicts) ---');
const results = [];

for (let i = 0; i < 10; i++) {
  const engine = new SimulationEngine(testCountries);
  engine.start();

  const conflict = engine.currentConflict;
  const [countryA, countryB] = conflict.countries;

  // Calculate expected win probability
  const milA = countryA.getMilitaryStrength();
  const milB = countryB.getMilitaryStrength();
  const expectedProb = milA / (milA + milB);

  // Run until victory
  let updates = 0;
  let maxTerritory = 50;
  let victory = { hasWinner: false };

  while (!victory.hasWinner && updates < 200) {
    // Check if conflict still exists (might have been ended by engine)
    if (!engine.currentConflict) {
      break;
    }
    engine.processUpdate();
    updates++;
    if (engine.currentConflict) {
      maxTerritory = Math.max(maxTerritory, conflict.territoryControl[0], conflict.territoryControl[1]);
      victory = conflict.checkVictoryConditions();
    }
  }

  // If conflict was ended by engine, check the conflict's final state
  if (!victory.hasWinner && conflict.status === 'ended') {
    victory = {
      hasWinner: true,
      winner: conflict.winner,
      condition: conflict.victoryCondition || 'unknown'
    };
  }
  const winner = victory.hasWinner ? conflict.countries[victory.winner].name : 'None';
  const finalTerritory = conflict.territoryControl;

  results.push({
    matchup: `${countryA.name} vs ${countryB.name}`,
    winner,
    condition: victory.condition || 'timeout',
    updates,
    expectedProb: (expectedProb * 100).toFixed(0) + '%',
    finalTerritory: `${finalTerritory[0].toFixed(0)}-${finalTerritory[1].toFixed(0)}`,
    maxTerritory: maxTerritory.toFixed(0)
  });

  engine.stop();
}

results.forEach((r, i) => {
  console.log(`${i + 1}. ${r.matchup} (A expected: ${r.expectedProb})`);
  console.log(`   -> ${r.winner} wins (${r.condition}, ${r.updates} updates, final: ${r.finalTerritory}, max: ${r.maxTerritory}%)`);
});

// 4. Tally results
console.log('\n--- Win Statistics ---');
const winCounts = {};
results.forEach(r => {
  winCounts[r.winner] = (winCounts[r.winner] || 0) + 1;
});
Object.entries(winCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([name, wins]) => {
    console.log(`${name}: ${wins} wins`);
  });

console.log('\n=== TEST COMPLETE ===');
