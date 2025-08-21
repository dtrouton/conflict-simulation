/**
 * Main Entry Point for Conflict Simulation Game
 * 
 * This file serves as the main entry point for the browser-based
 * conflict simulation game, handling initialization and setup.
 */

// Main application initialization
(function() {
  'use strict';
  
  // Wait for all modules to be loaded
  function initializeGame() {
    console.log('🎯 Conflict Simulation Game Starting...');
    
    // Check if all required classes are available
    const requiredClasses = [
      'Country', 'CountrySelector', 'Conflict', 'EventGenerator', 
      'PredictionSystem', 'SimulationEngine', 'DataService', 'UIController'
    ];
    
    const missingClasses = requiredClasses.filter(className => !window[className]);
    
    if (missingClasses.length > 0) {
      console.error('❌ Missing required classes:', missingClasses);
      showError('Failed to load game components: ' + missingClasses.join(', '));
      return;
    }
    
    try {
      console.log('✅ All classes loaded successfully');
      
      // Initialize the game through the UI integration layer
      if (typeof window.initializeConflictSimulation === 'function') {
        const gameInstance = window.initializeConflictSimulation();
        
        if (gameInstance) {
          console.log('🚀 Game initialized successfully!');
          console.log('🎮 Ready for manual testing');
          
          // Add some helpful UI hints
          addGameInstructions();
          
          // Auto-start the first simulation for immediate testing
          setTimeout(() => {
            if (gameInstance.simulationEngine && !gameInstance.simulationEngine.isRunning()) {
              console.log('🔍 About to start simulation...');
              gameInstance.simulationEngine.start();
              console.log('🎯 First simulation started automatically');
              
              // Give it a moment then check
              setTimeout(() => {
                console.log('🔍 Current conflict:', gameInstance.simulationEngine.currentConflict);
                console.log('🔍 Countries:', gameInstance.simulationEngine.currentConflict?.countries);
                
                // Force UI update if conflict exists but UI not showing it
                if (gameInstance.simulationEngine.currentConflict && gameInstance.uiController) {
                  console.log('🔧 Manually triggering UI update...');
                  gameInstance.uiController.renderCountryCards(gameInstance.simulationEngine.currentConflict);
                  gameInstance.uiController.updatePredictionInterface(gameInstance.simulationEngine.currentConflict);
                }
              }, 500);
            }
          }, 1000);
          
        } else {
          showError('Game initialization failed');
        }
      } else {
        showError('UI initialization function not available');
      }
      
    } catch (error) {
      console.error('❌ Game initialization failed:', error);
      showError('Game initialization failed: ' + error.message);
    }
  }
  
  function showError(message) {
    console.error(message);
    
    // Try to show error in UI
    const conflictTitle = document.getElementById('conflict-title');
    if (conflictTitle) {
      conflictTitle.textContent = 'Error: ' + message;
      conflictTitle.style.color = '#ff6b6b';
    }
    
    // Also show in updates feed
    const updatesList = document.getElementById('updates-list');
    if (updatesList) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'update-item error-update';
      errorDiv.innerHTML = `
        <span class="update-time">${new Date().toLocaleTimeString()}</span>
        <span class="update-message" style="color: #ff6b6b;">❌ ${message}</span>
      `;
      updatesList.appendChild(errorDiv);
    }
  }
  
  function addGameInstructions() {
    // Add helpful instructions to the updates feed
    const updatesList = document.getElementById('updates-list');
    if (updatesList) {
      const instructions = [
        '🎮 Welcome to Conflict Simulation!',
        '⚡ Use speed controls (1x, 2x, 4x) in the header',
        '🎯 Make predictions using the dropdown and slider',
        '📊 Watch your accuracy stats at the bottom',
        '💡 Open browser console for debug commands'
      ];
      
      instructions.forEach((instruction, index) => {
        setTimeout(() => {
          const instructionDiv = document.createElement('div');
          instructionDiv.className = 'update-item system-update';
          instructionDiv.innerHTML = `
            <span class="update-time">${new Date().toLocaleTimeString()}</span>
            <span class="update-message">${instruction}</span>
          `;
          updatesList.appendChild(instructionDiv);
          updatesList.scrollTop = updatesList.scrollHeight;
        }, index * 500);
      });
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
  } else {
    initializeGame();
  }
  
  // Export for debugging
  window.gameDebug = {
    restart: initializeGame,
    showError: showError
  };
  
})();