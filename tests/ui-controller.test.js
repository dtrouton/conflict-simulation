/**
 * @jest-environment jsdom
 */

const UIController = require('../js/ui-controller');
const _SimulationEngine = require('../js/simulation');
const Country = require('../js/country');
const Conflict = require('../js/conflict');

// Mock data for testing
const mockCountryA = new Country({
  name: "United States",
  code: "US",
  military: { personnel: 1400000, expenditure: 778000000000, nuclear: true },
  economy: { gdp: 21430000000000, gdpPerCapita: 65280 },
  geography: { area: 9833517, population: 331002651, capital: [38.9072, -77.0369] },
  alliances: ["NATO", "AUKUS"],
  resources: ["oil", "coal", "agriculture"]
});

const mockCountryB = new Country({
  name: "China",
  code: "CN", 
  military: { personnel: 2035000, expenditure: 261000000000, nuclear: true },
  economy: { gdp: 14342000000000, gdpPerCapita: 10261 },
  geography: { area: 9596960, population: 1439323776, capital: [39.9042, 116.4074] },
  alliances: ["SCO"],
  resources: ["coal", "rare_earth", "agriculture"]
});

// Set up DOM
document.body.innerHTML = `
<div id="app">
  <header class="header">
    <h1>CONFLICT SIMULATION</h1>
    <div class="speed-controls">
      <label>Speed: </label>
      <button id="speed-1x" class="speed-btn active">1x</button>
      <button id="speed-2x" class="speed-btn">2x</button>
      <button id="speed-4x" class="speed-btn">4x</button>
    </div>
  </header>

  <div class="conflict-header">
    <div id="conflict-title" class="conflict-title">Loading...</div>
    <div id="conflict-duration" class="duration">Duration: 0:00</div>
  </div>

  <div class="countries-container">
    <div id="country-a" class="country-card">
      <div class="country-name">Country A</div>
      <div class="territory-bar">
        <div class="territory-fill" style="width: 50%"></div>
      </div>
      <div class="territory-percent">50%</div>
    </div>
    
    <div id="country-b" class="country-card">
      <div class="country-name">Country B</div>
      <div class="territory-bar">
        <div class="territory-fill" style="width: 50%"></div>
      </div>
      <div class="territory-percent">50%</div>
    </div>
  </div>

  <div class="prediction-panel">
    <h3>PREDICTION PANEL</h3>
    <div class="prediction-controls">
      <label>Winner: </label>
      <select id="prediction-winner">
        <option value="">Select winner...</option>
      </select>
      <label>Confidence: </label>
      <input type="range" id="confidence-slider" min="1" max="10" value="5">
      <span id="confidence-value">5</span>
      <button id="submit-prediction">Submit Prediction</button>
    </div>
  </div>

  <div class="updates-feed">
    <h3>LIVE UPDATES FEED</h3>
    <div id="updates-list" class="updates-list"></div>
  </div>

  <div class="statistics">
    <h3>STATISTICS</h3>
    <div id="conflict-stats" class="stats-grid"></div>
  </div>

  <div class="user-predictions">
    <h3>YOUR PREDICTIONS</h3>
    <div id="prediction-stats">
      <span>Accuracy: <span id="accuracy">0%</span> (<span id="correct">0</span>/<span id="total">0</span>)</span>
      <span>Current Streak: <span id="streak">0</span></span>
    </div>
  </div>

  <div id="mobile-menu" class="mobile-menu">
    <button id="mobile-menu-toggle">☰</button>
    <div class="mobile-menu-content">
      <div class="mobile-speed-controls">
        <button class="mobile-speed-btn" data-speed="1">1x</button>
        <button class="mobile-speed-btn" data-speed="2">2x</button>
        <button class="mobile-speed-btn" data-speed="4">4x</button>
      </div>
    </div>
  </div>
</div>
`;

