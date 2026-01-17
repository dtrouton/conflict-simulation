/**
 * UI Controller & Responsive Design System
 * 
 * Manages the user interface with responsive design, mobile support, and
 * comprehensive interaction handling for the conflict simulation system.
 * 
 * Features:
 * - Responsive design with mobile-first approach
 * - Touch gesture support for mobile devices
 * - Real-time UI updates synchronized with simulation engine
 * - Accessibility compliance with ARIA labels and keyboard navigation
 * - Performance-optimized DOM manipulation with minimal reflows
 * 
 * @class UIController
 */
class UIController {
  /**
   * Initialize UI controller with simulation engine integration
   * 
   * @param {SimulationEngine} simulationEngine - The simulation engine instance
   */
  constructor(simulationEngine) {
    if (!simulationEngine) {
      throw new Error('SimulationEngine is required for UIController');
    }

    this.simulationEngine = simulationEngine;
    this.elements = {};
    this.eventListeners = [];
    this.touchHandler = {};
    this.resizeHandler = null;
    
    // Mobile responsiveness state
    this.isMobile = false;
    this.mobileMenuOpen = false;
    this.mobileBreakpoint = 768;
    
    // Performance optimization
    this.animationTimer = null;
    this.updateQueue = [];
    this.maxFeedItems = 20;
    
    // Initialize UI
    this.initializeElements();
    this.initializeEventListeners();
    this.initializeSimulationListeners();
    this.initializeTouchGestures();
    this.initializeAccessibility();
    this.adaptToViewport();
  }

  /**
   * Initialize DOM element references
   * 
   * @private
   */
  initializeElements() {
    this.elements = {
      // Main containers
      app: document.getElementById('app'),
      
      // Header elements
      conflictTitle: document.getElementById('conflict-title'),
      conflictDuration: document.getElementById('conflict-duration'),
      
      // Country cards
      countryA: document.getElementById('country-a'),
      countryB: document.getElementById('country-b'),
      countriesContainer: document.querySelector('.countries-container'),
      
      // Speed controls
      speedButtons: document.querySelectorAll('.speed-btn'),
      mobileSpeedButtons: document.querySelectorAll('.mobile-speed-btn'),
      
      // Prediction interface
      predictionWinner: document.getElementById('prediction-winner'),
      confidenceSlider: document.getElementById('confidence-slider'),
      confidenceValue: document.getElementById('confidence-value'),
      submitPrediction: document.getElementById('submit-prediction'),

      // Mobile prediction interface
      mobilePredictionWinner: document.getElementById('mobile-prediction-winner'),
      mobileSubmitPrediction: document.getElementById('mobile-submit-prediction'),
      
      // Updates feed
      updatesList: document.getElementById('updates-list'),
      
      // Statistics
      conflictStats: document.getElementById('conflict-stats'),
      accuracy: document.getElementById('accuracy'),
      correct: document.getElementById('correct'),
      total: document.getElementById('total'),
      streak: document.getElementById('streak'),
      
      // Mobile menu
      mobileMenu: document.getElementById('mobile-menu'),
      mobileMenuToggle: document.getElementById('mobile-menu-toggle')
    };

    // Validate critical elements
    const criticalElements = ['app', 'conflictTitle', 'countryA', 'countryB'];
    criticalElements.forEach(key => {
      if (!this.elements[key]) {
        console.warn(`Critical UI element not found: ${key}`);
      }
    });
  }

