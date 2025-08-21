/**
 * Real-time Simulation Engine
 * 
 * Orchestrates the entire conflict simulation system, coordinating:
 * - Country selection and conflict creation
 * - Real-time updates with configurable speed
 * - Event generation and application
 * - Prediction management and resolution
 * - Performance monitoring and memory management
 * - Event emission for UI integration
 * 
 * @class SimulationEngine
 */
class SimulationEngine {
  /**
   * Initialize simulation engine with countries and configuration
   * 
   * @param {Country[]} countries - Array of available countries
   * @param {number|Object} config - Update interval in ms or configuration object
   */
  constructor(countries, config = 5000) {
    if (!countries || countries.length < 2) {
      throw new Error('Need at least 2 countries for simulation');
    }

    // Handle both number (legacy) and object configuration
    if (typeof config === 'number') {
      this.updateInterval = config;
      this.autoAdvance = true;
      this.eventProbability = 0.15;
    } else if (typeof config === 'object') {
      this.updateInterval = config.updateInterval || 5000;
      this.autoAdvance = config.autoAdvance !== undefined ? config.autoAdvance : true;
      this.eventProbability = config.eventProbability || 0.15;
    } else {
      throw new Error('Configuration must be number or object');
    }

    if (this.updateInterval <= 0) {
      throw new Error('Update interval must be positive');
    }

    this.countries = countries;
    this.currentConflict = null;
    this.speed = 1;
    this.running = false;
    this.paused = false;
    this.timerId = null;

    // Statistics and monitoring
    this.startTime = null;
    this.totalConflicts = 0;
    this.conflictHistory = [];
    this.updateCount = 0;
    this.updateTimes = [];

    // Initialize sub-systems
    this.countrySelector = new (require('./country-selector'))(countries);
    this.eventGenerator = new (require('./events'))(this.eventProbability);
    this.predictionSystem = new (require('./prediction'))();

    // Event system for UI integration
    this.eventListeners = {};

    // Memory management
    this.lastOptimization = Date.now();
    this.optimizationInterval = 60000; // 1 minute
  }

  /**
   * Start the simulation engine
   */
  start() {
    if (this.running) {
      return; // Already running
    }

    this.running = true;
    this.paused = false;
    this.startTime = Date.now();

    // Create initial conflict
    this.createNewConflict();

    // Start update loop
    this.startUpdateLoop();

    this.emit('started', {
      conflict: this.currentConflict,
      timestamp: Date.now()
    });
  }

  /**
   * Stop the simulation engine
   */
  stop() {
    if (!this.running) {
      return; // Already stopped
    }

    this.running = false;
    this.paused = false;

    // Clear timer
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    // Archive current conflict
    if (this.currentConflict) {
      this.archiveConflict(this.currentConflict);
      this.currentConflict = null;
    }

    this.emit('stopped', {
      timestamp: Date.now()
    });
  }

  /**
   * Pause the simulation (keeps running state but stops updates)
   */
  pause() {
    if (!this.running || this.paused) {
      return;
    }

    this.paused = true;
    
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.emit('paused', {
      timestamp: Date.now()
    });
  }

  /**
   * Resume paused simulation
   */
  resume() {
    if (!this.running || !this.paused) {
      return;
    }

    this.paused = false;
    this.startUpdateLoop();

    this.emit('resumed', {
      timestamp: Date.now()
    });
  }

  /**
   * Set simulation speed multiplier
   * 
   * @param {number} speed - Speed multiplier (1x, 2x, 4x, etc.)
   */
  setSpeed(speed) {
    if (typeof speed !== 'number' || speed <= 0) {
      throw new Error('Speed must be positive number');
    }

    if (speed > 8) {
      throw new Error('Maximum speed is 8x');
    }

    const oldSpeed = this.speed;
    this.speed = speed;

    // Update timer if running
    if (this.running && !this.paused) {
      this.pause();
      this.resume(); // Restart with new interval
    }

    this.emit('speed_changed', {
      oldSpeed,
      newSpeed: speed,
      currentInterval: this.getCurrentInterval()
    });
  }

  /**
   * Check if simulation is currently running
   * 
   * @returns {boolean} Running state
   */
  isRunning() {
    return this.running;
  }

