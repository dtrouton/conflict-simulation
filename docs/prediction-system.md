# Prediction System Documentation

## Overview

The Prediction System enables users to predict conflict outcomes and tracks their prediction accuracy over time. It provides comprehensive statistics, streak tracking, confidence analysis, and persistent storage of prediction history.

## Architecture

### Class: PredictionSystem

The `PredictionSystem` class manages all aspects of user predictions with sophisticated analytics and persistent storage.

#### Key Features

- **Prediction Submission**: Validate and store user predictions with confidence levels
- **Outcome Resolution**: Match predictions against actual conflict results  
- **Accuracy Tracking**: Calculate overall success rate and maintain statistics
- **Streak Management**: Track current and best prediction streaks
- **Confidence Analysis**: Analyze prediction accuracy by confidence level
- **Persistent Storage**: Automatic localStorage persistence across sessions
- **History Management**: Comprehensive prediction history with timeline

## Core Functionality

### Prediction Lifecycle

1. **Submission**: User predicts winner and confidence level (1-10)
2. **Validation**: System validates inputs and checks for duplicates
3. **Storage**: Prediction stored locally with unique ID
4. **Resolution**: When conflict ends, prediction resolved with actual outcome
5. **Analysis**: Statistics updated including accuracy and streaks

### Prediction Data Structure

```javascript
const prediction = {
  id: "1634567890_abc123def",           // Unique identifier
  countryA: "United States",            // First country name
  countryACode: "US",                   // First country code  
  countryB: "China",                    // Second country name
  countryBCode: "CN",                   // Second country code
  winner: 0,                            // Predicted winner (0 or 1)
  confidence: 7,                        // Confidence level (1-10)
  timestamp: 1634567890123,             // Submission time
  resolved: false,                      // Resolution status
  correct: null,                        // Prediction correctness (when resolved)
  actualWinner: null,                   // Actual conflict winner (when resolved)
  victoryCondition: null                // How conflict ended (when resolved)
}
```

## API Methods

### Prediction Management

#### `submitPrediction(countryA, countryB, winner, confidence)`
Submit a new prediction for an upcoming conflict.

**Parameters:**
- `countryA` (Country): First country object
- `countryB` (Country): Second country object  
- `winner` (number): Predicted winner (0 for countryA, 1 for countryB)
- `confidence` (number): Confidence level (1-10)

**Returns:**
```javascript
{
  success: true,
  predictionId: "1634567890_abc123def"
}
// OR
{
  success: false,
  error: "Validation error message"
}
```

**Validation Rules:**
- Both countries must be valid Country instances
- Winner must be 0 or 1
- Confidence must be integer between 1-10
- No existing unresolved prediction for the same conflict

#### `resolvePrediction(predictionId, actualWinner, victoryCondition)`
Resolve a prediction with the actual conflict outcome.

**Parameters:**
- `predictionId` (string): ID of prediction to resolve
- `actualWinner` (number): Actual winning country (0 or 1)
- `victoryCondition` (string): Victory type ("territorial_control", "economic_collapse", etc.)

**Returns:**
```javascript
{
  success: true,
  correct: true,              // Whether prediction was correct
  currentStreak: 5,           // Updated current streak
  bestStreak: 8               // Updated best streak
}
```

### Statistics and Analysis

#### `calculateAccuracy()`
Calculate overall prediction accuracy percentage.

**Returns:** `number` - Accuracy percentage (0-100)

#### `getStatistics()`
Get comprehensive prediction statistics.

**Returns:**
```javascript
{
  totalPredictions: 25,       // Total predictions made
  resolvedPredictions: 20,    // Predictions that have been resolved
  correctPredictions: 14,     // Correct predictions
  accuracy: 70.0,             // Overall accuracy percentage
  currentStreak: 3,           // Current correct prediction streak
  bestStreak: 7,              // Best streak achieved
  averageConfidence: 6.8      // Average confidence level
}
```

#### `getConfidenceAnalysis()`
Analyze prediction accuracy by confidence level brackets.

**Returns:**
```javascript
{
  lowConfidence: {            // Confidence 1-3
    min: 1, max: 3,
    accuracy: 45,             // Accuracy percentage for this bracket
    count: 8                  // Number of predictions in bracket
  },
  mediumConfidence: {         // Confidence 4-7
    min: 4, max: 7,
    accuracy: 68,
    count: 12
  },
  highConfidence: {           // Confidence 8-10
    min: 8, max: 10,
    accuracy: 85,
    count: 5
  }
}
```

### History Management

#### `getPredictionHistory(limit = null)`
Get prediction history sorted by recency.

**Parameters:**
- `limit` (number, optional): Maximum number of predictions to return

**Returns:** `Array` - Array of prediction objects, newest first

#### `getCurrentPrediction(countryA, countryB)`
Get active prediction for a specific conflict.

**Returns:** `Object|null` - Active prediction or null if none exists

#### `clearHistory()`
Clear all prediction data and reset statistics.

## Streak Management

### Streak Logic
- **Current Streak**: Consecutive correct predictions
- **Best Streak**: Highest streak achieved all-time
- **Streak Reset**: Incorrect prediction resets current streak to 0
- **Streak Update**: Correct prediction increments current streak

### Streak Persistence
- Streaks automatically saved to localStorage
- Preserved across browser sessions
- Best streak never decreases (only increases)

## Confidence Analysis

