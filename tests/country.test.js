const Country = require('../js/country');

describe('Country', () => {
  const validCountryData = {
    name: "United States",
    code: "US",
    military: {
      personnel: 1400000,
      expenditure: 778000000000,
      nuclear: true
    },
    economy: {
      gdp: 21430000000000,
      gdpPerCapita: 65280
    },
    geography: {
      area: 9833517,
      population: 331002651,
      capital: [38.9072, -77.0369]
    },
    alliances: ["NATO", "AUKUS"]
  };

  describe('constructor', () => {
    test('should create country with valid data', () => {
      const country = new Country(validCountryData);
      expect(country.name).toBe("United States");
      expect(country.code).toBe("US");
    });

    test('should throw error for missing required fields', () => {
      const invalidData = { ...validCountryData };
      delete invalidData.name;
      
      expect(() => new Country(invalidData)).toThrow('Missing required field: name');
    });

    test('should throw error for missing military data', () => {
      const invalidData = { ...validCountryData };
      delete invalidData.military;
      
      expect(() => new Country(invalidData)).toThrow('Missing required field: military');
    });

    test('should throw error for invalid military expenditure', () => {
      const invalidData = { 
        ...validCountryData,
        military: { ...validCountryData.military, expenditure: -1000 }
      };
      
      expect(() => new Country(invalidData)).toThrow('Military expenditure must be non-negative');
    });
  });

  describe('getMilitaryStrength', () => {
    test('should calculate military strength based on personnel and expenditure', () => {
      const country = new Country(validCountryData);
      const strength = country.getMilitaryStrength();
      
      expect(typeof strength).toBe('number');
      expect(strength).toBeGreaterThan(0);
    });

    test('should give higher strength for larger military', () => {
      const smallCountry = new Country({
        ...validCountryData,
        military: { personnel: 50000, expenditure: 1000000000, nuclear: false }
      });
      const largeCountry = new Country(validCountryData);
      
      expect(largeCountry.getMilitaryStrength()).toBeGreaterThan(smallCountry.getMilitaryStrength());
    });

    test('should apply nuclear weapons bonus', () => {
      const nuclearCountry = new Country(validCountryData);
      const nonNuclearCountry = new Country({
        ...validCountryData,
        military: { ...validCountryData.military, nuclear: false }
      });
      
      expect(nuclearCountry.getMilitaryStrength()).toBeGreaterThan(nonNuclearCountry.getMilitaryStrength());
    });
  });

  describe('getEconomicPower', () => {
    test('should calculate economic power based on GDP', () => {
      const country = new Country(validCountryData);
      const power = country.getEconomicPower();
      
      expect(typeof power).toBe('number');
      expect(power).toBeGreaterThan(0);
    });

    test('should give higher power for larger GDP', () => {
      const richCountry = new Country(validCountryData);
      const poorCountry = new Country({
        ...validCountryData,
        economy: { gdp: 500000000000, gdpPerCapita: 15000 }
      });
      
      expect(richCountry.getEconomicPower()).toBeGreaterThan(poorCountry.getEconomicPower());
    });
  });

  describe('getGeographicAdvantage', () => {
    test('should calculate distance-based advantage', () => {
      const country1 = new Country(validCountryData);
      const country2 = new Country({
        ...validCountryData,
        name: "Canada",
        code: "CA",
        geography: { ...validCountryData.geography, capital: [45.4215, -75.6972] }
      });
      
      const advantage = country1.getGeographicAdvantage(country2);
      expect(typeof advantage).toBe('number');
      expect(advantage).toBeGreaterThanOrEqual(0);
      expect(advantage).toBeLessThanOrEqual(1);
    });

    test('should give higher advantage for closer countries', () => {
      const usa = new Country(validCountryData);
      const canada = new Country({
        ...validCountryData,
        name: "Canada",
        geography: { ...validCountryData.geography, capital: [45.4215, -75.6972] }
      });
      const australia = new Country({
        ...validCountryData,
        name: "Australia", 
        geography: { ...validCountryData.geography, capital: [-35.2809, 149.1300] }
      });
      
      expect(usa.getGeographicAdvantage(canada)).toBeGreaterThan(usa.getGeographicAdvantage(australia));
    });
  });

  describe('hasAlliance', () => {
    test('should return true for existing alliance', () => {
      const country = new Country(validCountryData);
      expect(country.hasAlliance("NATO")).toBe(true);
      expect(country.hasAlliance("AUKUS")).toBe(true);
    });

    test('should return false for non-existing alliance', () => {
      const country = new Country(validCountryData);
      expect(country.hasAlliance("Warsaw Pact")).toBe(false);
    });

    test('should handle case-insensitive alliance names', () => {
      const country = new Country(validCountryData);
      expect(country.hasAlliance("nato")).toBe(true);
      expect(country.hasAlliance("Nato")).toBe(true);
    });
  });
});