  /**
   * Check if simulation is currently paused
   * 
   * @returns {boolean} Paused state
   */
  isPaused() {
    return this.paused;
  }

  /**
   * Get current update interval accounting for speed multiplier
   * 
   * @returns {number} Current interval in milliseconds
   */
  getCurrentInterval() {
    return Math.round(this.updateInterval / this.speed);
  }

  /**
   * Submit a prediction for the current conflict
   * 
   * @param {number} winner - Predicted winner (0 or 1)
   * @param {number} confidence - Confidence level (1-10)
   * @returns {Object} Prediction result
   */
  submitPrediction(winner, confidence) {
    if (!this.currentConflict) {
      return { success: false, error: 'No active conflict to predict' };
    }

    const [countryA, countryB] = this.currentConflict.countries;
    return this.predictionSystem.submitPrediction(countryA, countryB, winner, confidence);
  }

  /**
   * Process a single simulation update
   */
  processUpdate() {
    if (!this.running || this.paused || !this.currentConflict) {
      return;
    }

    const updateStartTime = Date.now();

    try {
      const conflict = this.currentConflict;

      // Update conflict duration
      conflict.duration++;

      // Update territory control (battle processing)
      conflict.updateTerritoryControl();

      // Generate and apply random events
      this.processRandomEvents(conflict);

      // Update active events
      this.eventGenerator.updateActiveEvents(conflict);

      // Check victory conditions
      const victory = conflict.checkVictoryConditions();
      if (victory.hasWinner) {
        this.endCurrentConflict(victory);
      }

      // Emit update event
      this.emit('update', {
        conflict: conflict,
        duration: conflict.duration,
        stats: conflict.getStats()
      });

      // Update performance metrics
      this.updateCount++;
      const updateTime = Date.now() - updateStartTime;
      this.updateTimes.push(updateTime);

      // Keep only recent update times for performance calculation
      if (this.updateTimes.length > 100) {
        this.updateTimes.shift();
      }

      // Periodic memory optimization
      if (Date.now() - this.lastOptimization > this.optimizationInterval) {
        this.optimizeDataStructures();
        this.lastOptimization = Date.now();
      }

    } catch (error) {
      this.emit('error', {
        error: error,
        context: 'processUpdate'
      });
      
      // Continue running despite errors
      console.warn('Simulation update error:', error);
    }
  }

  /**
   * Process random event generation and application
   * 
   * @private
   * @param {Conflict} conflict - Current conflict
   */
  processRandomEvents(conflict) {
    const event = this.eventGenerator.generateRandomEvent(conflict);
    if (event) {
      this.eventGenerator.applyEventEffects(conflict, event);
      
      this.emit('random_event', {
        event: event,
        conflict: conflict
      });
    }
  }

  /**
   * End current conflict and handle predictions
   * 
   * @private
   * @param {Object} victory - Victory result object
   */
  endCurrentConflict(victory) {
    const conflict = this.currentConflict;
    
    // End the conflict
    conflict.endConflict(victory.winner, victory.condition, victory.description);

    // Resolve any active predictions
    this.resolveActivePredictions(conflict, victory);

    this.emit('conflict_ended', {
      conflict: conflict,
      victory: victory,
      duration: conflict.duration
    });

    // Archive completed conflict
    this.archiveConflict(conflict);

    // Auto-advance to next conflict if enabled
    if (this.autoAdvance && this.running) {
      setTimeout(() => {
        this.createNewConflict();
      }, 100); // Small delay to allow event processing
    } else {
      this.currentConflict = null;
    }
  }

  /**
   * Resolve active predictions for ended conflict
   * 
   * @private
   * @param {Conflict} conflict - Ended conflict
   * @param {Object} victory - Victory details
   */
  resolveActivePredictions(conflict, victory) {
    const [countryA, countryB] = conflict.countries;
    const activePrediction = this.predictionSystem.getCurrentPrediction(countryA, countryB);
    
    if (activePrediction) {
      const result = this.predictionSystem.resolvePrediction(
        activePrediction.id,
        victory.winner,
        victory.condition
      );

      this.emit('prediction_resolved', {
        predictionResult: result,
        conflict: conflict
      });
    }
  }

