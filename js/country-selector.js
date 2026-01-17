class CountrySelector {
  constructor(countries, conflictHistory = []) {
    if (!countries || countries.length === 0) {
      throw new Error('Countries array cannot be empty');
    }
    
    this.countries = countries;
    this.conflictHistory = conflictHistory;
  }

  getGeographicalProximity(countryA, countryB) {
    // Handle identical countries
    if (countryA.code === countryB.code) {
      return 1;
    }

    const [lat1, lon1] = countryA.geography.capital;
    const [lat2, lon2] = countryB.geography.capital;

    // Calculate distance using shared utility
    const calcDist = typeof GeoUtils !== 'undefined'
      ? GeoUtils.calculateDistance
      : require('./utils').calculateDistance;
    const distance = calcDist(lat1, lon1, lat2, lon2);

    // Convert distance to proximity (closer = higher score)
    // Max meaningful distance ~15,000km for conflict relevance
    const normalizedDistance = Math.min(distance / 15000, 1);
    let proximity = 1 - normalizedDistance;

    // Apply border bonus (40% increase if countries share a border)
    if (this.sharesBorder(countryA, countryB)) {
      proximity *= 1.4;
      proximity = Math.min(proximity, 1); // Cap at 1
    }

    return Math.round(proximity * 1000) / 1000; // 3 decimal places
  }

  sharesBorder(countryA, countryB) {
    const bordersA = countryA.geography.borders || [];
    const bordersB = countryB.geography.borders || [];

    return bordersA.includes(countryB.code) || bordersB.includes(countryA.code);
  }

  getHistoricalTension(countryA, countryB) {
    const codes = [countryA.code, countryB.code];
    
    // Find conflicts involving both countries
    const relevantConflicts = this.conflictHistory.filter(conflict => 
      codes.every(code => conflict.countries.includes(code))
    );
    
    if (relevantConflicts.length === 0) {
      return 0;
    }
    
    // Calculate tension based on recency and conflict type
    const currentYear = new Date().getFullYear();
    let totalTension = 0;
    
    relevantConflicts.forEach(conflict => {
      const yearsAgo = currentYear - conflict.year;
      
      // Base tension score by conflict type
      const typeScores = {
        'territorial': 0.8,
        'trade_war': 0.6,
        'diplomatic': 0.4,
        'proxy_war': 0.9,
        'direct_war': 1.0
      };
      
      const baseScore = typeScores[conflict.type] || 0.5;
      
      // Decay tension over time (half-life of ~50 years)
      const timeDecay = Math.exp(-yearsAgo / 72); // 72 years for ln(2)/50
      
      totalTension += baseScore * timeDecay;
    });
    
    // Normalize to 0-1 range
    return Math.min(totalTension, 1);
  }

  getResourceCompetition(countryA, countryB) {
    const resourcesA = countryA.resources || [];
    const resourcesB = countryB.resources || [];
    
    if (resourcesA.length === 0 || resourcesB.length === 0) {
      return 0;
    }
    
    // Find shared resources
    const sharedResources = resourcesA.filter(resource => 
      resourcesB.includes(resource)
    );
    
    if (sharedResources.length === 0) {
      return 0;
    }
    
    // Calculate competition intensity
    // More shared resources = higher competition
    const maxResources = Math.max(resourcesA.length, resourcesB.length);
    const competition = sharedResources.length / maxResources;
    
    // Weight certain resources as more conflict-prone
    const highValueResources = ['oil', 'rare_earth', 'water', 'uranium'];
    const criticalShared = sharedResources.filter(r => highValueResources.includes(r));
    
    let bonus = 0;
    if (criticalShared.length > 0) {
      bonus = criticalShared.length * 0.2; // 20% bonus per critical resource
    }
    
    return Math.min(competition + bonus, 1);
  }

  calculateConflictProbability(countryA, countryB) {
    // Get individual factors
    const proximity = this.getGeographicalProximity(countryA, countryB);
    const tension = this.getHistoricalTension(countryA, countryB);
    const resources = this.getResourceCompetition(countryA, countryB);
    
    // Calculate GDP disparity factor
    const gdpA = countryA.economy.gdp;
    const gdpB = countryB.economy.gdp;
    const gdpRatio = Math.max(gdpA, gdpB) / Math.min(gdpA, gdpB);
    
    // Moderate disparity increases conflict risk, extreme disparity decreases it
    let disparityFactor = 0;
    if (gdpRatio > 2 && gdpRatio < 20) {
      disparityFactor = Math.min((gdpRatio - 2) / 10, 0.3); // Max 0.3 bonus
    }
    
    // Check for shared alliances (reduces conflict probability)
    const sharedAlliances = countryA.alliances.filter(alliance => 
      countryB.alliances.includes(alliance)
    );
    const alliancePenalty = sharedAlliances.length * 0.15; // -15% per shared alliance
    
    // Weighted combination of factors
    const baseScore = (
      proximity * 0.4 +      // Geography is most important (40%)
      tension * 0.3 +        // Historical tensions (30%)
      resources * 0.2 +      // Resource competition (20%)
      disparityFactor * 0.1  // GDP disparity (10%)
    );
    
    // Apply alliance penalty
    const finalScore = Math.max(baseScore - alliancePenalty, 0.05); // Minimum 5% chance
    
    return Math.min(finalScore, 1);
  }

  /**
   * Select a random pair of countries weighted by conflict probability
   *
   * @returns {[Country, Country]} Pair of countries
   */
  selectRandomPair() {
    if (this.countries.length < 2) {
      throw new Error('Need at least 2 countries to select a pair');
    }
    
    // Calculate probabilities for all possible pairs
    const pairs = [];
    const probabilities = [];
    
    for (let i = 0; i < this.countries.length; i++) {
      for (let j = i + 1; j < this.countries.length; j++) {
        const countryA = this.countries[i];
        const countryB = this.countries[j];
        const probability = this.calculateConflictProbability(countryA, countryB);
        
        pairs.push([countryA, countryB]);
        probabilities.push(probability);
      }
    }
    
    // Weighted random selection
    const totalWeight = probabilities.reduce((sum, prob) => sum + prob, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < probabilities.length; i++) {
      random -= probabilities[i];
      if (random <= 0) {
        return /** @type {[Country, Country]} */ (pairs[i]);
      }
    }

    // Fallback to last pair (shouldn't happen)
    return /** @type {[Country, Country]} */ (pairs[pairs.length - 1]);
  }
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CountrySelector;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.CountrySelector = CountrySelector;
}