const SimulationEngine = require('../js/simulation');
const Country = require('../js/country');
const _CountrySelector = require('../js/country-selector');
const _Conflict = require('../js/conflict');
const _EventGenerator = require('../js/events');
const _PredictionSystem = require('../js/prediction');

// Mock timers for testing
jest.useFakeTimers();

describe('SimulationEngine', () => {
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

  const canadaData = {
    name: "Canada",
    code: "CA",
    military: { personnel: 67000, expenditure: 22800000000, nuclear: false },
    economy: { gdp: 1736000000000, gdpPerCapita: 46260 },
    geography: { area: 9976140, population: 37742154, capital: [45.4215, -75.6972] },
    alliances: ["NATO"],
    resources: ["oil", "minerals", "timber"]
  };

  let countries, simulationEngine;

  beforeEach(() => {
    countries = [
      new Country(usaData),
      new Country(chinaData),
      new Country(canadaData)
    ];
    simulationEngine = new SimulationEngine(countries);
    jest.clearAllTimers();
  });

  afterEach(() => {
    if (simulationEngine.isRunning()) {
      simulationEngine.stop();
    }
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    test('should initialize with default settings', () => {
      expect(simulationEngine.countries).toHaveLength(3);
      expect(simulationEngine.currentConflict).toBeNull();
      expect(simulationEngine.speed).toBe(1);
      expect(simulationEngine.updateInterval).toBe(5000); // 5 second default
      expect(simulationEngine.isRunning()).toBe(false);
      expect(simulationEngine.isPaused()).toBe(false);
    });

    test('should initialize with custom update interval', () => {
      const customEngine = new SimulationEngine(countries, 3000); // 3 seconds
      expect(customEngine.updateInterval).toBe(3000);
    });

    test('should throw error with insufficient countries', () => {
      expect(() => new SimulationEngine([countries[0]])).toThrow('Need at least 2 countries');
    });

    test('should initialize sub-systems correctly', () => {
      expect(simulationEngine.countrySelector).toBeDefined();
      expect(simulationEngine.eventGenerator).toBeDefined();
      expect(simulationEngine.predictionSystem).toBeDefined();
    });

    test('should accept custom configuration', () => {
      const config = {
        updateInterval: 3000,
        eventProbability: 0.2,
        autoAdvance: false
      };
      
      const customEngine = new SimulationEngine(countries, config);
      expect(customEngine.updateInterval).toBe(3000);
      expect(customEngine.autoAdvance).toBe(false);
    });
  });

  describe('start', () => {
    test('should start simulation and create initial conflict', () => {
      simulationEngine.start();
      
      expect(simulationEngine.isRunning()).toBe(true);
      expect(simulationEngine.currentConflict).not.toBeNull();
      expect(simulationEngine.currentConflict.countries).toHaveLength(2);
    });

    test('should not start if already running', () => {
      simulationEngine.start();
      const firstConflict = simulationEngine.currentConflict;
      
      simulationEngine.start(); // Try to start again
      
      expect(simulationEngine.currentConflict).toBe(firstConflict); // Same conflict
    });

    test('should emit started event', () => {
      const startCallback = jest.fn();
      simulationEngine.on('started', startCallback);
      
      simulationEngine.start();
      
      expect(startCallback).toHaveBeenCalledWith({
        conflict: simulationEngine.currentConflict,
        timestamp: expect.any(Number)
      });
    });

    test('should emit conflict_created event', () => {
      const conflictCallback = jest.fn();
      simulationEngine.on('conflict_created', conflictCallback);
      
      simulationEngine.start();
      
      expect(conflictCallback).toHaveBeenCalledWith({
        conflict: simulationEngine.currentConflict,
        countries: expect.any(Array)
      });
    });
  });

  describe('stop', () => {
    test('should stop simulation and clear timers', () => {
      simulationEngine.start();
      expect(simulationEngine.isRunning()).toBe(true);
      
      simulationEngine.stop();
      
      expect(simulationEngine.isRunning()).toBe(false);
      expect(simulationEngine.currentConflict).toBeNull();
    });

    test('should emit stopped event', () => {
      const stopCallback = jest.fn();
      simulationEngine.on('stopped', stopCallback);
      
      simulationEngine.start();
      simulationEngine.stop();
      
      expect(stopCallback).toHaveBeenCalledWith({
        timestamp: expect.any(Number)
      });
    });

    test('should handle stopping when not running', () => {
      expect(() => simulationEngine.stop()).not.toThrow();
      expect(simulationEngine.isRunning()).toBe(false);
    });
  });

  describe('pause and resume', () => {
    test('should pause running simulation', () => {
      simulationEngine.start();
      
      simulationEngine.pause();
      
      expect(simulationEngine.isPaused()).toBe(true);
      expect(simulationEngine.isRunning()).toBe(true); // Still running, just paused
    });

    test('should resume paused simulation', () => {
      simulationEngine.start();
      simulationEngine.pause();
      
      simulationEngine.resume();
      
      expect(simulationEngine.isPaused()).toBe(false);
    });

    test('should emit pause and resume events', () => {
      const pauseCallback = jest.fn();
      const resumeCallback = jest.fn();
      simulationEngine.on('paused', pauseCallback);
      simulationEngine.on('resumed', resumeCallback);
      
      simulationEngine.start();
      simulationEngine.pause();
      simulationEngine.resume();
      
      expect(pauseCallback).toHaveBeenCalled();
      expect(resumeCallback).toHaveBeenCalled();
    });

    test('should not pause when not running', () => {
      expect(() => simulationEngine.pause()).not.toThrow();
      expect(simulationEngine.isPaused()).toBe(false);
    });
  });

  describe('setSpeed', () => {
    test('should accept valid speed multipliers', () => {
      simulationEngine.setSpeed(1);
      expect(simulationEngine.speed).toBe(1);
      
      simulationEngine.setSpeed(2);
      expect(simulationEngine.speed).toBe(2);
      
      simulationEngine.setSpeed(4);
      expect(simulationEngine.speed).toBe(4);
    });

    test('should reject invalid speed values', () => {
      expect(() => simulationEngine.setSpeed(0)).toThrow('Speed must be positive');
      expect(() => simulationEngine.setSpeed(-1)).toThrow('Speed must be positive');
      expect(() => simulationEngine.setSpeed(10)).toThrow('Maximum speed is 8x');
    });

    test('should update timer intervals when running', () => {
      simulationEngine.start();
      const originalInterval = simulationEngine.updateInterval;
      
      simulationEngine.setSpeed(2);
      
      expect(simulationEngine.getCurrentInterval()).toBe(originalInterval / 2);
    });

    test('should emit speed_changed event', () => {
      const speedCallback = jest.fn();
      simulationEngine.on('speed_changed', speedCallback);
      
      simulationEngine.setSpeed(2);
      
      expect(speedCallback).toHaveBeenCalledWith({
        oldSpeed: 1,
        newSpeed: 2,
        currentInterval: expect.any(Number)
      });
    });
  });

  describe('processUpdate', () => {
    test('should update conflict and check victory conditions', () => {
      simulationEngine.start();
      const conflict = simulationEngine.currentConflict;
      const initialDuration = conflict.duration;
      
      simulationEngine.processUpdate();
      
      expect(conflict.duration).toBe(initialDuration + 1);
    });

    test('should generate random events', () => {
      simulationEngine.start();
      const conflict = simulationEngine.currentConflict;
      const initialEvents = conflict.events.length;
      
      // Mock event generation to always return an event
      jest.spyOn(simulationEngine.eventGenerator, 'generateRandomEvent')
        .mockReturnValue({
          type: 'test_event',
          description: 'Test event',
          effects: { duration: 1 }
        });
      
      simulationEngine.processUpdate();
      
      expect(conflict.events.length).toBeGreaterThan(initialEvents);
    });

    test('should emit update event', () => {
      const updateCallback = jest.fn();
      simulationEngine.on('update', updateCallback);
      
      simulationEngine.start();
      simulationEngine.processUpdate();
      
      expect(updateCallback).toHaveBeenCalledWith({
        conflict: simulationEngine.currentConflict,
        duration: expect.any(Number),
        stats: expect.any(Object)
      });
    });

    test('should handle conflict end and auto-advance', () => {
      simulationEngine.start();
      const initialConflict = simulationEngine.currentConflict;
      
      // Mock checkVictoryConditions to return a victory
      initialConflict.checkVictoryConditions = jest.fn().mockReturnValue({
        hasWinner: true,
        winner: 0,
        condition: 'territorial_control',
        description: 'Test victory achieved'
      });
      
      // Listen for conflict_ended event to verify auto-advance
      let conflictEndedFired = false;
      simulationEngine.on('conflict_ended', () => {
        conflictEndedFired = true;
      });
      
      simulationEngine.processUpdate();
      
      // Verify the conflict ended
      expect(conflictEndedFired).toBe(true);
      
      // Fast forward timers to trigger auto-advance
      jest.advanceTimersByTime(150);
      
      if (simulationEngine.autoAdvance) {
        expect(simulationEngine.currentConflict).not.toBe(initialConflict);
        expect(simulationEngine.currentConflict).not.toBeNull();
      }
    });
  });

  describe('event handling', () => {
    test('should support event listeners', () => {
      const callback = jest.fn();
      
      simulationEngine.on('test_event', callback);
      simulationEngine.emit('test_event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should support removing event listeners', () => {
      const callback = jest.fn();
      
      simulationEngine.on('test_event', callback);
      simulationEngine.off('test_event', callback);
      simulationEngine.emit('test_event', { data: 'test' });
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('should emit random_event when events occur', () => {
      const eventCallback = jest.fn();
      simulationEngine.on('random_event', eventCallback);
      
      simulationEngine.start();
      
      // Mock event generation
      jest.spyOn(simulationEngine.eventGenerator, 'generateRandomEvent')
        .mockReturnValue({
          type: 'natural_disaster',
          description: 'Earthquake strikes',
          effects: { duration: 3 }
        });
      
      simulationEngine.processUpdate();
      
      expect(eventCallback).toHaveBeenCalledWith({
        event: expect.any(Object),
        conflict: simulationEngine.currentConflict
      });
    });
  });

  describe('prediction integration', () => {
    test('should allow prediction submission for current conflict', () => {
      simulationEngine.start();
      const _conflict = simulationEngine.currentConflict;

      const result = simulationEngine.submitPrediction(0, 7);
      
      expect(result.success).toBe(true);
      expect(result.predictionId).toBeDefined();
    });

    test('should prevent predictions for non-current conflicts', () => {
      const result = simulationEngine.submitPrediction(0, 7);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No active conflict');
    });

    test('should automatically resolve predictions when conflict ends', () => {
      simulationEngine.start();
      const conflict = simulationEngine.currentConflict;

      const predictionResult = simulationEngine.submitPrediction(0, 8);
      expect(predictionResult.success).toBe(true);

      // Set territory high enough that victory triggers even after updateTerritoryControl
      // (which runs before checkVictoryConditions and can reduce territory by up to 4%)
      conflict.territoryControl = [80, 20]; // Trigger territorial victory
      simulationEngine.processUpdate();
      
      // Check prediction was resolved
      const stats = simulationEngine.predictionSystem.getStatistics();
      expect(stats.resolvedPredictions).toBe(1);
    });

    test('should emit prediction_resolved event', () => {
      const predictionCallback = jest.fn();
      simulationEngine.on('prediction_resolved', predictionCallback);
      
      simulationEngine.start();
      const conflict = simulationEngine.currentConflict;
      
      simulationEngine.submitPrediction(1, 6);
      
      // Trigger victory through territory control
      conflict.territoryControl = [20, 80]; // Trigger victory for country 1 (80% > 75%)
      simulationEngine.processUpdate();
      
      expect(predictionCallback).toHaveBeenCalledWith({
        predictionResult: expect.any(Object),
        conflict: conflict
      });
    });
  });

  describe('statistics and monitoring', () => {
    test('should track simulation statistics', () => {
      simulationEngine.start();
      
      const stats = simulationEngine.getSimulationStats();
      
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('totalConflicts'); 
      expect(stats).toHaveProperty('currentConflict');
      expect(stats).toHaveProperty('predictionStats');
      expect(stats).toHaveProperty('speed');
    });

    test('should track memory usage', () => {
      simulationEngine.start();
      
      const memoryStats = simulationEngine.getMemoryUsage();
      
      expect(memoryStats).toHaveProperty('conflictHistory');
      expect(memoryStats).toHaveProperty('predictions');
      expect(memoryStats).toHaveProperty('activeEvents');
      expect(typeof memoryStats.totalEstimatedMB).toBe('number');
    });

    test('should track performance metrics', () => {
      simulationEngine.start();
      
      // Run a few updates
      for (let i = 0; i < 3; i++) {
        simulationEngine.processUpdate();
      }
      
      const perfStats = simulationEngine.getPerformanceStats();
      expect(perfStats).toHaveProperty('averageUpdateTime');
      expect(perfStats).toHaveProperty('totalUpdates');
      expect(perfStats).toHaveProperty('updatesPerSecond');
    });
  });

  describe('cleanup and memory management', () => {
    test('should cleanup resources on stop', () => {
      simulationEngine.start();
      
      // Add some data
      for (let i = 0; i < 5; i++) {
        simulationEngine.processUpdate();
      }
      
      simulationEngine.stop();
      
      expect(simulationEngine.currentConflict).toBeNull();
      expect(simulationEngine.isRunning()).toBe(false);
    });

    test('should prevent memory leaks with many conflicts', () => {
      const initialMemory = simulationEngine.getMemoryUsage().totalEstimatedMB;
      
      // Force multiple conflict cycles
      for (let i = 0; i < 10; i++) {
        simulationEngine.start();
        const conflict = simulationEngine.currentConflict;
        conflict.endConflict(0, 'territorial_control', 'Quick victory');
        simulationEngine.processUpdate();
        simulationEngine.stop();
      }
      
      const finalMemory = simulationEngine.getMemoryUsage().totalEstimatedMB;
      
      // Memory should not grow excessively (some growth is expected)
      expect(finalMemory).toBeLessThan(initialMemory + 10); // Max 10MB growth
    });

    test('should optimize data structures periodically', () => {
      const optimizeSpy = jest.spyOn(simulationEngine, 'optimizeDataStructures');
      
      simulationEngine.start();
      simulationEngine.optimizationInterval = 100; // Reduce interval for testing
      simulationEngine.lastOptimization = Date.now() - 200; // Force optimization
      
      simulationEngine.processUpdate();
      
      expect(optimizeSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle update errors gracefully', () => {
      simulationEngine.start();
      
      // Mock an error in conflict update
      jest.spyOn(simulationEngine.currentConflict, 'updateTerritoryControl')
        .mockImplementation(() => {
          throw new Error('Update failed');
        });
      
      expect(() => simulationEngine.processUpdate()).not.toThrow();
      expect(simulationEngine.isRunning()).toBe(true); // Should continue running
    });

    test('should emit error events', () => {
      const errorCallback = jest.fn();
      simulationEngine.on('error', errorCallback);
      
      simulationEngine.start();
      
      // Mock an error
      jest.spyOn(simulationEngine.currentConflict, 'updateTerritoryControl')
        .mockImplementation(() => {
          throw new Error('Test error');
        });
      
      simulationEngine.processUpdate();
      
      expect(errorCallback).toHaveBeenCalledWith({
        error: expect.any(Error),
        context: 'processUpdate'
      });
    });

    test('should handle invalid configuration gracefully', () => {
      expect(() => new SimulationEngine(countries, -1000)).toThrow();
      expect(() => new SimulationEngine(countries, 'invalid')).toThrow();
    });
  });

  describe('timer precision', () => {
    test('should calculate correct intervals for different speeds', () => {
      expect(simulationEngine.getCurrentInterval()).toBe(5000);
      
      simulationEngine.setSpeed(2);
      expect(simulationEngine.getCurrentInterval()).toBe(2500);
      
      simulationEngine.setSpeed(4);  
      expect(simulationEngine.getCurrentInterval()).toBe(1250);
    });

    test('should handle rapid speed changes', () => {
      simulationEngine.start();
      
      simulationEngine.setSpeed(2);
      simulationEngine.setSpeed(4);
      simulationEngine.setSpeed(1);
      
      expect(simulationEngine.speed).toBe(1);
      expect(simulationEngine.getCurrentInterval()).toBe(simulationEngine.updateInterval);
    });

    test('should maintain timer state across speed changes', () => {
      simulationEngine.start();
      expect(simulationEngine.isRunning()).toBe(true);
      
      simulationEngine.setSpeed(2);
      expect(simulationEngine.isRunning()).toBe(true);
      expect(simulationEngine.isPaused()).toBe(false);
    });
  });
});