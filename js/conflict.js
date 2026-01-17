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

// Victory and battle configuration constants
const CONFLICT_CONFIG = {
  // Victory thresholds
  TERRITORIAL_VICTORY_THRESHOLD: 75,     // % territory needed to win
  ECONOMIC_COLLAPSE_THRESHOLD: 0.3,      // GDP ratio below which economy collapses
  MIN_GDP_FLOOR: 0.3,                    // Minimum GDP as ratio of initial

  // Battle outcome weights
  MILITARY_WEIGHT: 0.5,
  ECONOMIC_WEIGHT: 0.25,
  TERRITORY_MOMENTUM_WEIGHT: 0.15,
  ECONOMIC_IMPACT_WEIGHT: 0.1,

  // Territory mechanics
  MOMENTUM_THRESHOLD: 60,                // Territory % above which momentum bonus applies
  DESPERATION_THRESHOLD: 40,             // Territory % below which penalty applies
  MOMENTUM_BONUS_RATE: 0.004,
  DESPERATION_PENALTY_RATE: 0.003,
  MAX_TERRITORY_CHANGE: 4,               // Max % territory change per battle
  DIMINISHING_RETURNS_THRESHOLD: 70,     // Territory % above which gains reduce

  // Economic impact
  WAR_COST_RATE: 0.002,                  // GDP lost per battle
  ECONOMIC_IMPACT_FACTOR: 0.1,

  // Diplomatic resolution
  MAX_DIPLOMACY_CHANCE: 0.15,            // Max 15% at peak duration
  DIPLOMACY_DURATION_FACTOR: 1000,       // Ticks to reach max chance
  TERRITORY_LEADER_ADVANTAGE: 0.7,       // 70% chance for leader in diplomacy

  // International intervention
  INTERVENTION_CASUALTY_THRESHOLD: 500000,
  MAX_INTERVENTION_CHANCE: 0.2,
  INTERVENTION_CASUALTY_DIVISOR: 1000000,

  // Random factor
  RANDOM_FACTOR_RANGE: 0.1               // ±5% random factor
};

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
    const cfg = CONFLICT_CONFIG;

    // Base military factors
    const militaryA = countryA.getMilitaryStrength();
    const militaryB = countryB.getMilitaryStrength();
    const militaryRatio = militaryA / (militaryA + militaryB);

    // Economic factors (affects supply lines, equipment)
    const economicA = countryA.getEconomicPower();
    const economicB = countryB.getEconomicPower();
    const economicRatio = economicA / (economicA + economicB);

    // Territory control momentum (defender's advantage vs attacker's momentum)
    const [territoryA] = this.territoryControl;
    let territoryFactor = 0.5; // Neutral

    if (territoryA > cfg.MOMENTUM_THRESHOLD) {
      territoryFactor = 0.5 + (territoryA - 50) * cfg.MOMENTUM_BONUS_RATE;
    } else if (territoryA < cfg.DESPERATION_THRESHOLD) {
      territoryFactor = 0.5 - (50 - territoryA) * cfg.DESPERATION_PENALTY_RATE;
    }

    // Economic war impact (current vs initial GDP affects performance)
    const economicImpactA = this.currentGDP[0] / this.initialGDP[0];
    const economicImpactB = this.currentGDP[1] / this.initialGDP[1];
    const impactFactor = (economicImpactA - economicImpactB) * cfg.ECONOMIC_IMPACT_FACTOR;

    // Combine factors with weights
    const probability = (
      militaryRatio * cfg.MILITARY_WEIGHT +
      economicRatio * cfg.ECONOMIC_WEIGHT +
      territoryFactor * cfg.TERRITORY_MOMENTUM_WEIGHT +
      (0.5 + impactFactor) * cfg.ECONOMIC_IMPACT_WEIGHT
    );

    // Add small random factor (±5%)
    const randomFactor = (Math.random() - 0.5) * cfg.RANDOM_FACTOR_RANGE;

    return Math.max(0, Math.min(1, probability + randomFactor));
  }

  /**
   * Update territory control based on battle outcome
   * Also updates economic impact and casualties
   */
  updateTerritoryControl() {
    const cfg = CONFLICT_CONFIG;
    const probability = this.calculateBattleOutcome();

    // Determine battle outcome
    const countryAWins = Math.random() < probability;

    // Calculate territory change (1-4% per battle)
    const baseChange = 1 + Math.random() * (cfg.MAX_TERRITORY_CHANGE - 1);

    // Adjust change based on current control (harder to gain when ahead)
    const [currentA, currentB] = this.territoryControl;
    let actualChange = baseChange;

    if (countryAWins && currentA > cfg.DIMINISHING_RETURNS_THRESHOLD) {
      actualChange *= 0.5; // Diminishing returns
    } else if (!countryAWins && currentB > cfg.DIMINISHING_RETURNS_THRESHOLD) {
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
    this.currentGDP[0] = Math.max(
      this.initialGDP[0] * cfg.MIN_GDP_FLOOR,
      this.currentGDP[0] * (1 - cfg.WAR_COST_RATE - Math.random() * 0.001)
    );
    this.currentGDP[1] = Math.max(
      this.initialGDP[1] * cfg.MIN_GDP_FLOOR,
      this.currentGDP[1] * (1 - cfg.WAR_COST_RATE - Math.random() * 0.001)
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
    const cfg = CONFLICT_CONFIG;

    // 1. Territorial Control Victory
    if (this.territoryControl[0] >= cfg.TERRITORIAL_VICTORY_THRESHOLD) {
      return {
        hasWinner: true,
        winner: 0,
        condition: 'territorial_control',
        description: `${this.countries[0].name} controls ${cfg.TERRITORIAL_VICTORY_THRESHOLD}%+ of territory`
      };
    }

    if (this.territoryControl[1] >= cfg.TERRITORIAL_VICTORY_THRESHOLD) {
      return {
        hasWinner: true,
        winner: 1,
        condition: 'territorial_control',
        description: `${this.countries[1].name} controls ${cfg.TERRITORIAL_VICTORY_THRESHOLD}%+ of territory`
      };
    }

    // 2. Economic Collapse Victory
    if (this.currentGDP[0] / this.initialGDP[0] < cfg.ECONOMIC_COLLAPSE_THRESHOLD) {
      return {
        hasWinner: true,
        winner: 1,
        condition: 'economic_collapse',
        description: `${this.countries[0].name}'s economy collapsed`
      };
    }

    if (this.currentGDP[1] / this.initialGDP[1] < cfg.ECONOMIC_COLLAPSE_THRESHOLD) {
      return {
        hasWinner: true,
        winner: 0,
        condition: 'economic_collapse',
        description: `${this.countries[1].name}'s economy collapsed`
      };
    }

    // 3. Diplomatic Resolution (random chance increases over time)
    const diplomacyChance = Math.min(this.duration / cfg.DIPLOMACY_DURATION_FACTOR, cfg.MAX_DIPLOMACY_CHANCE);
    if (Math.random() < diplomacyChance) {
      // Winner favors current territory leader
      const leaderIndex = this.territoryControl[0] > this.territoryControl[1] ? 0 : 1;
      const winner = Math.random() < cfg.TERRITORY_LEADER_ADVANTAGE ? leaderIndex : 1 - leaderIndex;
      return {
        hasWinner: true,
        winner,
        condition: 'diplomatic_resolution',
        description: `Diplomatic intervention ended conflict in favor of ${this.countries[winner].name}`
      };
    }

    // 4. International Intervention (triggered by high casualties)
    if (this.totalCasualties > cfg.INTERVENTION_CASUALTY_THRESHOLD) {
      const interventionChance = Math.min(
        (this.totalCasualties - cfg.INTERVENTION_CASUALTY_THRESHOLD) / cfg.INTERVENTION_CASUALTY_DIVISOR,
        cfg.MAX_INTERVENTION_CHANCE
      );
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