describe('UIController', () => {
  let uiController;
  let mockSimulationEngine;

  beforeEach(() => {
    // Reset DOM elements
    const conflictTitle = document.getElementById('conflict-title');
    const conflictDuration = document.getElementById('conflict-duration');
    
    if (conflictTitle) conflictTitle.textContent = 'Loading...';
    if (conflictDuration) conflictDuration.textContent = 'Duration: 0:00';
    
    // Clean up the updates list
    const updatesList = document.getElementById('updates-list');
    if (updatesList) {
      updatesList.innerHTML = '';
    }
    
    // Mock simulation engine
    mockSimulationEngine = {
      on: jest.fn(),
      off: jest.fn(),
      setSpeed: jest.fn(),
      submitPrediction: jest.fn(),
      getCurrentInterval: jest.fn().mockReturnValue(5000),
      getSimulationStats: jest.fn().mockReturnValue({
        currentConflict: null,
        speed: 1,
        running: false
      }),
      isRunning: jest.fn().mockReturnValue(false),
      isPaused: jest.fn().mockReturnValue(false)
    };

    uiController = new UIController(mockSimulationEngine);
  });

  afterEach(() => {
    if (uiController) {
      uiController.destroy();
    }
  });

  describe('constructor', () => {
    test('should initialize with simulation engine', () => {
      expect(uiController.simulationEngine).toBe(mockSimulationEngine);
      expect(mockSimulationEngine.on).toHaveBeenCalledWith('conflict_created', expect.any(Function));
      expect(mockSimulationEngine.on).toHaveBeenCalledWith('update', expect.any(Function));
      expect(mockSimulationEngine.on).toHaveBeenCalledWith('conflict_ended', expect.any(Function));
    });

    test('should set up DOM element references', () => {
      expect(uiController.elements.conflictTitle).toBe(document.getElementById('conflict-title'));
      expect(uiController.elements.conflictDuration).toBe(document.getElementById('conflict-duration'));
      expect(uiController.elements.countryA).toBe(document.getElementById('country-a'));
      expect(uiController.elements.countryB).toBe(document.getElementById('country-b'));
    });

    test('should initialize event listeners', () => {
      expect(uiController.eventListeners).toBeDefined();
      expect(uiController.touchHandler).toBeDefined();
      expect(uiController.resizeHandler).toBeDefined();
    });

    test('should initialize mobile responsive state', () => {
      expect(uiController.isMobile).toBe(false);
      expect(uiController.mobileMenuOpen).toBe(false);
    });
  });

  describe('renderCountryCards', () => {
    test('should render country cards with basic information', () => {
      const conflict = new Conflict(mockCountryA, mockCountryB);
      
      uiController.renderCountryCards(conflict);
      
      expect(document.querySelector('#country-a .country-name').textContent).toBe('United States');
      expect(document.querySelector('#country-b .country-name').textContent).toBe('China');
    });

    test('should update territory control bars', () => {
      const conflict = new Conflict(mockCountryA, mockCountryB);
      conflict.territoryControl = [60, 40];
      
      uiController.renderCountryCards(conflict);
      
      const fillA = document.querySelector('#country-a .territory-fill');
      const fillB = document.querySelector('#country-b .territory-fill');
      
      expect(fillA.style.width).toBe('60%');
      expect(fillB.style.width).toBe('40%');
    });

    test('should update territory percentages', () => {
      const conflict = new Conflict(mockCountryA, mockCountryB);
      conflict.territoryControl = [75, 25];
      
      uiController.renderCountryCards(conflict);
      
      expect(document.querySelector('#country-a .territory-percent').textContent).toBe('75%');
      expect(document.querySelector('#country-b .territory-percent').textContent).toBe('25%');
    });

    test('should add country information on hover', () => {
      const conflict = new Conflict(mockCountryA, mockCountryB);
      
      uiController.renderCountryCards(conflict);
      
      const countryCardA = document.getElementById('country-a');
      expect(countryCardA.title).toContain('Population: 331,002,651');
      expect(countryCardA.title).toContain('Military: 1,400,000');
    });

    test('should handle null conflict gracefully', () => {
      expect(() => {
        uiController.renderCountryCards(null);
      }).not.toThrow();
      
      expect(document.querySelector('#country-a .country-name').textContent).toBe('Loading...');
      expect(document.querySelector('#country-b .country-name').textContent).toBe('Loading...');
    });
  });

  describe('updateProgressBars', () => {
    test('should update territory control progress bars with animation', () => {
      const territoryControl = [65, 35];
      
      uiController.updateProgressBars(territoryControl);
      
      const fillA = document.querySelector('#country-a .territory-fill');
      const fillB = document.querySelector('#country-b .territory-fill');
      
      expect(fillA.style.width).toBe('65%');
      expect(fillB.style.width).toBe('35%');
      
      expect(document.querySelector('#country-a .territory-percent').textContent).toBe('65%');
      expect(document.querySelector('#country-b .territory-percent').textContent).toBe('35%');
    });

    test('should add visual indicators for significant changes', () => {
      // Set initial state
      uiController.updateProgressBars([50, 50]);
      
      // Make significant change
      uiController.updateProgressBars([75, 25]);
      
      const cardA = document.getElementById('country-a');
      expect(cardA.classList.contains('gaining')).toBe(true);
      
      // Indicator should be removed after animation
      setTimeout(() => {
        expect(cardA.classList.contains('gaining')).toBe(false);
      }, 600);
    });

    test('should handle edge cases', () => {
      expect(() => {
        uiController.updateProgressBars([100, 0]);
        uiController.updateProgressBars([0, 100]);
        uiController.updateProgressBars([0, 0]);
      }).not.toThrow();
    });
  });

  describe('addUpdateToFeed', () => {
    test('should add update to feed with timestamp', () => {
      const updateText = 'Territory control shifted: US gains 5%';
      
      uiController.addUpdateToFeed(updateText);
      
      const updatesList = document.getElementById('updates-list');
      const lastUpdate = updatesList.lastElementChild;
      
      expect(lastUpdate.classList.contains('update-item')).toBe(true);
      expect(lastUpdate.textContent).toContain(updateText);
      expect(lastUpdate.querySelector('.update-time')).toBeTruthy();
    });

    test('should limit feed to maximum items', () => {
      // Add more than max items
      for (let i = 0; i < 25; i++) {
        uiController.addUpdateToFeed(`Update ${i}`);
      }
      
      const updatesList = document.getElementById('updates-list');
      expect(updatesList.children.length).toBeLessThanOrEqual(20); // Default max
    });

    test('should scroll to bottom when adding updates', () => {
      const updatesList = document.getElementById('updates-list');
      const scrollSpy = jest.spyOn(updatesList, 'scrollTop', 'set');
      
      uiController.addUpdateToFeed('New update');
      
      // Should scroll to bottom
      expect(scrollSpy).toHaveBeenCalled();
    });

    test('should format different types of updates', () => {
      uiController.addUpdateToFeed('Territory update', 'territory');
      uiController.addUpdateToFeed('Random event occurred', 'event');
      uiController.addUpdateToFeed('Conflict ended', 'conflict');
      
      const updates = document.querySelectorAll('.update-item');
      // Items are added to the end, so last added is last in list
      expect(updates[0].classList.contains('territory-update')).toBe(true);
      expect(updates[1].classList.contains('event-update')).toBe(true);  
      expect(updates[2].classList.contains('conflict-update')).toBe(true);
    });
  });

  describe('handleSpeedControls', () => {
    test('should handle speed button clicks', () => {
      const speed2Button = document.getElementById('speed-2x');
      
      speed2Button.click();
      
      expect(mockSimulationEngine.setSpeed).toHaveBeenCalledWith(2);
      expect(speed2Button.classList.contains('active')).toBe(true);
      expect(document.getElementById('speed-1x').classList.contains('active')).toBe(false);
    });

    test('should handle mobile speed controls', () => {
      const mobileSpeedBtn = document.querySelector('[data-speed="4"]');
      
      mobileSpeedBtn.click();
      
      expect(mockSimulationEngine.setSpeed).toHaveBeenCalledWith(4);
    });

    test('should update speed display', () => {
      uiController.updateSpeedDisplay(2);
      
      expect(document.getElementById('speed-2x').classList.contains('active')).toBe(true);
      expect(document.getElementById('speed-1x').classList.contains('active')).toBe(false);
      expect(document.getElementById('speed-4x').classList.contains('active')).toBe(false);
    });

    test('should handle invalid speed values gracefully', () => {
      expect(() => {
        uiController.updateSpeedDisplay(10); // Invalid speed
        uiController.updateSpeedDisplay(-1); // Invalid speed
        uiController.updateSpeedDisplay(null); // Invalid speed
      }).not.toThrow();
    });
  });

  describe('mobile support', () => {
    test('should detect mobile viewport', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });
      
      uiController.adaptToViewport();
      
      expect(uiController.isMobile).toBe(true);
    });

    test('should detect desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      
      uiController.adaptToViewport();
      
      expect(uiController.isMobile).toBe(false);
    });

    test('should toggle mobile menu', () => {
      const menuToggle = document.getElementById('mobile-menu-toggle');
      
      menuToggle.click();
      
      expect(uiController.mobileMenuOpen).toBe(true);
      expect(document.getElementById('mobile-menu').classList.contains('open')).toBe(true);
    });

    test('should initialize touch gestures', () => {
      const touchHandler = uiController.touchHandler;
      expect(touchHandler).toBeDefined();
      
      // Should have touch event listeners
      const hasListeners = touchHandler.startX !== undefined && 
                           touchHandler.startY !== undefined;
      expect(hasListeners).toBe(true);
    });

    test('should handle swipe gestures', () => {
      const countriesContainer = document.querySelector('.countries-container');
      
      // Simulate swipe left
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 50, clientY: 100 }]
      });
      
      countriesContainer.dispatchEvent(touchStart);
      countriesContainer.dispatchEvent(touchEnd);
      
      // Should handle swipe (implementation depends on requirements)
      expect(uiController.touchHandler.lastSwipe).toBeDefined();
    });
  });

  describe('accessibility', () => {
    test('should have proper ARIA labels', () => {
      const conflict = new Conflict(mockCountryA, mockCountryB);
      uiController.renderCountryCards(conflict);
      
      const territoryBarA = document.querySelector('#country-a .territory-bar');
      expect(territoryBarA.getAttribute('role')).toBe('progressbar');
      expect(territoryBarA.getAttribute('aria-label')).toContain('Territory control');
    });

    test('should support keyboard navigation', () => {
      const speedButtons = document.querySelectorAll('.speed-btn');
      
      speedButtons.forEach(button => {
        expect(button.tabIndex).toBeGreaterThanOrEqual(0);
      });
    });

    test('should have semantic HTML structure', () => {
      expect(document.querySelector('header')).toBeTruthy();
      expect(document.querySelector('main') || document.querySelector('#app')).toBeTruthy();
      
      // Check for proper heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3');
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should provide screen reader friendly content', () => {
      uiController.addUpdateToFeed('Territory update');
      
      const updatesList = document.getElementById('updates-list');
      expect(updatesList.getAttribute('aria-live')).toBe('polite');
      expect(updatesList.getAttribute('aria-label')).toBe('Live updates feed');
    });
  });

  describe('responsive design', () => {
    test('should handle window resize', async () => {
      // Mock resize event
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });
      
      window.dispatchEvent(new Event('resize'));
      
      // Wait for the debounced resize handler
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(uiController.isMobile).toBe(true);
    });

    test('should adjust layout for mobile', () => {
      uiController.isMobile = true;
      uiController.adaptToViewport();
      
      const app = document.getElementById('app');
      expect(app.classList.contains('mobile-layout')).toBe(true);
    });

    test('should adjust layout for desktop', () => {
      // Mock desktop width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      
      uiController.adaptToViewport();
      
      const app = document.getElementById('app');
      expect(app.classList.contains('mobile-layout')).toBe(false);
    });

    test('should handle orientation changes', async () => {
      const orientationSpy = jest.spyOn(uiController, 'handleOrientationChange');
      
      // Mock orientation change
      window.dispatchEvent(new Event('orientationchange'));
      
      // Wait for the async timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(orientationSpy).toHaveBeenCalled();
    });
  });

  describe('prediction interface', () => {
    test('should populate prediction dropdown', () => {
      const conflict = new Conflict(mockCountryA, mockCountryB);
      
      uiController.updatePredictionInterface(conflict);
      
      const dropdown = document.getElementById('prediction-winner');
      expect(dropdown.children.length).toBe(3); // Default + 2 countries
      expect(dropdown.children[1].textContent).toBe('United States');
      expect(dropdown.children[2].textContent).toBe('China');
    });

    test('should handle confidence slider', () => {
      const slider = document.getElementById('confidence-slider');
      const valueDisplay = document.getElementById('confidence-value');
      
      slider.value = 8;
      slider.dispatchEvent(new Event('input'));
      
      expect(valueDisplay.textContent).toBe('8');
    });

    test('should submit predictions', () => {
      mockSimulationEngine.submitPrediction.mockReturnValue({ success: true });
      
      const conflict = new Conflict(mockCountryA, mockCountryB);
      uiController.updatePredictionInterface(conflict);
      
      const dropdown = document.getElementById('prediction-winner');
      const slider = document.getElementById('confidence-slider');
      const submitBtn = document.getElementById('submit-prediction');
      
      dropdown.value = '0';
      slider.value = '7';
      
      submitBtn.click();
      
      expect(mockSimulationEngine.submitPrediction).toHaveBeenCalledWith(0, 7);
    });

    test('should disable prediction interface when no active conflict', () => {
      uiController.updatePredictionInterface(null);
      
      const dropdown = document.getElementById('prediction-winner');
      const submitBtn = document.getElementById('submit-prediction');
      
      expect(dropdown.disabled).toBe(true);
      expect(submitBtn.disabled).toBe(true);
    });
  });

  describe('statistics display', () => {
    test('should update conflict statistics', () => {
      const stats = {
        territoryControl: [60, 40],
        casualties: [1200, 800],
        economicImpact: [-0.05, -0.03],
        duration: 15
      };
      
      uiController.updateStatistics(stats);
      
      const statsGrid = document.getElementById('conflict-stats');
      expect(statsGrid.children.length).toBeGreaterThan(0);
      
      const casualtiesItem = Array.from(statsGrid.children)
        .find(item => item.textContent.includes('Casualties'));
      expect(casualtiesItem).toBeTruthy();
    });

    test('should update prediction statistics', () => {
      const predictionStats = {
        accuracy: 75,
        correctPredictions: 15,
        totalPredictions: 20,
        currentStreak: 5
      };
      
      uiController.updatePredictionStats(predictionStats);
      
      expect(document.getElementById('accuracy').textContent).toBe('75%');
      expect(document.getElementById('correct').textContent).toBe('15');
      expect(document.getElementById('total').textContent).toBe('20');
      expect(document.getElementById('streak').textContent).toBe('5');
    });

    test('should format statistics nicely', () => {
      const stats = {
        economicImpact: [-0.056789, -0.023456]
      };
      
      uiController.updateStatistics(stats);
      
      const statsGrid = document.getElementById('conflict-stats');
      const economicItem = Array.from(statsGrid.children)
        .find(item => item.textContent.includes('Economic'));
      
      // Should format percentages nicely
      expect(economicItem.textContent).toContain('-5.7%');
    });
  });

  describe('conflict timeline', () => {
    test('should update conflict title and duration', () => {
      const conflict = new Conflict(mockCountryA, mockCountryB);
      conflict.duration = 25;
      
      uiController.updateConflictHeader(conflict);
      
      expect(document.getElementById('conflict-title').textContent).toBe('United States vs China');
      expect(document.getElementById('conflict-duration').textContent).toContain('25');
    });

    test('should format duration properly', () => {
      const conflict = new Conflict(mockCountryA, mockCountryB);
      conflict.duration = 125;
      
      uiController.updateConflictHeader(conflict);
      
      const durationText = document.getElementById('conflict-duration').textContent;
      expect(durationText).toMatch(/\d+:\d{2}/); // Should be in MM:SS format
    });

    test('should handle no active conflict', () => {
      uiController.updateConflictHeader(null);
      
      expect(document.getElementById('conflict-title').textContent).toBe('No Active Conflict');
      expect(document.getElementById('conflict-duration').textContent).toBe('Duration: --:--');
    });
  });

  describe('error handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      // Remove a required element
      document.getElementById('conflict-title').remove();
      
      expect(() => {
        uiController.updateConflictHeader(new Conflict(mockCountryA, mockCountryB));
      }).not.toThrow();
    });

    test('should handle invalid data gracefully', () => {
      expect(() => {
        uiController.updateProgressBars([NaN, undefined]);
        uiController.updateStatistics({ invalid: 'data' });
        uiController.addUpdateToFeed(null);
      }).not.toThrow();
    });

    test('should log errors appropriately', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create a mock element that will throw an error
      const mockElement = {
        innerHTML: '',
        appendChild: () => {
          throw new Error('Mock DOM error');
        }
      };
      
      // Replace the element temporarily
      const originalElement = uiController.elements.conflictStats;
      uiController.elements.conflictStats = mockElement;
      
      // This should trigger the error logging in updateStatistics
      uiController.updateStatistics({ territoryControl: [60, 40] });
      
      // Restore element
      uiController.elements.conflictStats = originalElement;
      
      expect(consoleSpy).toHaveBeenCalledWith('Error updating statistics:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    test('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      uiController.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(mockSimulationEngine.off).toHaveBeenCalled();
    });

    test('should clear timers on destroy', () => {
      uiController.animationTimer = setTimeout(() => {}, 1000);
      
      uiController.destroy();
      
      // Timer should be cleared (can't directly test, but ensure no errors)
      expect(() => uiController.destroy()).not.toThrow();
    });
  });
});