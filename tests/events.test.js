const EventGenerator = require('../js/events');
const Conflict = require('../js/conflict');
const Country = require('../js/country');

describe('EventGenerator', () => {
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

  let usa, china, conflict, eventGenerator;

  beforeEach(() => {
    usa = new Country(usaData);
    china = new Country(chinaData);
    conflict = new Conflict(usa, china);
    eventGenerator = new EventGenerator();
  });

  describe('constructor', () => {
    test('should create event generator with default settings', () => {
      expect(eventGenerator.eventProbability).toBe(0.15); // 15% default chance
      expect(eventGenerator.activeEvents).toEqual([]);
    });

    test('should accept custom event probability', () => {
      const customGenerator = new EventGenerator(0.25);
      expect(customGenerator.eventProbability).toBe(0.25);
    });

    test('should validate probability range', () => {
      expect(() => new EventGenerator(-0.1)).toThrow('Event probability must be between 0 and 1');
      expect(() => new EventGenerator(1.1)).toThrow('Event probability must be between 0 and 1');
    });
  });

  describe('generateRandomEvent', () => {
    test('should return null when no event occurs', () => {
      // Mock Math.random to always return high value (no event)
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.9); // Above 15% threshold
      
      const event = eventGenerator.generateRandomEvent(conflict);
      expect(event).toBeNull();
      
      Math.random = originalRandom;
    });

    test('should generate event when probability is met', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Below 15% threshold
      
      const event = eventGenerator.generateRandomEvent(conflict);
      expect(event).not.toBeNull();
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('description');
      expect(event).toHaveProperty('effects');
      
      Math.random = originalRandom;
    });

    test('should return different event types', () => {
      const eventTypes = new Set();
      
      // Generate many events to test variety
      for (let i = 0; i < 100; i++) {
        // Force event generation and let type selection be random
        const originalRandom = Math.random;
        Math.random = jest.fn()
          .mockReturnValueOnce(0.05) // Trigger event (below 15% threshold)
          .mockReturnValue(originalRandom()); // Normal randomness for type selection
        
        const event = eventGenerator.generateRandomEvent(conflict);
        if (event) {
          eventTypes.add(event.type);
        }
        
        Math.random = originalRandom;
      }
      
      // Should have multiple event types
      expect(eventTypes.size).toBeGreaterThan(2);
    });
  });

  describe('getEventTypes', () => {
    test('should return all available event categories', () => {
      const types = eventGenerator.getEventTypes();
      
      expect(types).toContain('natural_disaster');
      expect(types).toContain('political_event');
      expect(types).toContain('economic_event');
      expect(types).toContain('international_pressure');
      expect(types).toContain('military_development');
      expect(types.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('applyEventEffects', () => {
    test('should modify conflict state based on event effects', () => {
      const event = {
        type: 'economic_event',
        description: 'Trade embargo imposed on Country A',
        effects: {
          gdpChange: [-0.1, 0], // -10% GDP for country A
          militaryEfficiency: [0.9, 1.0], // -10% military efficiency for A
          duration: 5
        }
      };

      const originalGDP = [...conflict.currentGDP];
      eventGenerator.applyEventEffects(conflict, event);
      
      // GDP should decrease for country A
      expect(conflict.currentGDP[0]).toBeLessThan(originalGDP[0]);
      expect(conflict.currentGDP[1]).toBe(originalGDP[1]); // Country B unchanged
    });

    test('should add event to conflict timeline', () => {
      const event = {
        type: 'natural_disaster',
        description: 'Earthquake disrupts supply lines',
        effects: {
          territoryChange: [-2, 2],
          duration: 3
        }
      };

      const initialEvents = conflict.events.length;
      eventGenerator.applyEventEffects(conflict, event);
      
      expect(conflict.events.length).toBe(initialEvents + 1);
      
      const addedEvent = conflict.events[conflict.events.length - 1];
      expect(addedEvent.type).toBe('random_event');
      expect(addedEvent.description).toContain('Earthquake');
    });

    test('should track active events with duration', () => {
      const event = {
        type: 'political_event',
        description: 'Civil unrest in Country B',
        effects: {
          militaryEfficiency: [1.0, 0.8],
          duration: 10
        }
      };

      eventGenerator.applyEventEffects(conflict, event);
      
      expect(eventGenerator.activeEvents).toHaveLength(1);
      expect(eventGenerator.activeEvents[0].remainingDuration).toBe(10);
      expect(eventGenerator.activeEvents[0].effects.militaryEfficiency).toEqual([1.0, 0.8]);
    });

    test('should handle territory changes correctly', () => {
      const event = {
        type: 'military_development',
        description: 'Country A develops new weapons',
        effects: {
          territoryChange: [5, -5],
          duration: 1
        }
      };

      const originalTerritory = [...conflict.territoryControl];
      eventGenerator.applyEventEffects(conflict, event);
      
      expect(conflict.territoryControl[0]).toBe(Math.min(100, originalTerritory[0] + 5));
      expect(conflict.territoryControl[1]).toBe(Math.max(0, originalTerritory[1] - 5));
      
      // Total should still be 100
      const total = conflict.territoryControl[0] + conflict.territoryControl[1];
      expect(total).toBeCloseTo(100, 1);
    });
  });

  describe('updateActiveEvents', () => {
    test('should decrement duration of active events', () => {
      const event = {
        type: 'economic_event',
        description: 'Oil price shock',
        effects: {
          gdpChange: [-0.05, -0.03],
          duration: 3
        }
      };

      eventGenerator.applyEventEffects(conflict, event);
      expect(eventGenerator.activeEvents[0].remainingDuration).toBe(3);
      
      eventGenerator.updateActiveEvents(conflict);
      expect(eventGenerator.activeEvents[0].remainingDuration).toBe(2);
    });

    test('should remove expired events', () => {
      const event = {
        type: 'natural_disaster',
        description: 'Flood damage',
        effects: {
          militaryEfficiency: [0.9, 0.9],
          duration: 1
        }
      };

      eventGenerator.applyEventEffects(conflict, event);
      expect(eventGenerator.activeEvents).toHaveLength(1);
      
      eventGenerator.updateActiveEvents(conflict);
      expect(eventGenerator.activeEvents).toHaveLength(0);
    });

    test('should apply ongoing effects during active period', () => {
      const event = {
        type: 'economic_event',
        description: 'Ongoing sanctions',
        effects: {
          gdpChange: [-0.02, 0], // -2% GDP per turn
          duration: 3
        }
      };

      const originalGDP = [...conflict.currentGDP];
      eventGenerator.applyEventEffects(conflict, event);
      
      // Apply ongoing effects
      eventGenerator.updateActiveEvents(conflict);
      
      // GDP should continue to decrease
      expect(conflict.currentGDP[0]).toBeLessThan(originalGDP[0]);
    });
  });

  describe('createNaturalDisasterEvent', () => {
    test('should create natural disaster with appropriate effects', () => {
      const event = eventGenerator.createNaturalDisasterEvent(conflict);
      
      expect(event.type).toBe('natural_disaster');
      expect(event.description).toMatch(/(earthquake|flood|hurricane|drought|wildfire)/i);
      expect(event.effects).toHaveProperty('duration');
      expect(event.effects.duration).toBeGreaterThan(0);
    });

    test('should have realistic disaster impacts', () => {
      const event = eventGenerator.createNaturalDisasterEvent(conflict);
      
      // Should affect military efficiency or territory
      const hasEffects = event.effects.militaryEfficiency || 
                        event.effects.territoryChange || 
                        event.effects.gdpChange;
      expect(hasEffects).toBeTruthy();
    });
  });

  describe('createPoliticalEvent', () => {
    test('should create political event with country-specific effects', () => {
      const event = eventGenerator.createPoliticalEvent(conflict);
      
      expect(event.type).toBe('political_event');
      expect(event.description).toMatch(/(election|coup|protest|scandal|reform)/i);
      expect(event.effects).toHaveProperty('duration');
    });

    test('should affect specific countries differently', () => {
      let foundAsymmetric = false;
      
      // Test multiple events to find asymmetric effects
      for (let i = 0; i < 20; i++) {
        const event = eventGenerator.createPoliticalEvent(conflict);
        
        if (event.effects.militaryEfficiency && 
            event.effects.militaryEfficiency[0] !== event.effects.militaryEfficiency[1]) {
          foundAsymmetric = true;
          break;
        }
      }
      
      expect(foundAsymmetric).toBe(true);
    });
  });

  describe('createEconomicEvent', () => {
    test('should create economic event with GDP impacts', () => {
      const event = eventGenerator.createEconomicEvent(conflict);
      
      expect(event.type).toBe('economic_event');
      expect(event.description).toMatch(/(trade|sanction|embargo|recession|boom|inflation|war|arms|currency)/i);
      expect(event.effects.gdpChange).toBeDefined();
      expect(Array.isArray(event.effects.gdpChange)).toBe(true);
    });

    test('should have varying economic impact severity', () => {
      const events = [];
      for (let i = 0; i < 50; i++) { // More events for better variety
        events.push(eventGenerator.createEconomicEvent(conflict));
      }
      
      // Should have different impact magnitudes
      const impacts = events.map(e => Math.abs(e.effects.gdpChange[0] || 0) + Math.abs(e.effects.gdpChange[1] || 0));
      const uniqueImpacts = new Set(impacts.map(i => Math.round(i * 1000))); // Round to avoid floating point issues
      expect(uniqueImpacts.size).toBeGreaterThan(2);
    });
  });

  describe('createInternationalPressureEvent', () => {
    test('should create diplomatic intervention event', () => {
      const event = eventGenerator.createInternationalPressureEvent(conflict);
      
      expect(event.type).toBe('international_pressure');
      expect(event.description).toMatch(/(UN|diplomatic|peace|ceasefire|mediation|intervention|mediate)/i);
      expect(event.effects).toHaveProperty('duration');
    });

    test('should have conflict de-escalation effects', () => {
      const event = eventGenerator.createInternationalPressureEvent(conflict);
      
      // Should reduce military effectiveness or encourage diplomacy
      const hasDeEscalation = event.effects.militaryEfficiency ||
                             event.effects.diplomacyBonus;
      expect(hasDeEscalation).toBeTruthy();
    });
  });

  describe('createMilitaryDevelopmentEvent', () => {
    test('should create military advancement event', () => {
      const event = eventGenerator.createMilitaryDevelopmentEvent(conflict);
      
      expect(event.type).toBe('military_development');
      expect(event.description).toMatch(/(weapon|technology|strategy|intelligence|alliance|cyber|special)/i);
      expect(event.effects).toHaveProperty('duration');
    });

    test('should provide military advantages', () => {
      const event = eventGenerator.createMilitaryDevelopmentEvent(conflict);
      
      const hasMilitaryEffect = event.effects.militaryEfficiency ||
                               event.effects.territoryChange;
      expect(hasMilitaryEffect).toBeTruthy();
    });
  });

  describe('getActiveEventsDescription', () => {
    test('should return empty array when no active events', () => {
      const descriptions = eventGenerator.getActiveEventsDescription();
      expect(descriptions).toEqual([]);
    });

    test('should return descriptions of active events', () => {
      const event1 = {
        type: 'economic_event',
        description: 'Trade war escalation',
        effects: { gdpChange: [-0.1, -0.05], duration: 5 }
      };
      
      const event2 = {
        type: 'natural_disaster',
        description: 'Severe earthquake',
        effects: { militaryEfficiency: [0.8, 0.9], duration: 3 }
      };

      eventGenerator.applyEventEffects(conflict, event1);
      eventGenerator.applyEventEffects(conflict, event2);
      
      const descriptions = eventGenerator.getActiveEventsDescription();
      expect(descriptions).toHaveLength(2);
      expect(descriptions[0]).toContain('Trade war escalation');
      expect(descriptions[1]).toContain('Severe earthquake');
    });
  });
});