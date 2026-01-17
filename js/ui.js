/**
 * Browser UI Integration Layer
 * 
 * This file provides a browser-compatible interface for the UIController class,
 * handling the initialization and setup for manual testing in the browser.
 */

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  // Make UIController available globally for browser testing
  window.UIController = UIController;
  
  // Simple initialization function for manual testing
  window.initializeConflictSimulation = function() {
    try {
      // Sample countries for testing
      const testCountries = [
        new Country({
          name: 'United States',
          code: 'US',
          military: {
            expenditure: 778000000000,  // $778 billion
            personnel: 1400000,
            nuclear: true
          },
          economy: {
            gdp: 21430000000000,  // $21.43 trillion
            gdpPerCapita: 65000
          },
          geography: {
            coordinates: [39.8283, -98.5795],
            capital: [38.9072, -77.0369],
            area: 9833517,
            borders: ['CA', 'MX'],
            population: 331000000
          },
          alliances: ['NATO'],
          resources: ['oil', 'coal', 'natural_gas']
        }),
        new Country({
          name: 'China',
          code: 'CN',
          military: {
            expenditure: 261000000000,  // $261 billion
            personnel: 2035000,
            nuclear: true
          },
          economy: {
            gdp: 14342000000000,  // $14.34 trillion
            gdpPerCapita: 10500
          },
          geography: {
            coordinates: [35.8617, 104.1954],
            capital: [39.9042, 116.4074],
            area: 9596961,
            borders: ['RU', 'IN', 'KP'],
            population: 1439000000
          },
          alliances: ['SCO'],
          resources: ['coal', 'rare_earth', 'iron']
        }),
        new Country({
          name: 'Russia',
          code: 'RU',
          military: {
            expenditure: 65100000000,  // $65.1 billion
            personnel: 1014000,
            nuclear: true
          },
          economy: {
            gdp: 1483000000000,  // $1.48 trillion
            gdpPerCapita: 10200
          },
          geography: {
            coordinates: [61.5240, 105.3188],
            capital: [55.7558, 37.6176],
            area: 17098242,
            borders: ['CN', 'KP', 'FI'],
            population: 146000000
          },
          alliances: ['CSTO'],
          resources: ['oil', 'natural_gas', 'minerals']
        }),
        new Country({
          name: 'India',
          code: 'IN',
          military: {
            expenditure: 72900000000,  // $72.9 billion
            personnel: 1455550,
            nuclear: true
          },
          economy: {
            gdp: 2875000000000,  // $2.88 trillion
            gdpPerCapita: 2100
          },
          geography: {
            coordinates: [20.5937, 78.9629],
            capital: [28.6139, 77.2090],
            area: 3287263,
            borders: ['CN', 'PK', 'BD'],
            population: 1380000000
          },
          alliances: ['QUAD'],
          resources: ['coal', 'iron', 'manganese']
        }),
        new Country({
          name: 'United Kingdom',
          code: 'GB',
          military: {
            expenditure: 59200000000,  // $59.2 billion
            personnel: 153290,
            nuclear: true
          },
          economy: {
            gdp: 2829000000000,  // $2.83 trillion
            gdpPerCapita: 42330
          },
          geography: {
            coordinates: [55.3781, -3.4360],
            capital: [51.5074, -0.1278],
            area: 243610,
            borders: ['IE'],
            population: 67000000
          },
          alliances: ['NATO'],
          resources: ['oil', 'natural_gas', 'coal']
        })
      ];

      // Initialize simulation engine
      const simulationEngine = new SimulationEngine(testCountries);
      
      // Initialize UI controller
      const uiController = new UIController(simulationEngine);
      
      // Make available globally for debugging
      window.simulationEngine = simulationEngine;
      window.uiController = uiController;
      
      console.log('Conflict Simulation initialized successfully!');
      console.log('Available commands:');
      console.log('- simulationEngine.start() - Start simulation');
      console.log('- simulationEngine.stop() - Stop simulation');
      console.log('- simulationEngine.setSpeed(2) - Change speed (1-8)');
      console.log('- simulationEngine.submitPrediction({winner: 0, confidence: 8})');
      
      return { simulationEngine, uiController };
      
    } catch (error) {
      console.error('Failed to initialize conflict simulation:', error);
      return null;
    }
  };
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeConflictSimulation);
  } else {
    // DOM is already ready
    window.initializeConflictSimulation();
  }
}