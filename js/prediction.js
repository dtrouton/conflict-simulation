/**
 * Prediction System
 * 
 * Manages user predictions for conflict outcomes with comprehensive tracking:
 * - Prediction submission with validation
 * - Accuracy calculation and streak management  
 * - Confidence analysis and statistics
 * - Persistent storage using localStorage
 * - Historical prediction review
 * 
 * @class PredictionSystem
 */
class PredictionSystem {
  /**
   * Initialize prediction system and load existing data from localStorage
   */
  constructor() {
    this.predictions = [];
    this.currentStreak = 0;
    this.bestStreak = 0;
    
    this.loadFromStorage();
  }

  /**
   * Submit a new prediction for a conflict
   * 
   * @param {Country} countryA - First country in conflict
   * @param {Country} countryB - Second country in conflict  
   * @param {number} winner - Predicted winner (0 for countryA, 1 for countryB)
   * @param {number} confidence - Confidence level (1-10)
   * @returns {Object} Result object with success status and prediction ID
   */
  submitPrediction(countryA, countryB, winner, confidence) {
    // Validate inputs
    const validation = this.validatePrediction(countryA, countryB, winner, confidence);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check for existing prediction for this conflict
    const existingPrediction = this.getCurrentPrediction(countryA, countryB);
    if (existingPrediction) {
      return { success: false, error: 'Prediction already exists for this conflict' };
    }

    // Create prediction object
    const predictionId = this.generatePredictionId();
    const prediction = {
      id: predictionId,
      countryA: countryA.name,
      countryACode: countryA.code,
      countryB: countryB.name,
      countryBCode: countryB.code,
      winner: winner,
      confidence: confidence,
      timestamp: Date.now(),
      resolved: false,
      correct: null,
      actualWinner: null,
      victoryCondition: null
    };

    this.predictions.push(prediction);
    this.saveToStorage();

    return { success: true, predictionId };
  }

  /**
   * Resolve a prediction with the actual conflict outcome
   * 
   * @param {string} predictionId - ID of prediction to resolve
   * @param {number} actualWinner - Actual winner (0 or 1)
   * @param {string} victoryCondition - How the conflict ended
   * @returns {Object} Result object with success status and correctness
   */
  resolvePrediction(predictionId, actualWinner, victoryCondition) {
    const prediction = this.predictions.find(p => p.id === predictionId);
    
    if (!prediction) {
      return { success: false, error: 'Prediction not found' };
    }

    if (prediction.resolved) {
      return { success: false, error: 'Prediction already resolved' };
    }

    // Resolve prediction
    prediction.resolved = true;
    prediction.actualWinner = actualWinner;
    prediction.victoryCondition = victoryCondition;
    prediction.correct = (prediction.winner === actualWinner);

    // Update streaks
    if (prediction.correct) {
      this.currentStreak++;
      if (this.currentStreak > this.bestStreak) {
        this.bestStreak = this.currentStreak;
      }
    } else {
      this.currentStreak = 0;
    }

    this.saveToStorage();

    return { 
      success: true, 
      correct: prediction.correct,
      currentStreak: this.currentStreak,
      bestStreak: this.bestStreak
    };
  }

  /**
   * Calculate overall prediction accuracy percentage
   * 
   * @returns {number} Accuracy percentage (0-100)
   */
  calculateAccuracy() {
    const resolvedPredictions = this.predictions.filter(p => p.resolved);
    
    if (resolvedPredictions.length === 0) {
      return 0;
    }

    const correctPredictions = resolvedPredictions.filter(p => p.correct).length;
    return Math.round((correctPredictions / resolvedPredictions.length) * 100 * 100) / 100;
  }

  /**
   * Get comprehensive prediction statistics
   * 
   * @returns {Object} Statistics including accuracy, streaks, and averages
   */
  getStatistics() {
    const resolvedPredictions = this.predictions.filter(p => p.resolved);
    const correctPredictions = resolvedPredictions.filter(p => p.correct);
    
    // Calculate average confidence
    let averageConfidence = 0;
    if (this.predictions.length > 0) {
      const totalConfidence = this.predictions.reduce((sum, p) => sum + p.confidence, 0);
      averageConfidence = Math.round((totalConfidence / this.predictions.length) * 100) / 100;
    }

    return {
      totalPredictions: this.predictions.length,
      resolvedPredictions: resolvedPredictions.length,
      correctPredictions: correctPredictions.length,
      accuracy: this.calculateAccuracy(),
      currentStreak: this.currentStreak,
      bestStreak: this.bestStreak,
      averageConfidence: averageConfidence
    };
  }

