/**
 * Conflict Engine Core
 * 
 * Manages the simulation of conflicts between two countries, including:
 * - Territory control dynamics
 * - Battle outcome calculations based on military/economic factors
 * - Victory condition detection (territorial, economic, diplomatic, intervention)
 * - Economic impact tracking during conflicts
 * - Event logging and statistics
 * 
 * @class Conflict
 */
class Conflict {
  /**
   * Initialize a new conflict between two countries
   * 
   * @param {Country} countryA - First country in conflict
   * @param {Country} countryB - Second country in conflict
   * @throws {Error} If same country or invalid countries provided
   */
  constructor(countryA, countryB) {
    this.validateCountries(countryA, countryB);
    
    this.countries = [countryA, countryB];
    this.territoryControl = [50, 50]; // Start with equal control
    this.duration = 0; // In simulation ticks (seconds)
    this.events = [];
    this.status = 'ongoing'; // 'ongoing', 'ended'
    this.winner = null; // Index of winning country (0 or 1)
    this.victoryCondition = null;
    this.victoryDescription = null;
    
    // Economic tracking
    this.initialGDP = [countryA.economy.gdp, countryB.economy.gdp];
    this.currentGDP = [...this.initialGDP];
    
    // Combat tracking
    this.totalCasualties = 0;
    
    // Log conflict start
    this.addEvent({
      type: 'conflict_start',
      description: `Conflict initiated between ${countryA.name} and ${countryB.name}`,
      territoryChange: [0, 0]
    });
  }

  /**
   * Validate that both countries are valid and different
   */
  validateCountries(countryA, countryB) {
    if (!countryA || !countryB || 
        typeof countryA.getMilitaryStrength !== 'function' ||
        typeof countryB.getMilitaryStrength !== 'function') {
      throw new Error('Both countries must be valid Country instances');
    }
    
    if (countryA.code === countryB.code) {
      throw new Error('Cannot create conflict between same country');
    }
  }

  /**
   * Calculate probability of countryA advancing in next battle
   * Considers military strength, economic power, current territory, and morale
   * 
   * @returns {number} Probability (0-1) of countryA winning next battle
   */
  calculateBattleOutcome() {
    const [countryA, countryB] = this.countries;
    
    // Base military factors
    const militaryA = countryA.getMilitaryStrength();
    const militaryB = countryB.getMilitaryStrength();
    const militaryRatio = militaryA / (militaryA + militaryB);
    
    // Economic factors (affects supply lines, equipment)
    const economicA = countryA.getEconomicPower();
    const economicB = countryB.getEconomicPower();
    const economicRatio = economicA / (economicA + economicB);
    
    // Territory control momentum (defender's advantage vs attacker's momentum)
    const [territoryA, territoryB] = this.territoryControl;
    let territoryFactor = 0.5; // Neutral
    
    if (territoryA > 60) {
      territoryFactor = 0.5 + (territoryA - 50) * 0.004; // Momentum bonus
    } else if (territoryA < 40) {
      territoryFactor = 0.5 - (50 - territoryA) * 0.003; // Desperation penalty
    }
    
    // Economic war impact (current vs initial GDP affects performance)
    const economicImpactA = this.currentGDP[0] / this.initialGDP[0];
    const economicImpactB = this.currentGDP[1] / this.initialGDP[1];
    const impactFactor = (economicImpactA - economicImpactB) * 0.1;
    
    // Combine factors with weights
    const probability = (
      militaryRatio * 0.5 +      // Military strength (50%)
      economicRatio * 0.25 +     // Economic power (25%)
      territoryFactor * 0.15 +   // Territory momentum (15%)
      (0.5 + impactFactor) * 0.1 // Economic impact (10%)
    );
    
    // Add small random factor (±5%)
    const randomFactor = (Math.random() - 0.5) * 0.1;
    
    return Math.max(0, Math.min(1, probability + randomFactor));
  }

  /**
   * Update territory control based on battle outcome
   * Also updates economic impact and casualties
   */
  updateTerritoryControl() {
    const probability = this.calculateBattleOutcome();
    
    // Determine battle outcome
    const countryAWins = Math.random() < probability;
    
    // Calculate territory change (1-4% per battle)
    const maxChange = 4;
    const baseChange = 1 + Math.random() * (maxChange - 1);
    
    // Adjust change based on current control (harder to gain when ahead)
    const [currentA, currentB] = this.territoryControl;
    let actualChange = baseChange;
    
    if (countryAWins && currentA > 70) {
      actualChange *= 0.5; // Diminishing returns
    } else if (!countryAWins && currentB > 70) {
      actualChange *= 0.5;
    }
    
    // Apply territory changes
    if (countryAWins) {
      this.territoryControl[0] = Math.min(100, currentA + actualChange);
      this.territoryControl[1] = Math.max(0, currentB - actualChange);
    } else {
      this.territoryControl[0] = Math.max(0, currentA - actualChange);
      this.territoryControl[1] = Math.min(100, currentB + actualChange);
    }
    
    // Ensure total is exactly 100
    const total = this.territoryControl[0] + this.territoryControl[1];
    if (total !== 100) {
      const adjustment = (100 - total) / 2;
      this.territoryControl[0] += adjustment;
      this.territoryControl[1] += adjustment;
    }
    
    // Calculate casualties (rough estimate)
    const battleIntensity = Math.random() * 0.001; // 0.1% max of personnel
    const casualtiesA = Math.floor(this.countries[0].military.personnel * battleIntensity);
    const casualtiesB = Math.floor(this.countries[1].military.personnel * battleIntensity);
    this.totalCasualties += casualtiesA + casualtiesB;
    
    // Apply economic impact (war costs GDP)
    const warCostRate = 0.002; // 0.2% GDP per battle
    this.currentGDP[0] = Math.max(
      this.initialGDP[0] * 0.3, // Minimum 30% of original GDP
      this.currentGDP[0] * (1 - warCostRate - Math.random() * 0.001)
    );
    this.currentGDP[1] = Math.max(
      this.initialGDP[1] * 0.3,
      this.currentGDP[1] * (1 - warCostRate - Math.random() * 0.001)
    );
    
    // Log battle event
    const winner = countryAWins ? this.countries[0].name : this.countries[1].name;
    const change = countryAWins ? actualChange : -actualChange;
    
    this.addEvent({
      type: 'battle',
      description: `${winner} advances, gaining ${actualChange.toFixed(1)}% territory`,
      territoryChange: countryAWins ? [change, -change] : [-change, change],
      casualties: casualtiesA + casualtiesB
    });
  }