  /**
   * Initialize event listeners for user interactions
   * 
   * @private
   */
  initializeEventListeners() {
    // Speed controls
    this.elements.speedButtons.forEach(button => {
      const listener = () => {
        const speed = parseInt(button.id.split('-')[1]);
        this.handleSpeedChange(speed);
      };
      button.addEventListener('click', listener);
      this.eventListeners.push({ element: button, event: 'click', listener });
    });

    // Mobile speed controls
    if (this.elements.mobileSpeedButtons) {
      this.elements.mobileSpeedButtons.forEach(button => {
        const listener = () => {
          const speed = parseInt(button.dataset.speed);
          this.handleSpeedChange(speed);
        };
        button.addEventListener('click', listener);
        this.eventListeners.push({ element: button, event: 'click', listener });
      });
    }

    // Confidence slider
    if (this.elements.confidenceSlider) {
      const listener = (e) => {
        this.elements.confidenceValue.textContent = e.target.value;
      };
      this.elements.confidenceSlider.addEventListener('input', listener);
      this.eventListeners.push({ 
        element: this.elements.confidenceSlider, 
        event: 'input', 
        listener 
      });
    }

    // Prediction submission
    if (this.elements.submitPrediction) {
      const listener = () => {
        this.handlePredictionSubmission();
      };
      this.elements.submitPrediction.addEventListener('click', listener);
      this.eventListeners.push({
        element: this.elements.submitPrediction,
        event: 'click',
        listener
      });
    }

    // Mobile prediction submission
    if (this.elements.mobileSubmitPrediction) {
      const listener = () => {
        this.handleMobilePredictionSubmission();
      };
      this.elements.mobileSubmitPrediction.addEventListener('click', listener);
      this.eventListeners.push({
        element: this.elements.mobileSubmitPrediction,
        event: 'click',
        listener
      });
    }

    // Sync mobile and desktop prediction dropdowns
    if (this.elements.predictionWinner && this.elements.mobilePredictionWinner) {
      const syncToMobile = (e) => {
        this.elements.mobilePredictionWinner.value = e.target.value;
      };
      const syncToDesktop = (e) => {
        this.elements.predictionWinner.value = e.target.value;
      };
      this.elements.predictionWinner.addEventListener('change', syncToMobile);
      this.elements.mobilePredictionWinner.addEventListener('change', syncToDesktop);
      this.eventListeners.push(
        { element: this.elements.predictionWinner, event: 'change', listener: syncToMobile },
        { element: this.elements.mobilePredictionWinner, event: 'change', listener: syncToDesktop }
      );
    }

    // Mobile menu toggle
    if (this.elements.mobileMenuToggle) {
      const listener = () => {
        this.toggleMobileMenu();
      };
      this.elements.mobileMenuToggle.addEventListener('click', listener);
      this.eventListeners.push({ 
        element: this.elements.mobileMenuToggle, 
        event: 'click', 
        listener 
      });
    }

    // Window resize handler
    this.resizeHandler = () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.adaptToViewport();
      }, 100);
    };
    window.addEventListener('resize', this.resizeHandler);
    
    // Separate orientation change handler
    this.orientationHandler = () => {
      setTimeout(() => {
        this.adaptToViewport();
        this.handleOrientationChange();
      }, 100);
    };
    window.addEventListener('orientationchange', this.orientationHandler);
  }

  /**
   * Initialize simulation engine event listeners
   * 
   * @private
   */
  initializeSimulationListeners() {
    this.simulationEngine.on('conflict_created', (data) => {
      this.handleConflictCreated(data);
    });

    this.simulationEngine.on('update', (data) => {
      this.handleSimulationUpdate(data);
    });

    this.simulationEngine.on('conflict_ended', (data) => {
      this.handleConflictEnded(data);
    });

    this.simulationEngine.on('random_event', (data) => {
      this.handleRandomEvent(data);
    });

    this.simulationEngine.on('speed_changed', (data) => {
      this.updateSpeedDisplay(data.newSpeed);
    });

    this.simulationEngine.on('prediction_resolved', (data) => {
      this.handlePredictionResolved(data);
    });

    this.simulationEngine.on('started', (data) => {
      this.handleSimulationStarted(data);
    });

    this.simulationEngine.on('stopped', (data) => {
      this.handleSimulationStopped(data);
    });
  }

  /**
   * Initialize touch gesture support for mobile devices
   * 
   * @private
   */
  initializeTouchGestures() {
    this.touchHandler = {
      startX: 0,
      startY: 0,
      startTime: 0,
      threshold: 50,
      allowedTime: 300,
      lastSwipe: null
    };

    if (this.elements.countriesContainer) {
      const container = this.elements.countriesContainer;

      const handleTouchStart = (e) => {
        const touch = e.touches[0];
        this.touchHandler.startX = touch.clientX;
        this.touchHandler.startY = touch.clientY;
        this.touchHandler.startTime = Date.now();
      };

      const handleTouchEnd = (e) => {
        if (!e.changedTouches.length) {return;}
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchHandler.startX;
        const deltaY = touch.clientY - this.touchHandler.startY;
        const deltaTime = Date.now() - this.touchHandler.startTime;

        if (deltaTime <= this.touchHandler.allowedTime) {
          if (Math.abs(deltaX) >= this.touchHandler.threshold && Math.abs(deltaY) <= 100) {
            // Horizontal swipe detected
            const direction = deltaX > 0 ? 'right' : 'left';
            this.handleSwipeGesture(direction);
          }
        }
      };

      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      this.eventListeners.push(
        { element: container, event: 'touchstart', listener: handleTouchStart },
        { element: container, event: 'touchend', listener: handleTouchEnd }
      );
    }
  }

  /**
   * Initialize accessibility features
   * 
   * @private
   */
  initializeAccessibility() {
    // Add ARIA labels to progress bars
    const territoryBars = document.querySelectorAll('.territory-bar');
    territoryBars.forEach((bar, index) => {
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-label', `Territory control for country ${index + 1}`);
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
    });

    // Add ARIA live region for updates feed
    if (this.elements.updatesList) {
      this.elements.updatesList.setAttribute('aria-live', 'polite');
      this.elements.updatesList.setAttribute('aria-label', 'Live updates feed');
    }

    // Ensure keyboard navigation
    this.elements.speedButtons.forEach((button, index) => {
      button.setAttribute('tabindex', index === 0 ? '0' : '0');
      button.setAttribute('aria-label', `Set simulation speed to ${button.textContent}`);
    });

    // Add semantic structure
    if (this.elements.app) {
      this.elements.app.setAttribute('role', 'main');
    }
  }

  /**
   * Render country cards with current conflict information
   * 
   * @param {Conflict} conflict - Current conflict instance
   */
  renderCountryCards(conflict) {
    try {
      if (!conflict) {
        this.renderEmptyCountryCards();
        return;
      }

      const [countryA, countryB] = conflict.countries;
      
      // Update country A
      if (this.elements.countryA) {
        const nameElement = this.elements.countryA.querySelector('.country-name');
        if (nameElement) {
          nameElement.textContent = countryA.name;
        }
        
        // Add tooltip with country information
        this.elements.countryA.title = this.createCountryTooltip(countryA);
      }

      // Update country B  
      if (this.elements.countryB) {
        const nameElement = this.elements.countryB.querySelector('.country-name');
        if (nameElement) {
          nameElement.textContent = countryB.name;
        }
        
        this.elements.countryB.title = this.createCountryTooltip(countryB);
      }

      // Update territory control
      this.updateProgressBars(conflict.territoryControl);
      
      // Update prediction interface
      this.updatePredictionInterface(conflict);
      
    } catch (error) {
      console.warn('Error rendering country cards:', error);
      this.renderEmptyCountryCards();
    }
  }

  /**
   * Render empty country cards for loading state
   * 
   * @private
   */
  renderEmptyCountryCards() {
    const cards = [this.elements.countryA, this.elements.countryB];
    cards.forEach((card, _index) => {
      if (card) {
        const nameElement = card.querySelector('.country-name');
        if (nameElement) {
          nameElement.textContent = 'Loading...';
        }
        card.title = '';
      }
    });

    this.updateProgressBars([50, 50]);
  }

  /**
   * Create tooltip content for country information
   * 
   * @private
   * @param {Country} country - Country instance
   * @returns {string} Tooltip text
   */
  createCountryTooltip(country) {
    try {
      const parts = [`${country.name} (${country.code})`];
      
      if (country.geography?.population) {
        parts.push(`Population: ${country.geography.population.toLocaleString()}`);
      }
      
      if (country.military?.personnel) {
        parts.push(`Military: ${country.military.personnel.toLocaleString()}`);
      }
      
      if (country.economy?.gdp) {
        parts.push(`GDP: $${(country.economy.gdp / 1e6).toFixed(0)}M`);
      }
      
      if (country.military?.nuclear !== undefined) {
        parts.push(`Nuclear: ${country.military.nuclear ? 'Yes' : 'No'}`);
      }
      
      return parts.join('\n');
    } catch (error) {
      console.warn('Error creating country tooltip:', error);
      return `${country.name} (${country.code})`;
    }
  }

  /**
   * Update progress bars with territory control percentages
   * 
   * @param {Array} territoryControl - [countryA%, countryB%]
   */
  updateProgressBars(territoryControl) {
    try {
      const [percentA, percentB] = territoryControl || [0, 0];
      
      // Store previous values for change detection
      const prevA = this.previousTerritoryControl?.[0] || 50;
      const prevB = this.previousTerritoryControl?.[1] || 50;
      
      // Update country A
      const fillA = this.elements.countryA?.querySelector('.territory-fill');
      const percentElementA = this.elements.countryA?.querySelector('.territory-percent');
      const territoryBarA = this.elements.countryA?.querySelector('.territory-bar');
      
      if (fillA && percentElementA) {
        fillA.style.width = `${Math.max(0, Math.min(100, percentA))}%`;
        percentElementA.textContent = `${Math.round(percentA)}%`;
        
        // Update ARIA values
        if (territoryBarA) {
          territoryBarA.setAttribute('aria-valuenow', Math.round(percentA));
        }
      }

      // Update country B
      const fillB = this.elements.countryB?.querySelector('.territory-fill');
      const percentElementB = this.elements.countryB?.querySelector('.territory-percent');
      const territoryBarB = this.elements.countryB?.querySelector('.territory-bar');
      
      if (fillB && percentElementB) {
        fillB.style.width = `${Math.max(0, Math.min(100, percentB))}%`;
        percentElementB.textContent = `${Math.round(percentB)}%`;
        
        if (territoryBarB) {
          territoryBarB.setAttribute('aria-valuenow', Math.round(percentB));
        }
      }

      // Add visual indicators for significant changes
      const changeThreshold = 10;
      if (Math.abs(percentA - prevA) >= changeThreshold) {
        this.addChangeIndicator(this.elements.countryA, percentA > prevA ? 'gaining' : 'losing');
      }
      if (Math.abs(percentB - prevB) >= changeThreshold) {
        this.addChangeIndicator(this.elements.countryB, percentB > prevB ? 'gaining' : 'losing');
      }

      this.previousTerritoryControl = [percentA, percentB];
      
    } catch (error) {
      console.warn('Error updating progress bars:', error);
    }
  }

  /**
   * Add visual change indicator to country card
   * 
   * @private
   * @param {HTMLElement} element - Country card element
   * @param {string} type - 'gaining' or 'losing'
   */
  addChangeIndicator(element, type) {
    if (!element) {return;}
    
    element.classList.add(type);
    setTimeout(() => {
      element.classList.remove(type);
    }, 600);
  }

  /**
   * Add update to the live feed
   * 
   * @param {string} text - Update text
   * @param {string} type - Update type for styling ('territory', 'event', 'conflict')
   */
  addUpdateToFeed(text, type = 'general') {
    try {
      if (!text || !this.elements.updatesList) {return;}

      const updateItem = document.createElement('div');
      updateItem.className = 'update-item';
      
      // Add type-specific classes based on test expectations
      const typeClassMap = {
        'territory': 'territory-update',
        'event': 'event-update', 
        'conflict': 'conflict-update',
        'prediction': 'prediction-update',
        'system': 'system-update'
      };
      
      if (typeClassMap[type]) {
        updateItem.classList.add(typeClassMap[type]);
      }
      
      const timeElement = document.createElement('span');
      timeElement.className = 'update-time';
      timeElement.textContent = new Date().toLocaleTimeString();
      
      const textElement = document.createElement('span');
      textElement.textContent = text;
      
      updateItem.appendChild(timeElement);
      updateItem.appendChild(textElement);
      
      this.elements.updatesList.appendChild(updateItem);
      
      // Limit feed items
      while (this.elements.updatesList.children.length > this.maxFeedItems) {
        this.elements.updatesList.removeChild(this.elements.updatesList.firstElementChild);
      }
      
      // Scroll to bottom
      this.elements.updatesList.scrollTop = this.elements.updatesList.scrollHeight;
      
    } catch (error) {
      console.warn('Error adding update to feed:', error);
    }
  }

  /**
   * Handle speed control interactions
   * 
   * @param {number} speed - New speed multiplier
   */
  handleSpeedChange(speed) {
    try {
      if (typeof speed !== 'number' || speed <= 0) {return;}
      
      this.simulationEngine.setSpeed(speed);
      this.updateSpeedDisplay(speed);
      
    } catch (error) {
      console.warn('Error handling speed change:', error);
    }
  }

  /**
   * Update speed button display
   * 
   * @param {number} speed - Current speed multiplier
   */
  updateSpeedDisplay(speed) {
    try {
      // Update desktop speed buttons
      this.elements.speedButtons.forEach(button => {
        const buttonSpeed = parseInt(button.id.split('-')[1]);
        button.classList.toggle('active', buttonSpeed === speed);
      });

      // Update mobile speed buttons
      if (this.elements.mobileSpeedButtons) {
        this.elements.mobileSpeedButtons.forEach(button => {
          const buttonSpeed = parseInt(button.dataset.speed);
          button.classList.toggle('active', buttonSpeed === speed);
        });
      }
      
    } catch (error) {
      console.warn('Error updating speed display:', error);
    }
  }

  /**
   * Update prediction interface for current conflict
   *
   * @param {Conflict} conflict - Current conflict instance
   */
  updatePredictionInterface(conflict) {
    try {
      const dropdown = this.elements.predictionWinner;
      const submitButton = this.elements.submitPrediction;
      const mobileDropdown = this.elements.mobilePredictionWinner;
      const mobileSubmitButton = this.elements.mobileSubmitPrediction;

      if (!conflict) {
        // Disable all prediction controls
        if (dropdown) {
          dropdown.disabled = true;
          dropdown.innerHTML = '<option value="">No active conflict</option>';
        }
        if (submitButton) {
          submitButton.disabled = true;
        }
        if (mobileDropdown) {
          mobileDropdown.disabled = true;
          mobileDropdown.innerHTML = '<option value="">No active conflict</option>';
        }
        if (mobileSubmitButton) {
          mobileSubmitButton.disabled = true;
        }
        return;
      }

      // Enable and populate desktop controls
      if (dropdown && submitButton) {
        dropdown.disabled = false;
        submitButton.disabled = false;

        // Clear and repopulate dropdown
        dropdown.innerHTML = '<option value="">Select winner...</option>';

        conflict.countries.forEach((country, index) => {
          const option = document.createElement('option');
          option.value = String(index);
          option.textContent = country.name;
          dropdown.appendChild(option);
        });
      }

      // Enable and populate mobile controls
      if (mobileDropdown && mobileSubmitButton) {
        mobileDropdown.disabled = false;
        mobileSubmitButton.disabled = false;

        // Clear and repopulate mobile dropdown
        mobileDropdown.innerHTML = '<option value="">Select winner...</option>';

        conflict.countries.forEach((country, index) => {
          const option = document.createElement('option');
          option.value = String(index);
          option.textContent = country.name;
          mobileDropdown.appendChild(option);
        });
      }

    } catch (error) {
      console.warn('Error updating prediction interface:', error);
    }
  }

  /**
   * Handle prediction submission
   *
   * @private
   */
  handlePredictionSubmission() {
    try {
      const winner = parseInt(this.elements.predictionWinner.value);
      const confidence = parseInt(this.elements.confidenceSlider.value);

      if (isNaN(winner) || isNaN(confidence)) {
        this.showNotification('Please select a winner and confidence level', 'error');
        return;
      }

      const result = this.simulationEngine.submitPrediction(winner, confidence);

      if (result.success) {
        this.showNotification('Prediction submitted successfully!', 'success');
        this.elements.submitPrediction.disabled = true;
        if (this.elements.mobileSubmitPrediction) {
          this.elements.mobileSubmitPrediction.disabled = true;
        }
      } else {
        this.showNotification(result.error || 'Failed to submit prediction', 'error');
      }

    } catch (error) {
      console.warn('Error handling prediction submission:', error);
      this.showNotification('Error submitting prediction', 'error');
    }
  }

  /**
   * Handle mobile prediction submission
   *
   * @private
   */
  handleMobilePredictionSubmission() {
    try {
      const winner = parseInt(this.elements.mobilePredictionWinner.value);
      const confidence = 5; // Default confidence for mobile quick predictions

      if (isNaN(winner)) {
        this.showNotification('Please select a winner', 'error');
        return;
      }

      const result = this.simulationEngine.submitPrediction(winner, confidence);

      if (result.success) {
        this.showNotification('Prediction submitted!', 'success');
        this.elements.mobileSubmitPrediction.disabled = true;
        if (this.elements.submitPrediction) {
          this.elements.submitPrediction.disabled = true;
        }
      } else {
        this.showNotification(result.error || 'Failed to submit prediction', 'error');
      }

    } catch (error) {
      console.warn('Error handling mobile prediction submission:', error);
      this.showNotification('Error submitting prediction', 'error');
    }
  }

  /**
   * Show notification to user
   * 
   * @private
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'info')
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '10px 20px',
      backgroundColor: type === 'success' ? '#4ecdc4' : type === 'error' ? '#ff6b6b' : '#333',
      color: 'white',
      borderRadius: '5px',
      zIndex: '1000',
      fontSize: '14px'
    });
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Update conflict statistics display
   * 
   * @param {Object} stats - Conflict statistics
   */
  updateStatistics(stats) {
    try {
      if (!stats || !this.elements.conflictStats) {return;}

      this.elements.conflictStats.innerHTML = '';
      
      // Format and display various statistics
      const statItems = [
        { 
          label: 'Territory Control', 
          value: `${Math.round(stats.territoryControl?.[0] || 0)}% - ${Math.round(stats.territoryControl?.[1] || 0)}%` 
        },
        { 
          label: 'Casualties', 
          value: `${(stats.casualties?.[0] || 0).toLocaleString()} - ${(stats.casualties?.[1] || 0).toLocaleString()}` 
        },
        { 
          label: 'Economic Impact', 
          value: `${((stats.economicImpact?.[0] || 0) * 100).toFixed(1)}% - ${((stats.economicImpact?.[1] || 0) * 100).toFixed(1)}%` 
        },
        { 
          label: 'Duration', 
          value: this.formatDuration(stats.duration || 0) 
        }
      ];

      statItems.forEach(item => {
        const statElement = document.createElement('div');
        statElement.className = 'stat-item';
        statElement.innerHTML = `
          <span class="stat-label">${item.label}</span>
          <span class="stat-value">${item.value}</span>
        `;
        this.elements.conflictStats.appendChild(statElement);
      });
      
    } catch (error) {
      console.warn('Error updating statistics:', error);
    }
  }

  /**
   * Update prediction statistics display
   * 
   * @param {Object} predictionStats - User prediction statistics
   */
  updatePredictionStats(predictionStats) {
    try {
      if (!predictionStats) {return;}

      if (this.elements.accuracy) {
        this.elements.accuracy.textContent = `${predictionStats.accuracy || 0}%`;
      }
      if (this.elements.correct) {
        this.elements.correct.textContent = predictionStats.correctPredictions || 0;
      }
      if (this.elements.total) {
        this.elements.total.textContent = predictionStats.totalPredictions || 0;
      }
      if (this.elements.streak) {
        this.elements.streak.textContent = predictionStats.currentStreak || 0;
      }
      
    } catch (error) {
      console.warn('Error updating prediction stats:', error);
    }
  }

  /**
   * Update conflict header with current conflict information
   * 
   * @param {Conflict} conflict - Current conflict instance
   */
  updateConflictHeader(conflict) {
    try {
      if (!conflict) {
        if (this.elements.conflictTitle) {
          this.elements.conflictTitle.textContent = 'No Active Conflict';
        }
        if (this.elements.conflictDuration) {
          this.elements.conflictDuration.textContent = 'Duration: --:--';
        }
        return;
      }

      if (this.elements.conflictTitle) {
        this.elements.conflictTitle.textContent = `${conflict.countries[0].name} vs ${conflict.countries[1].name}`;
      }
      
      if (this.elements.conflictDuration) {
        this.elements.conflictDuration.textContent = `Duration: ${this.formatDuration(conflict.duration)}`;
      }
      
    } catch (error) {
      console.warn('Error updating conflict header:', error);
    }
  }

  /**
   * Format duration in MM:SS format
   * 
   * @private
   * @param {number} duration - Duration in turns/seconds
   * @returns {string} Formatted duration
   */
  formatDuration(duration) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Adapt UI to current viewport size
   */
  adaptToViewport() {
    try {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= this.mobileBreakpoint;
      
      if (this.elements.app) {
        this.elements.app.classList.toggle('mobile-layout', this.isMobile);
      }

      // Handle mobile menu visibility
      if (this.elements.mobileMenu) {
        this.elements.mobileMenu.style.display = this.isMobile ? 'block' : 'none';
      }

      // Close mobile menu if switching to desktop
      if (wasMobile && !this.isMobile && this.mobileMenuOpen) {
        this.toggleMobileMenu();
      }

      // Trigger layout recalculation if viewport type changed
      if (wasMobile !== this.isMobile) {
        this.handleViewportChange();
      }
      
    } catch (error) {
      console.warn('Error adapting to viewport:', error);
    }
  }

  /**
   * Handle viewport type change (mobile <-> desktop)
   * 
   * @private
   */
  handleViewportChange() {
    // Re-render current state for new viewport
    if (this.simulationEngine.currentConflict) {
      this.renderCountryCards(this.simulationEngine.currentConflict);
    }
  }

  /**
   * Handle orientation change
   */
  handleOrientationChange() {
    // Delay to allow for orientation to complete
    setTimeout(() => {
      this.adaptToViewport();
    }, 100);
  }

  /**
   * Toggle mobile menu open/closed
   */
  toggleMobileMenu() {
    try {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      
      if (this.elements.mobileMenu) {
        this.elements.mobileMenu.classList.toggle('open', this.mobileMenuOpen);
      }
      
    } catch (error) {
      console.warn('Error toggling mobile menu:', error);
    }
  }

  /**
   * Handle swipe gestures
   * 
   * @private
   * @param {string} direction - Swipe direction ('left' or 'right')
   */
  handleSwipeGesture(direction) {
    this.touchHandler.lastSwipe = direction;
    
    // Could implement swipe actions like:
    // - Swipe to change speed
    // - Swipe to navigate between views
    // For now, just store the gesture
  }

  // Simulation Engine Event Handlers

  /**
   * Handle conflict creation event
   * 
   * @private
   * @param {Object} data - Event data
   */
  handleConflictCreated(data) {
    this.renderCountryCards(data.conflict);
    this.updateConflictHeader(data.conflict);
    this.addUpdateToFeed(`New conflict: ${data.countries[0].name} vs ${data.countries[1].name}`, 'conflict');
  }

  /**
   * Handle simulation update event
   * 
   * @private
   * @param {Object} data - Event data
   */
  handleSimulationUpdate(data) {
    this.updateProgressBars(data.stats.territoryControl);
    this.updateStatistics(data.stats);
    this.updateConflictHeader(data.conflict);
    
    const [percentA, percentB] = data.stats.territoryControl;
    if (Math.abs(percentA - (this.previousTerritoryControl?.[0] || 50)) >= 5) {
      this.addUpdateToFeed(`Territory shift: ${Math.round(percentA)}% - ${Math.round(percentB)}%`, 'territory');
    }
  }

  /**
   * Handle conflict end event
   *
   * @private
   * @param {Object} data - Event data
   */
  handleConflictEnded(data) {
    const winner = data.conflict.countries[data.victory.winner];
    this.addUpdateToFeed(`Conflict ended: ${winner.name} wins by ${data.victory.condition}`, 'conflict');

    // Re-enable prediction submission for next conflict
    if (this.elements.submitPrediction) {
      this.elements.submitPrediction.disabled = false;
    }
    if (this.elements.mobileSubmitPrediction) {
      this.elements.mobileSubmitPrediction.disabled = false;
    }
  }

  /**
   * Handle random event
   * 
   * @private
   * @param {Object} data - Event data
   */
  handleRandomEvent(data) {
    this.addUpdateToFeed(`Event: ${data.event.description}`, 'event');
  }

  /**
   * Handle prediction resolution
   * 
   * @private
   * @param {Object} data - Event data
   */
  handlePredictionResolved(data) {
    const result = data.predictionResult.correct ? 'correct' : 'incorrect';
    this.addUpdateToFeed(`Your prediction was ${result}!`, 'prediction');
    
    // Update prediction statistics if available
    if (this.simulationEngine.predictionSystem) {
      const stats = this.simulationEngine.predictionSystem.getStatistics();
      this.updatePredictionStats(stats);
    }
  }

  /**
   * Handle simulation start
   *
   * @private
   * @param {Object} _data - Event data (unused)
   */
  handleSimulationStarted(_data) {
    this.addUpdateToFeed('Simulation started', 'system');
  }

  /**
   * Handle simulation stop
   *
   * @private
   * @param {Object} _data - Event data (unused)
   */
  handleSimulationStopped(_data) {
    this.addUpdateToFeed('Simulation stopped', 'system');
  }

  /**
   * Clean up event listeners and resources
   */
  destroy() {
    try {
      // Remove all event listeners
      this.eventListeners.forEach(({ element, event, listener }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, listener);
        }
      });
      this.eventListeners = [];

      // Remove window event listeners
      if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler);
      }
      
      if (this.orientationHandler) {
        window.removeEventListener('orientationchange', this.orientationHandler);
      }
      
      // Clear any pending timers
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = null;
      }

      // Remove simulation engine listeners
      if (this.simulationEngine && typeof this.simulationEngine.off === 'function') {
        const events = ['conflict_created', 'update', 'conflict_ended', 'random_event', 
                       'speed_changed', 'prediction_resolved', 'started', 'stopped'];
        events.forEach(event => this.simulationEngine.off(event));
      }

      // Clear timers
      if (this.animationTimer) {
        clearTimeout(this.animationTimer);
      }
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }

      // Clear references
      this.elements = {};
      this.touchHandler = {};
      
    } catch (error) {
      console.warn('Error during UIController cleanup:', error);
    }
  }
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIController;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.UIController = UIController;
}