  /**
   * Analyze prediction accuracy by confidence level
   * 
   * @returns {Object} Confidence analysis with accuracy rates by confidence bucket
   */
  getConfidenceAnalysis() {
    const resolvedPredictions = this.predictions.filter(p => p.resolved);
    
    const buckets = {
      lowConfidence: { min: 1, max: 3, predictions: [], accuracy: 0, count: 0 },
      mediumConfidence: { min: 4, max: 7, predictions: [], accuracy: 0, count: 0 },
      highConfidence: { min: 8, max: 10, predictions: [], accuracy: 0, count: 0 }
    };

    // Sort predictions into confidence buckets
    resolvedPredictions.forEach(prediction => {
      const confidence = prediction.confidence;
      
      if (confidence >= buckets.lowConfidence.min && confidence <= buckets.lowConfidence.max) {
        buckets.lowConfidence.predictions.push(prediction);
      } else if (confidence >= buckets.mediumConfidence.min && confidence <= buckets.mediumConfidence.max) {
        buckets.mediumConfidence.predictions.push(prediction);
      } else if (confidence >= buckets.highConfidence.min && confidence <= buckets.highConfidence.max) {
        buckets.highConfidence.predictions.push(prediction);
      }
    });

    // Calculate accuracy for each bucket
    Object.keys(buckets).forEach(bucketKey => {
      const bucket = buckets[bucketKey];
      bucket.count = bucket.predictions.length;
      
      if (bucket.count > 0) {
        const correct = bucket.predictions.filter(p => p.correct).length;
        bucket.accuracy = Math.round((correct / bucket.count) * 100);
      }
      
      // Remove predictions array to clean up output
      delete bucket.predictions;
    });

    return buckets;
  }

  /**
   * Get prediction history sorted by recency
   * 
   * @param {number} limit - Optional limit on number of predictions returned
   * @returns {Array} Array of predictions sorted by timestamp (newest first)
   */
  getPredictionHistory(limit = null) {
    const sorted = [...this.predictions].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get current active prediction for a specific conflict
   * 
   * @param {Country} countryA - First country
   * @param {Country} countryB - Second country
   * @returns {Object|null} Active prediction or null if none exists
   */
  getCurrentPrediction(countryA, countryB) {
    return this.predictions.find(p => 
      !p.resolved &&
      ((p.countryACode === countryA.code && p.countryBCode === countryB.code) ||
       (p.countryACode === countryB.code && p.countryBCode === countryA.code))
    ) || null;
  }

  /**
   * Clear all prediction history and reset statistics
   */
  clearHistory() {
    this.predictions = [];
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.saveToStorage();
  }

  /**
   * Validate prediction input parameters
   * 
   * @private
   * @param {Country} countryA - First country
   * @param {Country} countryB - Second country
   * @param {number} winner - Predicted winner
   * @param {number} confidence - Confidence level
   * @returns {Object} Validation result
   */
  validatePrediction(countryA, countryB, winner, confidence) {
    if (!countryA || !countryB) {
      return { valid: false, error: 'Both countries must be provided' };
    }

    if (!countryA.name || !countryA.code || !countryB.name || !countryB.code) {
      return { valid: false, error: 'Both countries must be valid Country instances' };
    }

    if (winner !== 0 && winner !== 1) {
      return { valid: false, error: 'Winner must be 0 or 1' };
    }

    if (!Number.isInteger(confidence) || confidence < 1 || confidence > 10) {
      return { valid: false, error: 'Confidence must be between 1 and 10' };
    }

    return { valid: true };
  }

  /**
   * Generate unique prediction ID
   * 
   * @private
   * @returns {string} Unique prediction identifier
   */
  generatePredictionId() {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Load prediction data from localStorage
   * 
   * @private
   */
  loadFromStorage() {
    if (typeof localStorage === 'undefined') {
      return; // Not in browser environment
    }

    try {
      const stored = localStorage.getItem('conflict_predictions');
      if (stored) {
        const data = JSON.parse(stored);
        this.predictions = data.predictions || [];
        this.currentStreak = data.currentStreak || 0;
        this.bestStreak = data.bestStreak || 0;
      }
    } catch (error) {
      // Handle corrupted localStorage data
      console.warn('Failed to load prediction data from localStorage:', error);
      this.predictions = [];
      this.currentStreak = 0;
      this.bestStreak = 0;
    }
  }

  /**
   * Save prediction data to localStorage
   * 
   * @private
   */
  saveToStorage() {
    if (typeof localStorage === 'undefined') {
      return; // Not in browser environment
    }

    const data = {
      predictions: this.predictions,
      currentStreak: this.currentStreak,
      bestStreak: this.bestStreak,
      lastUpdated: Date.now()
    };

    try {
      localStorage.setItem('conflict_predictions', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save prediction data to localStorage:', error);
    }
  }
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PredictionSystem;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.PredictionSystem = PredictionSystem;
}