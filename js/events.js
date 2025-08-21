/**
 * Event Generator System
 * 
 * Manages random events that can affect ongoing conflicts, adding realism and unpredictability.
 * Events include natural disasters, political changes, economic shocks, international pressure,
 * and military developments.
 * 
 * @class EventGenerator
 */
class EventGenerator {
  /**
   * Initialize event generator with configurable probability
   * 
   * @param {number} eventProbability - Probability of event occurring each update (0-1, default 0.15)
   * @throws {Error} If probability is outside valid range
   */
  constructor(eventProbability = 0.15) {
    if (eventProbability < 0 || eventProbability > 1) {
      throw new Error('Event probability must be between 0 and 1');
    }
    
    this.eventProbability = eventProbability;
    this.activeEvents = []; // Events currently affecting the conflict
  }

  /**
   * Generate a random event based on probability
   * 
   * @param {Conflict} conflict - Current conflict to generate event for
   * @returns {Object|null} Event object or null if no event occurs
   */
  generateRandomEvent(conflict) {
    if (Math.random() > this.eventProbability) {
      return null; // No event this update
    }
    
    // Select random event type
    const eventTypes = [
      'natural_disaster',
      'political_event', 
      'economic_event',
      'international_pressure',
      'military_development'
    ];
    
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    // Generate specific event based on type
    switch (randomType) {
      case 'natural_disaster':
        return this.createNaturalDisasterEvent(conflict);
      case 'political_event':
        return this.createPoliticalEvent(conflict);
      case 'economic_event':
        return this.createEconomicEvent(conflict);
      case 'international_pressure':
        return this.createInternationalPressureEvent(conflict);
      case 'military_development':
        return this.createMilitaryDevelopmentEvent(conflict);
      default:
        return null;
    }
  }

  /**
   * Get all available event type categories
   * 
   * @returns {string[]} Array of event type names
   */
  getEventTypes() {
    return [
      'natural_disaster',
      'political_event',
      'economic_event', 
      'international_pressure',
      'military_development'
    ];
  }

  /**
   * Apply event effects to the conflict and track active events
   * 
   * @param {Conflict} conflict - Target conflict
   * @param {Object} event - Event to apply
   */
  applyEventEffects(conflict, event) {
    const effects = event.effects;
    
    // Apply immediate GDP changes
    if (effects.gdpChange) {
      conflict.currentGDP[0] *= (1 + effects.gdpChange[0]);
      conflict.currentGDP[1] *= (1 + effects.gdpChange[1]);
      
      // Ensure GDP doesn't go below minimum threshold
      conflict.currentGDP[0] = Math.max(conflict.currentGDP[0], conflict.initialGDP[0] * 0.1);
      conflict.currentGDP[1] = Math.max(conflict.currentGDP[1], conflict.initialGDP[1] * 0.1);
    }
    
    // Apply immediate territory changes
    if (effects.territoryChange) {
      conflict.territoryControl[0] = Math.max(0, Math.min(100, 
        conflict.territoryControl[0] + effects.territoryChange[0]));
      conflict.territoryControl[1] = Math.max(0, Math.min(100, 
        conflict.territoryControl[1] + effects.territoryChange[1]));
      
      // Ensure total is 100%
      const total = conflict.territoryControl[0] + conflict.territoryControl[1];
      if (total !== 100) {
        const adjustment = (100 - total) / 2;
        conflict.territoryControl[0] += adjustment;
        conflict.territoryControl[1] += adjustment;
      }
    }
    
    // Track event if it has ongoing effects
    if (effects.duration > 0) {
      this.activeEvents.push({
        ...event,
        remainingDuration: effects.duration,
        startTime: conflict.duration
      });
    }
    
    // Log event in conflict timeline
    conflict.addEvent({
      type: 'random_event',
      description: `${event.type.replace('_', ' ').toUpperCase()}: ${event.description}`,
      territoryChange: effects.territoryChange || [0, 0],
      casualties: effects.casualties || 0
    });
  }

  /**
   * Update all active events, applying ongoing effects and removing expired ones
   * 
   * @param {Conflict} conflict - Current conflict
   */
  updateActiveEvents(conflict) {
    this.activeEvents = this.activeEvents.filter(event => {
      event.remainingDuration--;
      
      // Apply ongoing effects
      if (event.effects.gdpChange && event.remainingDuration >= 0) {
        conflict.currentGDP[0] *= (1 + (event.effects.gdpChange[0] * 0.3)); // Reduced ongoing impact
        conflict.currentGDP[1] *= (1 + (event.effects.gdpChange[1] * 0.3));
        
        // Maintain GDP floor
        conflict.currentGDP[0] = Math.max(conflict.currentGDP[0], conflict.initialGDP[0] * 0.1);
        conflict.currentGDP[1] = Math.max(conflict.currentGDP[1], conflict.initialGDP[1] * 0.1);
      }
      
      // Keep event if duration remaining
      return event.remainingDuration > 0;
    });
  }

