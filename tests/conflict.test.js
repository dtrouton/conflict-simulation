const Conflict = require('../js/conflict');
const Country = require('../js/country');

describe('Conflict', () => {
  const usaData = {
    name: "United States",
    code: "US",
    military: { personnel: 1400000, expenditure: 778000000000, nuclear: true },
    economy: { gdp: 21430000000000, gdpPerCapita: 65280 },
    geography: { area: 9833517, population: 331002651, capital: [38.9072, -77.0369] },
    alliances: ["NATO", "AUKUS"],
    resources: ["oil", "coal", "agriculture"]
  };

  const chinaData = {
    name: "China",
    code: "CN",
    military: { personnel: 2035000, expenditure: 261000000000, nuclear: true },
    economy: { gdp: 14342000000000, gdpPerCapita: 10261 },
    geography: { area: 9596960, population: 1439323776, capital: [39.9042, 116.4074] },
    alliances: ["SCO"],
    resources: ["coal", "rare_earth", "agriculture"]
  };

  let usa, china, conflict;

  beforeEach(() => {
    usa = new Country(usaData);
    china = new Country(chinaData);
    conflict = new Conflict(usa, china);
  });

  describe('constructor', () => {
    test('should initialize conflict with two countries', () => {
      expect(conflict.countries).toHaveLength(2);
      expect(conflict.countries[0]).toBe(usa);
      expect(conflict.countries[1]).toBe(china);
    });

    test('should initialize with 50/50 territory control', () => {
      expect(conflict.territoryControl).toEqual([50, 50]);
    });

    test('should initialize with zero duration', () => {
      expect(conflict.duration).toBe(0);
    });

    test('should initialize with conflict start event', () => {
      expect(conflict.events).toHaveLength(1);
      expect(conflict.events[0].type).toBe('conflict_start');
      expect(conflict.events[0].description).toContain('Conflict initiated');
    });

    test('should initialize with ongoing status', () => {
      expect(conflict.status).toBe('ongoing');
      expect(conflict.winner).toBeNull();
    });

    test('should throw error with same country', () => {
      expect(() => new Conflict(usa, usa)).toThrow('Cannot create conflict between same country');
    });

    test('should throw error with invalid countries', () => {
      expect(() => new Conflict(null, china)).toThrow('Both countries must be valid Country instances');
      expect(() => new Conflict(usa, {})).toThrow('Both countries must be valid Country instances');
    });

    test('should initialize starting economic values', () => {
      expect(conflict.initialGDP).toHaveLength(2);
      expect(conflict.initialGDP[0]).toBe(usa.economy.gdp);
      expect(conflict.initialGDP[1]).toBe(china.economy.gdp);
      
      expect(conflict.currentGDP).toEqual(conflict.initialGDP);
    });
  });

  describe('calculateBattleOutcome', () => {
    test('should return probability between 0 and 1', () => {
      const probability = conflict.calculateBattleOutcome();
      expect(typeof probability).toBe('number');
      expect(probability).toBeGreaterThanOrEqual(0);
      expect(probability).toBeLessThanOrEqual(1);
    });

    test('should favor stronger military country', () => {
      // Create heavily outmatched scenario
      const weakCountry = new Country({
        ...chinaData,
        military: { personnel: 10000, expenditure: 1000000000, nuclear: false }
      });
      
      const mismatchedConflict = new Conflict(usa, weakCountry);
      const probability = mismatchedConflict.calculateBattleOutcome();
      
      // USA should have >70% chance due to overwhelming military advantage
      expect(probability).toBeGreaterThan(0.7);
    });

    test('should consider economic power in calculations', () => {
      const richCountry = new Country({
        ...chinaData,
        economy: { gdp: 30000000000000, gdpPerCapita: 20000 }
      });
      
      // Test multiple times and average to account for randomness
      let totalProbability = 0;
      for (let i = 0; i < 10; i++) {
        const economicConflict = new Conflict(usa, richCountry);
        totalProbability += economicConflict.calculateBattleOutcome();
      }
      const avgProbability = totalProbability / 10;
      
      expect(avgProbability).toBeLessThan(0.65); // USA should be less favored on average
    });

    test('should factor in nuclear weapons', () => {
      const nonNuclearCountry = new Country({
        ...chinaData,
        military: { ...chinaData.military, nuclear: false }
      });

      // Average multiple runs to account for random factor
      let nuclearProbSum = 0;
      let regularProbSum = 0;

      for (let i = 0; i < 20; i++) {
        const nuclearConflict = new Conflict(usa, nonNuclearCountry);
        const regularConflict = new Conflict(usa, china);
        nuclearProbSum += nuclearConflict.calculateBattleOutcome();
        regularProbSum += regularConflict.calculateBattleOutcome();
      }

      const avgNuclearProb = nuclearProbSum / 20;
      const avgRegularProb = regularProbSum / 20;

      expect(avgNuclearProb).toBeGreaterThan(avgRegularProb);
    });

    test('should be affected by current territory control', () => {
      // Test multiple times due to randomness
      let winningProbSum = 0;
      let losingProbSum = 0;
      
      for (let i = 0; i < 10; i++) {
        conflict.territoryControl = [80, 20]; // USA winning
        winningProbSum += conflict.calculateBattleOutcome();
        
        conflict.territoryControl = [20, 80]; // China winning  
        losingProbSum += conflict.calculateBattleOutcome();
      }
      
      const avgWinningProb = winningProbSum / 10;
      const avgLosingProb = losingProbSum / 10;
      
      expect(avgWinningProb).toBeGreaterThan(avgLosingProb);
    });
  });

  describe('updateTerritoryControl', () => {
    test('should update territory based on battle outcome', () => {
      const initialControl = [...conflict.territoryControl];
      conflict.updateTerritoryControl();
      
      // Territory should change
      expect(conflict.territoryControl).not.toEqual(initialControl);
      
      // Total should still be 100
      const total = conflict.territoryControl[0] + conflict.territoryControl[1];
      expect(total).toBeCloseTo(100, 1);
    });

    test('should not exceed 100% territory for one country', () => {
      // Force extreme scenario
      for (let i = 0; i < 50; i++) {
        conflict.updateTerritoryControl();
        expect(conflict.territoryControl[0]).toBeLessThanOrEqual(100);
        expect(conflict.territoryControl[1]).toBeLessThanOrEqual(100);
        expect(conflict.territoryControl[0]).toBeGreaterThanOrEqual(0);
        expect(conflict.territoryControl[1]).toBeGreaterThanOrEqual(0);
      }
    });

    test('should record territory changes in events', () => {
      const initialEvents = conflict.events.length;
      conflict.updateTerritoryControl();
      
      expect(conflict.events.length).toBeGreaterThan(initialEvents);
      
      const lastEvent = conflict.events[conflict.events.length - 1];
      expect(lastEvent).toHaveProperty('type');
      expect(lastEvent).toHaveProperty('description');
      expect(lastEvent).toHaveProperty('timestamp');
      expect(lastEvent).toHaveProperty('territoryChange');
    });

    test('should affect economic impact', () => {
      const initialGDP = [...conflict.currentGDP];
      
      // Run several updates to see economic impact
      for (let i = 0; i < 5; i++) {
        conflict.updateTerritoryControl();
      }
      
      // GDP should decrease due to war costs
      expect(conflict.currentGDP[0]).toBeLessThan(initialGDP[0]);
      expect(conflict.currentGDP[1]).toBeLessThan(initialGDP[1]);
    });
  });

  describe('checkVictoryConditions', () => {
    test('should detect territorial control victory (75%+)', () => {
      conflict.territoryControl = [75, 25];
      const victory = conflict.checkVictoryConditions();
      
      expect(victory.hasWinner).toBe(true);
      expect(victory.winner).toBe(0);
      expect(victory.condition).toBe('territorial_control');
      expect(victory.description).toContain('75%');
    });

    test('should detect economic collapse victory (30% GDP)', () => {
      conflict.currentGDP = [usa.economy.gdp, china.economy.gdp * 0.25]; // China collapses
      const victory = conflict.checkVictoryConditions();
      
      expect(victory.hasWinner).toBe(true);
      expect(victory.winner).toBe(0); // USA wins
      expect(victory.condition).toBe('economic_collapse');
    });

    test('should handle diplomatic resolution probability', () => {
      conflict.duration = 100; // Long conflict increases diplomacy chance
      
      // Run check many times to test randomness
      let diplomaticResolutions = 0;
      for (let i = 0; i < 100; i++) {
        const victory = conflict.checkVictoryConditions();
        if (victory.hasWinner && victory.condition === 'diplomatic_resolution') {
          diplomaticResolutions++;
        }
      }
      
      // Should have some diplomatic resolutions due to duration
      expect(diplomaticResolutions).toBeGreaterThan(0);
    });

    test('should handle international intervention', () => {
      // Force high casualty scenario to increase intervention chance
      conflict.totalCasualties = 1000000;
      
      let interventions = 0;
      for (let i = 0; i < 100; i++) {
        const victory = conflict.checkVictoryConditions();
        if (victory.hasWinner && victory.condition === 'international_intervention') {
          interventions++;
        }
      }
      
      expect(interventions).toBeGreaterThan(0);
    });

    test('should return no winner for ongoing conflict', () => {
      // Normal ongoing conflict
      conflict.territoryControl = [60, 40];
      conflict.currentGDP = [usa.economy.gdp * 0.9, china.economy.gdp * 0.9];
      conflict.duration = 10;
      
      const victory = conflict.checkVictoryConditions();
      expect(victory.hasWinner).toBe(false);
      expect(victory.winner).toBeNull();
      expect(victory.condition).toBeNull();
    });
  });

  describe('getDuration', () => {
    test('should return current duration', () => {
      expect(conflict.getDuration()).toBe(0);
      
      conflict.duration = 42;
      expect(conflict.getDuration()).toBe(42);
    });

    test('should format duration correctly', () => {
      conflict.duration = 125; // 2:05
      const formatted = conflict.getFormattedDuration();
      expect(formatted).toBe('2:05');
      
      conflict.duration = 65; // 1:05
      expect(conflict.getFormattedDuration()).toBe('1:05');
      
      conflict.duration = 5; // 0:05
      expect(conflict.getFormattedDuration()).toBe('0:05');
    });
  });

  describe('addEvent', () => {
    test('should add event with proper structure', () => {
      const eventData = {
        type: 'battle',
        description: 'Major battle in sector 7',
        territoryChange: [2, -2]
      };
      
      const initialEvents = conflict.events.length;
      conflict.addEvent(eventData);
      
      expect(conflict.events).toHaveLength(initialEvents + 1);
      const event = conflict.events[conflict.events.length - 1]; // Get the newly added event
      
      expect(event.type).toBe('battle');
      expect(event.description).toBe('Major battle in sector 7');
      expect(event.territoryChange).toEqual([2, -2]);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    test('should maintain events chronologically', () => {
      const event1 = { type: 'battle', description: 'First battle' };
      const event2 = { type: 'battle', description: 'Second battle' };
      
      const initialCount = conflict.events.length;
      conflict.addEvent(event1);
      conflict.addEvent(event2);
      
      expect(conflict.events).toHaveLength(initialCount + 2);
      const firstAdded = conflict.events[conflict.events.length - 2];
      const secondAdded = conflict.events[conflict.events.length - 1];
      
      expect(firstAdded.timestamp.getTime()).toBeLessThanOrEqual(
        secondAdded.timestamp.getTime()
      );
    });
  });

  describe('getStats', () => {
    test('should return comprehensive conflict statistics', () => {
      conflict.duration = 30;
      conflict.territoryControl = [65, 35];
      conflict.totalCasualties = 50000;
      
      const stats = conflict.getStats();
      
      expect(stats).toHaveProperty('duration', 30);
      expect(stats).toHaveProperty('territoryControl', [65, 35]);
      expect(stats).toHaveProperty('casualties', 50000);
      expect(stats).toHaveProperty('economicImpact');
      expect(stats).toHaveProperty('countries');
      expect(stats.countries).toHaveLength(2);
    });

    test('should calculate economic impact percentage', () => {
      conflict.currentGDP = [usa.economy.gdp * 0.8, china.economy.gdp * 0.9];
      
      const stats = conflict.getStats();
      expect(stats.economicImpact[0]).toBeCloseTo(-20, 1); // -20% for USA
      expect(stats.economicImpact[1]).toBeCloseTo(-10, 1); // -10% for China
    });
  });

  describe('endConflict', () => {
    test('should properly end conflict with winner', () => {
      conflict.endConflict(0, 'territorial_control', 'USA achieved total victory');
      
      expect(conflict.status).toBe('ended');
      expect(conflict.winner).toBe(0);
      expect(conflict.victoryCondition).toBe('territorial_control');
      expect(conflict.victoryDescription).toBe('USA achieved total victory');
    });

    test('should record final event', () => {
      const initialEvents = conflict.events.length;
      conflict.endConflict(1, 'economic_collapse', 'China emerged victorious');
      
      expect(conflict.events.length).toBe(initialEvents + 1);
      
      const finalEvent = conflict.events[conflict.events.length - 1];
      expect(finalEvent.type).toBe('conflict_end');
      expect(finalEvent.description).toContain('China emerged victorious');
    });
  });
});