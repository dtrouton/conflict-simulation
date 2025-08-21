const PredictionSystem = require('../js/prediction');
const Country = require('../js/country');

describe('PredictionSystem', () => {
  const usaData = {
    name: "United States",
    code: "US",
    military: { personnel: 1400000, expenditure: 778000000000, nuclear: true },
    economy: { gdp: 21430000000000, gdpPerCapita: 65280 },
    geography: { area: 9833517, population: 331002651, capital: [38.9072, -77.0369] },
    alliances: ["NATO", "AUKUS"],
    resources: ["oil", "coal", "agriculture"]
  };

  const chinaData = {
    name: "China",
    code: "CN",
    military: { personnel: 2035000, expenditure: 261000000000, nuclear: true },
    economy: { gdp: 14342000000000, gdpPerCapita: 10261 },
    geography: { area: 9596960, population: 1439323776, capital: [39.9042, 116.4074] },
    alliances: ["SCO"],
    resources: ["coal", "rare_earth", "agriculture"]
  };

  let predictionSystem, usa, china;

  beforeEach(() => {
    predictionSystem = new PredictionSystem();
    usa = new Country(usaData);
    china = new Country(chinaData);
    
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('constructor', () => {
    test('should initialize with empty prediction history', () => {
      expect(predictionSystem.predictions).toEqual([]);
      expect(predictionSystem.currentStreak).toBe(0);
      expect(predictionSystem.bestStreak).toBe(0);
    });

    test('should load existing data from localStorage', () => {
      // Mock localStorage with existing data
      const existingData = {
        predictions: [
          { winner: 0, confidence: 8, actualWinner: 0, correct: true, timestamp: Date.now() }
        ],
        currentStreak: 5,
        bestStreak: 10
      };
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('conflict_predictions', JSON.stringify(existingData));
      }
      
      const systemWithData = new PredictionSystem();
      expect(systemWithData.predictions).toHaveLength(1);
      expect(systemWithData.currentStreak).toBe(5);
      expect(systemWithData.bestStreak).toBe(10);
    });

    test('should handle corrupted localStorage data gracefully', () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('conflict_predictions', 'invalid json');
      }
      
      const systemWithBadData = new PredictionSystem();
      expect(systemWithBadData.predictions).toEqual([]);
      expect(systemWithBadData.currentStreak).toBe(0);
    });
  });

  describe('submitPrediction', () => {
    test('should accept valid prediction', () => {
      const result = predictionSystem.submitPrediction(usa, china, 0, 7);
      
      expect(result.success).toBe(true);
      expect(result.predictionId).toBeDefined();
      expect(predictionSystem.predictions).toHaveLength(1);
      
      const prediction = predictionSystem.predictions[0];
      expect(prediction.countryA).toBe('United States');
      expect(prediction.countryB).toBe('China');
      expect(prediction.winner).toBe(0);
      expect(prediction.confidence).toBe(7);
      expect(prediction.timestamp).toBeDefined();
      expect(prediction.resolved).toBe(false);
    });

    test('should validate winner selection', () => {
      const result1 = predictionSystem.submitPrediction(usa, china, 2, 5);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Winner must be 0 or 1');
      
      const result2 = predictionSystem.submitPrediction(usa, china, -1, 5);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Winner must be 0 or 1');
    });

    test('should validate confidence range', () => {
      const result1 = predictionSystem.submitPrediction(usa, china, 0, 0);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Confidence must be between 1 and 10');
      
      const result2 = predictionSystem.submitPrediction(usa, china, 1, 11);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Confidence must be between 1 and 10');
    });

    test('should validate country parameters', () => {
      const result1 = predictionSystem.submitPrediction(null, china, 0, 5);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Both countries must be provided');
      
      const result2 = predictionSystem.submitPrediction(usa, {}, 0, 5);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Both countries must be valid');
    });

    test('should prevent duplicate predictions for same conflict', () => {
      predictionSystem.submitPrediction(usa, china, 0, 7);
      const result = predictionSystem.submitPrediction(usa, china, 1, 5);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prediction already exists');
    });

    test('should save prediction to localStorage', () => {
      predictionSystem.submitPrediction(usa, china, 1, 8);
      
      if (typeof localStorage !== 'undefined') {
        const saved = JSON.parse(localStorage.getItem('conflict_predictions'));
        expect(saved.predictions).toHaveLength(1);
        expect(saved.predictions[0].confidence).toBe(8);
      }
    });
  });

  describe('resolvePrediction', () => {
    test('should resolve correct prediction and update streak', () => {
      const submitResult = predictionSystem.submitPrediction(usa, china, 0, 6);
      const result = predictionSystem.resolvePrediction(submitResult.predictionId, 0, 'territorial_control');
      
      expect(result.success).toBe(true);
      expect(result.correct).toBe(true);
      expect(predictionSystem.currentStreak).toBe(1);
      expect(predictionSystem.bestStreak).toBe(1);
      
      const prediction = predictionSystem.predictions[0];
      expect(prediction.resolved).toBe(true);
      expect(prediction.correct).toBe(true);
      expect(prediction.actualWinner).toBe(0);
      expect(prediction.victoryCondition).toBe('territorial_control');
    });

    test('should resolve incorrect prediction and reset streak', () => {
      // Set up existing streak
      predictionSystem.currentStreak = 5;
      predictionSystem.bestStreak = 5;
      
      const submitResult = predictionSystem.submitPrediction(usa, china, 0, 9);
      const result = predictionSystem.resolvePrediction(submitResult.predictionId, 1, 'economic_collapse');
      
      expect(result.success).toBe(true);
      expect(result.correct).toBe(false);
      expect(predictionSystem.currentStreak).toBe(0);
      expect(predictionSystem.bestStreak).toBe(5); // Best streak preserved
      
      const prediction = predictionSystem.predictions[0];
      expect(prediction.correct).toBe(false);
      expect(prediction.actualWinner).toBe(1);
    });

    test('should handle invalid prediction ID', () => {
      const result = predictionSystem.resolvePrediction('nonexistent', 0, 'diplomatic_resolution');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prediction not found');
    });

    test('should prevent resolving already resolved prediction', () => {
      const submitResult = predictionSystem.submitPrediction(usa, china, 1, 4);
      predictionSystem.resolvePrediction(submitResult.predictionId, 1, 'territorial_control');
      
      const result = predictionSystem.resolvePrediction(submitResult.predictionId, 0, 'diplomatic_resolution');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prediction already resolved');
    });

    test('should update best streak when current streak exceeds it', () => {
      predictionSystem.currentStreak = 3;
      predictionSystem.bestStreak = 2;
      
      const submitResult = predictionSystem.submitPrediction(usa, china, 0, 7);
      predictionSystem.resolvePrediction(submitResult.predictionId, 0, 'territorial_control');
      
      expect(predictionSystem.currentStreak).toBe(4);
      expect(predictionSystem.bestStreak).toBe(4);
    });
  });

  describe('calculateAccuracy', () => {
    test('should return 0% for no predictions', () => {
      const accuracy = predictionSystem.calculateAccuracy();
      expect(accuracy).toBe(0);
    });

    test('should calculate accuracy correctly', () => {
      // Add resolved predictions
      predictionSystem.predictions = [
        { resolved: true, correct: true },
        { resolved: true, correct: false },
        { resolved: true, correct: true },
        { resolved: false, correct: null } // Unresolved shouldn't count
      ];
      
      const accuracy = predictionSystem.calculateAccuracy();
      expect(accuracy).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
    });

    test('should handle all correct predictions', () => {
      predictionSystem.predictions = [
        { resolved: true, correct: true },
        { resolved: true, correct: true },
        { resolved: true, correct: true }
      ];
      
      expect(predictionSystem.calculateAccuracy()).toBe(100);
    });

    test('should handle all incorrect predictions', () => {
      predictionSystem.predictions = [
        { resolved: true, correct: false },
        { resolved: true, correct: false }
      ];
      
      expect(predictionSystem.calculateAccuracy()).toBe(0);
    });
  });

  describe('getStatistics', () => {
    test('should return comprehensive statistics', () => {
      predictionSystem.predictions = [
        { resolved: true, correct: true, confidence: 8 },
        { resolved: true, correct: false, confidence: 5 },
        { resolved: true, correct: true, confidence: 9 },
        { resolved: false, correct: null, confidence: 6 }
      ];
      predictionSystem.currentStreak = 2;
      predictionSystem.bestStreak = 4;
      
      const stats = predictionSystem.getStatistics();
      
      expect(stats.totalPredictions).toBe(4);
      expect(stats.resolvedPredictions).toBe(3);
      expect(stats.correctPredictions).toBe(2);
      expect(stats.accuracy).toBeCloseTo(66.67, 1);
      expect(stats.currentStreak).toBe(2);
      expect(stats.bestStreak).toBe(4);
      expect(stats.averageConfidence).toBeCloseTo(7.0, 1);
    });

    test('should handle empty prediction history', () => {
      const stats = predictionSystem.getStatistics();
      
      expect(stats.totalPredictions).toBe(0);
      expect(stats.accuracy).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });
  });

  describe('getConfidenceAnalysis', () => {
    test('should analyze confidence vs accuracy correlation', () => {
      predictionSystem.predictions = [
        { resolved: true, correct: true, confidence: 9 },   // High confidence, correct
        { resolved: true, correct: true, confidence: 8 },   // High confidence, correct  
        { resolved: true, correct: false, confidence: 3 },  // Low confidence, incorrect
        { resolved: true, correct: false, confidence: 2 },  // Low confidence, incorrect
        { resolved: true, correct: true, confidence: 7 },   // Medium confidence, correct
        { resolved: true, correct: false, confidence: 6 }   // Medium confidence, incorrect
      ];
      
      const analysis = predictionSystem.getConfidenceAnalysis();
      
      expect(analysis.highConfidence.accuracy).toBe(100); // 2/2 correct
      expect(analysis.mediumConfidence.accuracy).toBe(50); // 1/2 correct  
      expect(analysis.lowConfidence.accuracy).toBe(0);    // 0/2 correct
      
      expect(analysis.highConfidence.count).toBe(2);
      expect(analysis.mediumConfidence.count).toBe(2);
      expect(analysis.lowConfidence.count).toBe(2);
    });

    test('should handle empty or single confidence bucket', () => {
      predictionSystem.predictions = [
        { resolved: true, correct: true, confidence: 9 }
      ];
      
      const analysis = predictionSystem.getConfidenceAnalysis();
      expect(analysis.highConfidence.count).toBe(1);
      expect(analysis.mediumConfidence.count).toBe(0);
      expect(analysis.lowConfidence.count).toBe(0);
    });
  });

  describe('getPredictionHistory', () => {
    test('should return recent predictions first', () => {
      const now = Date.now();
      predictionSystem.predictions = [
        { timestamp: now - 3000, countryA: 'A', countryB: 'B' },
        { timestamp: now - 1000, countryA: 'C', countryB: 'D' },
        { timestamp: now - 2000, countryA: 'E', countryB: 'F' }
      ];
      
      const history = predictionSystem.getPredictionHistory();
      expect(history[0].countryA).toBe('C'); // Most recent
      expect(history[1].countryA).toBe('E'); // Second most recent
      expect(history[2].countryA).toBe('A'); // Oldest
    });

    test('should limit results when requested', () => {
      predictionSystem.predictions = new Array(10).fill(0).map((_, i) => ({
        timestamp: Date.now() + i,
        countryA: `Country${i}`,
        countryB: 'Test'
      }));
      
      const limited = predictionSystem.getPredictionHistory(5);
      expect(limited).toHaveLength(5);
    });
  });

  describe('clearHistory', () => {
    test('should clear all prediction data', () => {
      predictionSystem.predictions = [
        { resolved: true, correct: true, confidence: 8 }
      ];
      predictionSystem.currentStreak = 5;
      predictionSystem.bestStreak = 10;
      
      predictionSystem.clearHistory();
      
      expect(predictionSystem.predictions).toEqual([]);
      expect(predictionSystem.currentStreak).toBe(0);
      expect(predictionSystem.bestStreak).toBe(0);
    });

    test('should clear localStorage data', () => {
      predictionSystem.predictions = [{ test: 'data' }];
      predictionSystem.saveToStorage();
      
      predictionSystem.clearHistory();
      
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('conflict_predictions');
        const data = stored ? JSON.parse(stored) : null;
        expect(data.predictions).toEqual([]);
      }
    });
  });

  describe('getCurrentPrediction', () => {
    test('should return active prediction for conflict', () => {
      predictionSystem.submitPrediction(usa, china, 1, 7);
      
      const current = predictionSystem.getCurrentPrediction(usa, china);
      expect(current).toBeDefined();
      expect(current.winner).toBe(1);
      expect(current.confidence).toBe(7);
      expect(current.resolved).toBe(false);
    });

    test('should return null for no active prediction', () => {
      const current = predictionSystem.getCurrentPrediction(usa, china);
      expect(current).toBeNull();
    });

    test('should return null for resolved prediction', () => {
      const submitResult = predictionSystem.submitPrediction(usa, china, 0, 5);
      predictionSystem.resolvePrediction(submitResult.predictionId, 0, 'territorial_control');
      
      const current = predictionSystem.getCurrentPrediction(usa, china);
      expect(current).toBeNull();
    });
  });

  describe('persistence', () => {
    test('should automatically save after prediction submission', () => {
      predictionSystem.submitPrediction(usa, china, 1, 6);
      
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('conflict_predictions');
        expect(stored).toBeDefined();
        
        const data = JSON.parse(stored);
        expect(data.predictions).toHaveLength(1);
      }
    });

    test('should automatically save after prediction resolution', () => {
      const submitResult = predictionSystem.submitPrediction(usa, china, 0, 8);
      predictionSystem.resolvePrediction(submitResult.predictionId, 1, 'economic_collapse');
      
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('conflict_predictions');
        const data = JSON.parse(stored);
        
        expect(data.currentStreak).toBe(0);
        expect(data.predictions[0].resolved).toBe(true);
      }
    });
  });
});