  /**
   * Check all victory conditions and determine if conflict should end
   * 
   * @returns {Object} Victory result with hasWinner, winner, condition, description
   */
  checkVictoryConditions() {
    // 1. Territorial Control Victory (75%+)
    if (this.territoryControl[0] >= 75) {
      return {
        hasWinner: true,
        winner: 0,
        condition: 'territorial_control',
        description: `${this.countries[0].name} controls 75%+ of territory`
      };
    }
    
    if (this.territoryControl[1] >= 75) {
      return {
        hasWinner: true,
        winner: 1,
        condition: 'territorial_control', 
        description: `${this.countries[1].name} controls 75%+ of territory`
      };
    }
    
    // 2. Economic Collapse Victory (GDP falls below 30%)
    if (this.currentGDP[0] / this.initialGDP[0] < 0.3) {
      return {
        hasWinner: true,
        winner: 1,
        condition: 'economic_collapse',
        description: `${this.countries[0].name}'s economy collapsed`
      };
    }
    
    if (this.currentGDP[1] / this.initialGDP[1] < 0.3) {
      return {
        hasWinner: true,
        winner: 0,
        condition: 'economic_collapse',
        description: `${this.countries[1].name}'s economy collapsed`
      };
    }
    
    // 3. Diplomatic Resolution (random chance increases over time)
    const diplomacyChance = Math.min(this.duration / 1000, 0.15); // Max 15% at 1000 ticks
    if (Math.random() < diplomacyChance) {
      const winner = Math.random() < 0.5 ? 0 : 1;
      return {
        hasWinner: true,
        winner,
        condition: 'diplomatic_resolution',
        description: `Diplomatic intervention ended conflict in favor of ${this.countries[winner].name}`
      };
    }
    
    // 4. International Intervention (triggered by high casualties)
    const interventionThreshold = 500000; // 500k casualties
    if (this.totalCasualties > interventionThreshold) {
      const interventionChance = Math.min((this.totalCasualties - interventionThreshold) / 1000000, 0.2);
      if (Math.random() < interventionChance) {
        // International community forces ceasefire, winner determined by current territory
        const winner = this.territoryControl[0] > this.territoryControl[1] ? 0 : 1;
        return {
          hasWinner: true,
          winner,
          condition: 'international_intervention',
          description: `International intervention ended conflict due to high casualties`
        };
      }
    }
    
    // No victory conditions met
    return {
      hasWinner: false,
      winner: null,
      condition: null,
      description: null
    };
  }

  /**
   * Get current conflict duration in ticks
   * @returns {number} Duration in simulation ticks
   */
  getDuration() {
    return this.duration;
  }

  /**
   * Get formatted duration as MM:SS
   * @returns {string} Formatted time string
   */
  getFormattedDuration() {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Add an event to the conflict timeline
   * 
   * @param {Object} eventData - Event data (type, description, etc.)
   */
  addEvent(eventData) {
    const event = {
      timestamp: new Date(),
      type: eventData.type,
      description: eventData.description,
      territoryChange: eventData.territoryChange || [0, 0],
      casualties: eventData.casualties || 0
    };
    
    this.events.push(event);
  }

  /**
   * Get comprehensive conflict statistics
   * 
   * @returns {Object} Complete stats including duration, casualties, economic impact
   */
  getStats() {
    const economicImpact = [
      ((this.currentGDP[0] / this.initialGDP[0]) - 1) * 100,
      ((this.currentGDP[1] / this.initialGDP[1]) - 1) * 100
    ];
    
    return {
      duration: this.duration,
      territoryControl: [...this.territoryControl],
      casualties: this.totalCasualties,
      economicImpact,
      countries: this.countries.map(country => ({
        name: country.name,
        code: country.code
      })),
      status: this.status,
      winner: this.winner,
      victoryCondition: this.victoryCondition
    };
  }

  /**
   * End the conflict with specified winner and conditions
   * 
   * @param {number} winner - Index of winning country (0 or 1)
   * @param {string} condition - Victory condition type
   * @param {string} description - Victory description
   */
  endConflict(winner, condition, description) {
    this.status = 'ended';
    this.winner = winner;
    this.victoryCondition = condition;
    this.victoryDescription = description;
    
    // Log final event
    this.addEvent({
      type: 'conflict_end',
      description: `Conflict ended: ${description}`,
      territoryChange: [0, 0]
    });
  }
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Conflict;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.Conflict = Conflict;
}