  /**
   * Create a natural disaster event
   * 
   * @param {Conflict} conflict - Current conflict context
   * @returns {Object} Natural disaster event
   */
  createNaturalDisasterEvent(conflict) {
    const disasters = [
      {
        name: 'Major Earthquake',
        description: 'Powerful earthquake disrupts military infrastructure',
        effects: {
          militaryEfficiency: [0.8, 0.9],
          gdpChange: [-0.03, -0.02],
          duration: 4
        }
      },
      {
        name: 'Severe Flooding',
        description: 'Widespread floods hamper troop movements',
        effects: {
          territoryChange: [-1, 1],
          militaryEfficiency: [0.9, 0.95],
          duration: 3
        }
      },
      {
        name: 'Hurricane Strike',
        description: 'Category 4 hurricane damages coastal operations',
        effects: {
          militaryEfficiency: [0.85, 1.0],
          gdpChange: [-0.02, 0],
          duration: 3
        }
      },
      {
        name: 'Severe Drought',
        description: 'Extended drought affects supply lines and morale',
        effects: {
          militaryEfficiency: [0.9, 0.9],
          gdpChange: [-0.015, -0.015],
          duration: 6
        }
      },
      {
        name: 'Massive Wildfire',
        description: 'Uncontrolled wildfires force military redeployment',
        effects: {
          territoryChange: [-2, 0],
          militaryEfficiency: [0.9, 1.0],
          duration: 2
        }
      }
    ];
    
    const disaster = disasters[Math.floor(Math.random() * disasters.length)];
    
    return {
      type: 'natural_disaster',
      description: disaster.description,
      effects: disaster.effects
    };
  }