  /**
   * Create a new conflict between selected countries
   * 
   * @private
   */
  createNewConflict() {
    const [countryA, countryB] = this.countrySelector.selectRandomPair();
    this.currentConflict = new (require('./conflict'))(countryA, countryB);
    this.totalConflicts++;

    this.emit('conflict_created', {
      conflict: this.currentConflict,
      countries: [countryA, countryB]
    });
  }

  /**
   * Archive completed conflict for history
   * 
   * @private
   * @param {Conflict} conflict - Completed conflict
   */
  archiveConflict(conflict) {
    const summary = {
      id: `conflict_${this.totalConflicts}`,
      countries: conflict.countries.map(c => ({ name: c.name, code: c.code })),
      winner: conflict.winner,
      victoryCondition: conflict.victoryCondition,
      duration: conflict.duration,
      finalStats: conflict.getStats(),
      endTime: Date.now()
    };

    this.conflictHistory.push(summary);

    // Limit history size to prevent memory growth
    if (this.conflictHistory.length > 100) {
      this.conflictHistory.shift();
    }
  }

  /**
   * Start the update timer loop
   * 
   * @private
   */
  startUpdateLoop() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.timerId = setInterval(() => {
      this.processUpdate();
    }, this.getCurrentInterval());
  }

  /**
   * Get comprehensive simulation statistics
   * 
   * @returns {Object} Simulation statistics
   */
  getSimulationStats() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;
    
    return {
      uptime: uptime,
      totalConflicts: this.totalConflicts,
      currentConflict: this.currentConflict ? {
        duration: this.currentConflict.duration,
        countries: this.currentConflict.countries.map(c => c.name),
        stats: this.currentConflict.getStats()
      } : null,
      predictionStats: this.predictionSystem.getStatistics(),
      speed: this.speed,
      running: this.running,
      paused: this.paused
    };
  }

  /**
   * Get memory usage statistics
   * 
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    const conflictHistorySize = this.conflictHistory.length * 0.5; // ~0.5KB per summary
    const predictionsSize = this.predictionSystem.predictions.length * 0.2; // ~0.2KB per prediction
    const activeEventsSize = this.eventGenerator.activeEvents.length * 0.1; // ~0.1KB per event
    
    return {
      conflictHistory: this.conflictHistory.length,
      predictions: this.predictionSystem.predictions.length,
      activeEvents: this.eventGenerator.activeEvents.length,
      totalEstimatedMB: Math.round((conflictHistorySize + predictionsSize + activeEventsSize) / 1024 * 100) / 100
    };
  }

  /**
   * Get performance statistics
   * 
   * @returns {Object} Performance metrics
   */
  getPerformanceStats() {
    const averageUpdateTime = this.updateTimes.length > 0 
      ? this.updateTimes.reduce((sum, time) => sum + time, 0) / this.updateTimes.length 
      : 0;

    const uptime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const updatesPerSecond = uptime > 0 ? this.updateCount / uptime : 0;

    return {
      averageUpdateTime: Math.round(averageUpdateTime * 100) / 100,
      totalUpdates: this.updateCount,
      updatesPerSecond: Math.round(updatesPerSecond * 100) / 100
    };
  }

  /**
   * Optimize data structures to prevent memory leaks
   * 
   * @private
   */
  optimizeDataStructures() {
    // Limit conflict history
    if (this.conflictHistory.length > 50) {
      this.conflictHistory = this.conflictHistory.slice(-50);
    }

    // Clean up old prediction data (keep last 1000)
    if (this.predictionSystem.predictions.length > 1000) {
      const sorted = this.predictionSystem.predictions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 1000);
      this.predictionSystem.predictions = sorted;
      this.predictionSystem.saveToStorage();
    }

    // Limit update time history
    if (this.updateTimes.length > 50) {
      this.updateTimes = this.updateTimes.slice(-50);
    }
  }

  /**
   * Add event listener
   * 
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   * 
   * @param {string} event - Event name  
   * @param {Function} callback - Event callback to remove
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event]
        .filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to all listeners
   * 
   * @private
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimulationEngine;
}