### Confidence Brackets
- **Low Confidence (1-3)**: Uncertain predictions
- **Medium Confidence (4-7)**: Moderate certainty predictions  
- **High Confidence (8-10)**: High certainty predictions

### Analysis Benefits
- Identify overconfidence or underconfidence patterns
- Calibrate confidence levels for better accuracy
- Track improvement in prediction quality over time

## Persistent Storage

### localStorage Schema
```javascript
{
  predictions: [...],           // Array of all predictions
  currentStreak: 5,            // Current correct streak
  bestStreak: 12,              // Best streak achieved
  lastUpdated: 1634567890123   // Last save timestamp
}
```

### Storage Management
- **Automatic Saving**: After prediction submission and resolution
- **Error Handling**: Graceful degradation if localStorage unavailable
- **Data Recovery**: Handles corrupted localStorage data
- **Cross-Session**: Data persists across browser sessions

## Usage Examples

### Basic Prediction Flow
```javascript
const predictionSystem = new PredictionSystem();

// Submit prediction
const submitResult = predictionSystem.submitPrediction(usa, china, 0, 8);
if (submitResult.success) {
  console.log(`Prediction submitted: ${submitResult.predictionId}`);
}

// Later, when conflict ends...
const resolveResult = predictionSystem.resolvePrediction(
  submitResult.predictionId, 
  0, 
  'territorial_control'
);

console.log(`Prediction ${resolveResult.correct ? 'correct' : 'incorrect'}`);
console.log(`Current streak: ${resolveResult.currentStreak}`);
```

### Statistics Monitoring
```javascript
const stats = predictionSystem.getStatistics();
console.log(`Accuracy: ${stats.accuracy}% (${stats.correctPredictions}/${stats.resolvedPredictions})`);
console.log(`Current streak: ${stats.currentStreak}, Best: ${stats.bestStreak}`);

// Confidence analysis
const confidence = predictionSystem.getConfidenceAnalysis();
console.log(`High confidence accuracy: ${confidence.highConfidence.accuracy}%`);
```

### History Review
```javascript
// Get recent predictions
const recentPredictions = predictionSystem.getPredictionHistory(10);
recentPredictions.forEach(prediction => {
  console.log(`${prediction.countryA} vs ${prediction.countryB}: ${prediction.correct ? '✓' : '✗'}`);
});

// Check for active prediction
const activePrediction = predictionSystem.getCurrentPrediction(usa, china);
if (activePrediction) {
  console.log(`Active prediction: ${activePrediction.winner === 0 ? usa.name : china.name} (confidence: ${activePrediction.confidence})`);
}
```

## Integration Points

### With Conflict Engine
- **Pre-Conflict**: Predictions submitted before conflict starts
- **Post-Conflict**: Predictions resolved when conflict.endConflict() called
- **Victory Conditions**: Uses actual victory condition for resolution

### With UI System (Future)
- **Prediction Interface**: Submit predictions through UI forms
- **Statistics Display**: Real-time accuracy and streak display
- **History View**: Scrollable prediction history
- **Confidence Visualization**: Charts showing confidence vs accuracy

### With User Experience
- **Engagement**: Streak tracking encourages continued participation
- **Learning**: Confidence analysis helps users improve predictions
- **Achievement**: Best streak provides long-term goal
- **Personalization**: Statistics create unique user profile

## Performance Considerations

### Memory Usage
- **Prediction Storage**: Each prediction ~200 bytes
- **History Limit**: Consider pruning very old predictions (>1000)
- **localStorage Limit**: Monitor storage quota usage

### Calculation Efficiency
- **Statistics**: O(n) calculation where n = number of predictions
- **Confidence Analysis**: O(n) with three-pass sorting
- **History Sorting**: O(n log n) for timestamp sorting

### Storage Performance
- **Batch Saves**: Single localStorage write per operation
- **Compression**: Consider JSON compression for large histories
- **Cleanup**: Periodic cleanup of resolved predictions

## Testing Coverage

The Prediction System maintains excellent test coverage:
- **97.24% Statement Coverage**
- **86.66% Branch Coverage**
- **100% Function Coverage**

### Test Categories
- **Input Validation**: All validation rules and error cases
- **Prediction Lifecycle**: Submission through resolution
- **Statistics Calculation**: Accuracy, streaks, confidence analysis
- **Persistence**: localStorage saving and loading
- **Edge Cases**: Corrupted data, missing localStorage, boundary conditions

## Error Handling

### Validation Errors
- Invalid country objects
- Out-of-range confidence levels
- Duplicate predictions for same conflict

### Storage Errors
- localStorage unavailable (graceful degradation)
- Corrupted stored data (reset to defaults)
- Storage quota exceeded (warning logged)

### Resolution Errors
- Invalid prediction ID
- Already resolved predictions
- Missing prediction data

## Future Enhancements

### Planned Features
1. **Prediction Insights**: AI-powered prediction hints based on country data
2. **Social Features**: Compare accuracy with other users
3. **Achievement System**: Badges for streaks and accuracy milestones
4. **Export Data**: Download prediction history as CSV/JSON
5. **Prediction Categories**: Separate tracking for different conflict types
6. **Time-Based Analysis**: Accuracy trends over time
7. **Difficulty Scoring**: Weight predictions by conflict difficulty

### Advanced Analytics
1. **Machine Learning**: Predict user confidence calibration
2. **Pattern Recognition**: Identify prediction biases and tendencies  
3. **Recommendation Engine**: Suggest confidence levels based on past performance
4. **Risk Analysis**: Calculate prediction value based on confidence and accuracy