  /**
   * Create a political event affecting one or both countries
   * 
   * @param {Conflict} conflict - Current conflict context
   * @returns {Object} Political event
   */
  createPoliticalEvent(conflict) {
    const events = [
      {
        name: 'Government Coup',
        description: `Military coup in ${conflict.countries[Math.floor(Math.random() * 2)].name} creates instability`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [0.7, 1.0] : [1.0, 0.7],
          gdpChange: Math.random() < 0.5 ? [-0.05, 0] : [0, -0.05],
          duration: 8
        }
      },
      {
        name: 'Mass Protests',
        description: `Anti-war protests in ${conflict.countries[Math.floor(Math.random() * 2)].name} affect military morale`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [0.85, 1.0] : [1.0, 0.85],
          duration: 4
        }
      },
      {
        name: 'Leadership Change',
        description: `New leadership in ${conflict.countries[Math.floor(Math.random() * 2)].name} shifts military strategy`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [1.1, 1.0] : [1.0, 1.1],
          duration: 5
        }
      },
      {
        name: 'Political Scandal',
        description: `Corruption scandal weakens ${conflict.countries[Math.floor(Math.random() * 2)].name}'s war effort`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [0.9, 1.0] : [1.0, 0.9],
          gdpChange: Math.random() < 0.5 ? [-0.02, 0] : [0, -0.02],
          duration: 6
        }
      },
      {
        name: 'Democratic Elections',
        description: `Elections in ${conflict.countries[Math.floor(Math.random() * 2)].name} create policy uncertainty`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [0.95, 1.0] : [1.0, 0.95],
          duration: 3
        }
      }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    
    return {
      type: 'political_event',
      description: event.description,
      effects: event.effects
    };
  }

  /**
   * Create an economic event affecting trade and GDP
   * 
   * @param {Conflict} conflict - Current conflict context
   * @returns {Object} Economic event
   */
  createEconomicEvent(conflict) {
    const events = [
      {
        name: 'Trade War Escalation',
        description: 'International trade sanctions intensify economic pressure',
        effects: {
          gdpChange: [-0.08, -0.05],
          duration: 10
        }
      },
      {
        name: 'Economic Embargo',
        description: `Trade embargo imposed on ${conflict.countries[Math.floor(Math.random() * 2)].name}`,
        effects: {
          gdpChange: Math.random() < 0.5 ? [-0.12, 0] : [0, -0.12],
          militaryEfficiency: Math.random() < 0.5 ? [0.85, 1.0] : [1.0, 0.85],
          duration: 8
        }
      },
      {
        name: 'Global Recession',
        description: 'Worldwide economic downturn affects both war economies',
        effects: {
          gdpChange: [-0.06, -0.06],
          duration: 12
        }
      },
      {
        name: 'Oil Price Shock',
        description: 'Dramatic oil price changes disrupt military operations',
        effects: {
          gdpChange: [-0.04, -0.03],
          militaryEfficiency: [0.9, 0.95],
          duration: 5
        }
      },
      {
        name: 'Currency Crisis',
        description: `Currency collapse in ${conflict.countries[Math.floor(Math.random() * 2)].name} affects imports`,
        effects: {
          gdpChange: Math.random() < 0.5 ? [-0.1, 0] : [0, -0.1],
          militaryEfficiency: Math.random() < 0.5 ? [0.8, 1.0] : [1.0, 0.8],
          duration: 7
        }
      },
      {
        name: 'War Profiteering Boom',
        description: 'Arms sales boost one side\'s economy',
        effects: {
          gdpChange: Math.random() < 0.5 ? [0.05, -0.02] : [-0.02, 0.05],
          duration: 6
        }
      }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    
    return {
      type: 'economic_event',
      description: event.description,
      effects: event.effects
    };
  }

  /**
   * Create international diplomatic pressure event
   * 
   * @param {Conflict} conflict - Current conflict context
   * @returns {Object} International pressure event
   */
  createInternationalPressureEvent(conflict) {
    const events = [
      {
        name: 'UN Peace Resolution',
        description: 'United Nations calls for immediate ceasefire',
        effects: {
          militaryEfficiency: [0.9, 0.9],
          diplomacyBonus: 0.1,
          duration: 5
        }
      },
      {
        name: 'International Mediation',
        description: 'Major powers offer to mediate the conflict',
        effects: {
          militaryEfficiency: [0.95, 0.95],
          diplomacyBonus: 0.15,
          duration: 4
        }
      },
      {
        name: 'Humanitarian Intervention',
        description: 'International community intervenes for civilian protection',
        effects: {
          territoryChange: [-1, -1],
          militaryEfficiency: [0.85, 0.85],
          duration: 6
        }
      },
      {
        name: 'Allied Support',
        description: `${conflict.countries[Math.floor(Math.random() * 2)].name} receives international military aid`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [1.15, 1.0] : [1.0, 1.15],
          duration: 7
        }
      },
      {
        name: 'Peace Negotiations',
        description: 'International pressure forces peace talks',
        effects: {
          militaryEfficiency: [0.8, 0.8],
          diplomacyBonus: 0.2,
          duration: 3
        }
      }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    
    return {
      type: 'international_pressure',
      description: event.description,
      effects: event.effects
    };
  }

  /**
   * Create military development or intelligence event
   * 
   * @param {Conflict} conflict - Current conflict context  
   * @returns {Object} Military development event
   */
  createMilitaryDevelopmentEvent(conflict) {
    const events = [
      {
        name: 'New Weapons Technology',
        description: `${conflict.countries[Math.floor(Math.random() * 2)].name} deploys advanced weaponry`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [1.2, 1.0] : [1.0, 1.2],
          territoryChange: Math.random() < 0.5 ? [3, -3] : [-3, 3],
          duration: 8
        }
      },
      {
        name: 'Intelligence Breakthrough',
        description: `${conflict.countries[Math.floor(Math.random() * 2)].name} gains strategic intelligence advantage`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [1.1, 1.0] : [1.0, 1.1],
          territoryChange: Math.random() < 0.5 ? [2, -2] : [-2, 2],
          duration: 5
        }
      },
      {
        name: 'Strategic Alliance',
        description: `${conflict.countries[Math.floor(Math.random() * 2)].name} forms new military alliance`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [1.15, 1.0] : [1.0, 1.15],
          duration: 10
        }
      },
      {
        name: 'Cyber Warfare Attack',
        description: `Cyber attack disrupts ${conflict.countries[Math.floor(Math.random() * 2)].name}'s communications`,
        effects: {
          militaryEfficiency: Math.random() < 0.5 ? [0.8, 1.0] : [1.0, 0.8],
          duration: 4
        }
      },
      {
        name: 'Special Operations Success',
        description: `${conflict.countries[Math.floor(Math.random() * 2)].name} special forces achieve major victory`,
        effects: {
          territoryChange: Math.random() < 0.5 ? [4, -4] : [-4, 4],
          militaryEfficiency: Math.random() < 0.5 ? [1.1, 1.0] : [1.0, 1.1],
          duration: 3
        }
      }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    
    return {
      type: 'military_development',
      description: event.description,
      effects: event.effects
    };
  }

  /**
   * Get descriptions of all currently active events
   * 
   * @returns {string[]} Array of active event descriptions
   */
  getActiveEventsDescription() {
    return this.activeEvents.map(event => 
      `${event.description} (${event.remainingDuration} turns remaining)`
    );
  }
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventGenerator;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.EventGenerator = EventGenerator;
}