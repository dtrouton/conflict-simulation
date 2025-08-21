class Country {
  constructor(data) {
    this.validateData(data);
    
    this.name = data.name;
    this.code = data.code;
    this.military = data.military;
    this.economy = data.economy;
    this.geography = data.geography;
    this.alliances = data.alliances || [];
    this.resources = data.resources || [];
    
    // Add borders if provided in geography
    if (data.geography && data.geography.borders) {
      this.geography.borders = data.geography.borders;
    }
  }

  validateData(data) {
    const required = ['name', 'code', 'military', 'economy', 'geography'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (data.military && data.military.expenditure !== undefined && data.military.expenditure < 0) {
      throw new Error('Military expenditure must be non-negative');
    }
  }

  getMilitaryStrength() {
    const { personnel, expenditure, nuclear } = this.military;
    
    // Base strength from personnel (normalized per million)
    const personnelStrength = (personnel / 1000000) * 100;
    
    // Economic strength from expenditure (normalized per billion USD)
    const expenditureStrength = (expenditure / 1000000000) * 50;
    
    // Combine both factors
    let strength = personnelStrength + expenditureStrength;
    
    // Nuclear weapons bonus (50% increase)
    if (nuclear) {
      strength *= 1.5;
    }
    
    return Math.round(strength * 100) / 100; // Round to 2 decimal places
  }

  getEconomicPower() {
    const { gdp } = this.economy;
    
    // Normalize GDP to a scale (per trillion USD)
    const power = (gdp / 1000000000000) * 100;
    
    return Math.round(power * 100) / 100;
  }

  getGeographicAdvantage(opponent) {
    const [lat1, lon1] = this.geography.capital;
    const [lat2, lon2] = opponent.geography.capital;
    
    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    
    // Convert distance to advantage (closer = higher advantage)
    // Max distance on Earth ~20,000km, normalize to 0-1 scale
    const normalizedDistance = Math.min(distance / 20000, 1);
    const advantage = 1 - normalizedDistance;
    
    return Math.round(advantage * 100) / 100;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  hasAlliance(allianceName) {
    return this.alliances.some(alliance => 
      alliance.toLowerCase() === allianceName.toLowerCase()
    );
  }
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Country;
}