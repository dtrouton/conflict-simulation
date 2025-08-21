const CountrySelector = require('../js/country-selector');
const Country = require('../js/country');

describe('CountrySelector', () => {
  const usaData = {
    name: "United States",
    code: "US",
    military: { personnel: 1400000, expenditure: 778000000000, nuclear: true },
    economy: { gdp: 21430000000000, gdpPerCapita: 65280 },
    geography: { area: 9833517, population: 331002651, capital: [38.9072, -77.0369] },
    alliances: ["NATO", "AUKUS"],
    resources: ["oil", "coal", "agriculture"]
  };

  const canadaData = {
    name: "Canada",
    code: "CA", 
    military: { personnel: 67000, expenditure: 22800000000, nuclear: false },
    economy: { gdp: 1736000000000, gdpPerCapita: 46260 },
    geography: { area: 9976140, population: 37742154, capital: [45.4215, -75.6972] },
    alliances: ["NATO"],
    resources: ["oil", "minerals", "timber"]
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

  const conflictHistory = [
    { countries: ["US", "CN"], year: 2018, type: "trade_war" },
    { countries: ["US", "CA"], year: 1812, type: "territorial" }
  ];

  let countries, selector;

  beforeEach(() => {
    countries = [
      new Country(usaData),
      new Country(canadaData), 
      new Country(chinaData)
    ];
    selector = new CountrySelector(countries, conflictHistory);
  });

  describe('constructor', () => {
    test('should create selector with countries and conflict history', () => {
      expect(selector.countries).toHaveLength(3);
      expect(selector.conflictHistory).toHaveLength(2);
    });

    test('should throw error for empty countries array', () => {
      expect(() => new CountrySelector([], conflictHistory)).toThrow('Countries array cannot be empty');
    });

    test('should work with empty conflict history', () => {
      const selector = new CountrySelector(countries, []);
      expect(selector.conflictHistory).toEqual([]);
    });
  });

  describe('getGeographicalProximity', () => {
    test('should calculate proximity based on distance', () => {
      const usa = countries[0];
      const canada = countries[1];
      const china = countries[2];
      
      const usaCanadaProximity = selector.getGeographicalProximity(usa, canada);
      const usaChinaProximity = selector.getGeographicalProximity(usa, china);
      
      expect(typeof usaCanadaProximity).toBe('number');
      expect(usaCanadaProximity).toBeGreaterThan(0);
      expect(usaCanadaProximity).toBeLessThanOrEqual(1);
      expect(usaCanadaProximity).toBeGreaterThan(usaChinaProximity);
    });

    test('should return 1 for identical locations', () => {
      const usa = countries[0];
      const proximity = selector.getGeographicalProximity(usa, usa);
      expect(proximity).toBe(1);
    });

    test('should apply border bonus for neighboring countries', () => {
      // Mock countries that share a border
      const countryA = new Country({
        ...usaData,
        geography: { ...usaData.geography, borders: ["CA"] }
      });
      const countryB = new Country({
        ...canadaData,
        geography: { ...canadaData.geography, borders: ["US"] }
      });

      const selectorWithBorders = new CountrySelector([countryA, countryB], []);
      const proximity = selectorWithBorders.getGeographicalProximity(countryA, countryB);
      
      // Should be higher than non-border countries due to border bonus
      expect(proximity).toBeGreaterThan(0.5);
    });
  });

  describe('getHistoricalTension', () => {
    test('should return tension score based on past conflicts', () => {
      const usa = countries[0];
      const china = countries[2];
      
      const tension = selector.getHistoricalTension(usa, china);
      expect(typeof tension).toBe('number');
      expect(tension).toBeGreaterThan(0);
      expect(tension).toBeLessThanOrEqual(1);
    });

    test('should return higher tension for recent conflicts', () => {
      const recentHistory = [
        { countries: ["US", "CN"], year: 2020, type: "trade_war" },
        { countries: ["US", "CA"], year: 1812, type: "territorial" }
      ];
      
      const recentSelector = new CountrySelector(countries, recentHistory);
      const usa = countries[0];
      const china = countries[2];
      const canada = countries[1];
      
      const recentTension = recentSelector.getHistoricalTension(usa, china);
      const oldTension = recentSelector.getHistoricalTension(usa, canada);
      
      expect(recentTension).toBeGreaterThan(oldTension);
    });

    test('should return 0 for countries with no conflict history', () => {
      const canada = countries[1];
      const china = countries[2];
      
      const tension = selector.getHistoricalTension(canada, china);
      expect(tension).toBe(0);
    });
  });

  describe('getResourceCompetition', () => {
    test('should calculate competition based on shared resources', () => {
      const usa = countries[0];
      const canada = countries[1];
      
      const competition = selector.getResourceCompetition(usa, canada);
      expect(typeof competition).toBe('number');
      expect(competition).toBeGreaterThan(0); // Both have oil
      expect(competition).toBeLessThanOrEqual(1);
    });

    test('should return higher competition for more shared resources', () => {
      const countryA = new Country({
        ...usaData,
        resources: ["oil", "coal", "minerals", "agriculture"]
      });
      const countryB = new Country({
        ...canadaData,
        resources: ["oil", "coal", "minerals", "timber"]
      });
      
      const highCompetitionSelector = new CountrySelector([countryA, countryB], []);
      const highCompetition = highCompetitionSelector.getResourceCompetition(countryA, countryB);
      
      const usa = countries[0];
      const canada = countries[1];
      const lowCompetition = selector.getResourceCompetition(usa, canada);
      
      expect(highCompetition).toBeGreaterThan(lowCompetition);
    });

    test('should return 0 for countries with no shared resources', () => {
      const countryA = new Country({
        ...usaData,
        resources: ["oil", "coal"]
      });
      const countryB = new Country({
        ...canadaData,
        resources: ["timber", "fish"]
      });
      
      const noCompetitionSelector = new CountrySelector([countryA, countryB], []);
      const competition = noCompetitionSelector.getResourceCompetition(countryA, countryB);
      expect(competition).toBe(0);
    });
  });

  describe('calculateConflictProbability', () => {
    test('should combine all factors into probability score', () => {
      const usa = countries[0];
      const canada = countries[1];
      
      const probability = selector.calculateConflictProbability(usa, canada);
      expect(typeof probability).toBe('number');
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(1);
    });

    test('should give higher probability for neighboring countries', () => {
      // Test with countries that have no historical conflicts to isolate geography effect
      const testSelector = new CountrySelector(countries, []); // No conflict history
      
      const usa = countries[0];
      const canada = countries[1]; // Close neighbors
      const china = countries[2];   // Far away
      
      const neighborProb = testSelector.calculateConflictProbability(usa, canada);
      const distantProb = testSelector.calculateConflictProbability(usa, china);
      
      expect(neighborProb).toBeGreaterThan(distantProb);
    });

    test('should apply alliance penalty (reduce probability)', () => {
      // Both USA and Canada are in NATO
      const usa = countries[0];
      const canada = countries[1];
      const china = countries[2];
      
      const allyProb = selector.calculateConflictProbability(usa, canada);
      const nonAllyProb = selector.calculateConflictProbability(usa, china);
      
      // Alliance should reduce probability
      expect(allyProb).toBeLessThan(nonAllyProb);
    });

    test('should factor in GDP disparity', () => {
      // Create countries with very different GDPs
      const richCountry = new Country({
        ...usaData,
        economy: { gdp: 20000000000000, gdpPerCapita: 60000 }
      });
      const poorCountry = new Country({
        ...canadaData, 
        economy: { gdp: 100000000000, gdpPerCapita: 5000 }
      });
      
      const disparitySelector = new CountrySelector([richCountry, poorCountry], []);
      const probability = disparitySelector.calculateConflictProbability(richCountry, poorCountry);
      
      expect(probability).toBeGreaterThan(0.1); // Should have some conflict potential
    });
  });

  describe('selectRandomPair', () => {
    test('should return two different countries', () => {
      const pair = selector.selectRandomPair();
      expect(Array.isArray(pair)).toBe(true);
      expect(pair).toHaveLength(2);
      expect(pair[0]).not.toBe(pair[1]);
      expect(pair[0]).toBeInstanceOf(Country);
      expect(pair[1]).toBeInstanceOf(Country);
    });

    test('should throw error with insufficient countries', () => {
      const singleCountry = new CountrySelector([countries[0]], []);
      expect(() => singleCountry.selectRandomPair()).toThrow('Need at least 2 countries to select a pair');
    });

    test('should favor higher probability pairs over multiple selections', () => {
      // Run selection many times and track frequency
      const selections = {};
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const [a, b] = selector.selectRandomPair();
        const key = [a.code, b.code].sort().join('-');
        selections[key] = (selections[key] || 0) + 1;
      }
      
      // USA-Canada should be selected more often than others due to proximity
      const usaCanada = selections['CA-US'] || 0;
      const totalSelections = Object.values(selections).reduce((sum, count) => sum + count, 0);
      
      // USA-Canada should represent a significant portion due to geographic proximity
      expect(usaCanada / totalSelections).toBeGreaterThan(0.2);
    });
  });
});