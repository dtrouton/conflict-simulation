# Real-time Simulation Engine Documentation

## Overview

The Real-time Simulation Engine is the orchestration layer that coordinates all subsystems of the conflict simulation. It provides real-time updates, speed controls, automatic conflict management, and comprehensive event emission for UI integration.

## Architecture

### Class: SimulationEngine

The `SimulationEngine` class manages the entire simulation lifecycle with sophisticated timing controls, performance monitoring, and memory management.

#### Key Features

- **Real-time Orchestration**: Coordinates all subsystems with configurable update intervals
- **Speed Controls**: Variable speed multipliers (1x, 2x, 4x, up to 8x)
- **Auto-advancement**: Automatic progression through conflicts with seamless transitions
- **Event System**: Comprehensive event emission for UI integration and monitoring
- **Prediction Integration**: Automatic prediction resolution when conflicts end
- **Performance Monitoring**: Memory usage tracking and optimization
- **Error Handling**: Graceful degradation and continued operation during errors

## Core Functionality

### Simulation Lifecycle

1. **Initialization**: Set up countries, configuration, and subsystems
2. **Start**: Begin simulation loop and create initial conflict
3. **Update Loop**: Process updates at configurable intervals with speed multipliers
4. **Conflict Management**: Auto-advance to new conflicts when current ones end
5. **Stop**: Clean shutdown with resource cleanup and archival

### Configuration Options

```javascript
const config = {
  updateInterval: 5000,        // Base update interval in milliseconds (default: 5000)
  autoAdvance: true,           // Auto-create new conflicts (default: true)
  eventProbability: 0.15       // Random event probability per update (default: 0.15)
};

const engine = new SimulationEngine(countries, config);
```

## API Methods

### Core Control Methods

#### `constructor(countries, config)`
Initialize the simulation engine with countries and configuration.

**Parameters:**
- `countries` (Array): Array of Country instances (minimum 2 required)
- `config` (number|Object): Update interval in ms or configuration object

**Configuration Object:**
```javascript
{
  updateInterval: 5000,     // Base update interval (ms)
  autoAdvance: true,        // Auto-advance to new conflicts
  eventProbability: 0.15    // Random event probability (0-1)
}
```

#### `start()`
Start the simulation engine and begin the update loop.

**Actions:**
- Sets running state to true
- Creates initial conflict between randomly selected countries
- Starts the update timer
- Emits 'started' and 'conflict_created' events

#### `stop()`
Stop the simulation engine and clean up resources.

**Actions:**
- Sets running state to false
- Clears update timer
- Archives current conflict
- Emits 'stopped' event

#### `pause()`
Pause the simulation (maintains running state but stops updates).

**Actions:**
- Sets paused state to true
- Clears update timer
- Emits 'paused' event

#### `resume()`
Resume a paused simulation.

**Actions:**
- Sets paused state to false
- Restarts update timer
- Emits 'resumed' event

### Speed Control

#### `setSpeed(speed)`
Set simulation speed multiplier.

**Parameters:**
- `speed` (number): Speed multiplier (1-8, supports decimals)

**Effects:**
- Updates current interval calculation
- Restarts timer if simulation is running
- Emits 'speed_changed' event

#### `getCurrentInterval()`
Get current update interval accounting for speed multiplier.

**Returns:** `number` - Effective interval in milliseconds

**Formula:** `Math.round(baseInterval / speed)`

### Prediction Integration

#### `submitPrediction(winner, confidence)`
Submit a prediction for the current conflict.

**Parameters:**
- `winner` (number): Predicted winner (0 or 1)
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
  error: "No active conflict to predict"
}
```

### Update Processing

#### `processUpdate()`
Process a single simulation update (called automatically by timer).

**Update Sequence:**
1. Increment conflict duration
2. Update territory control through battle calculations
3. Generate and apply random events
4. Update ongoing event effects
5. Check victory conditions
6. End conflict if victory achieved
7. Emit update events
8. Update performance metrics
9. Periodic memory optimization

### Statistics and Monitoring

#### `getSimulationStats()`
Get comprehensive simulation statistics.

**Returns:**
```javascript
{
  uptime: 120000,              // Milliseconds since start
  totalConflicts: 5,           // Total conflicts created
  currentConflict: {           // Current conflict details
    duration: 15,
    countries: ["USA", "China"],
    stats: { /* conflict stats */ }
  },
  predictionStats: { /* prediction statistics */ },
  speed: 2,                    // Current speed multiplier
  running: true,               // Running state
  paused: false                // Paused state
}
```

#### `getMemoryUsage()`
Get memory usage statistics and estimates.

**Returns:**
```javascript
{
  conflictHistory: 25,         // Number of archived conflicts
  predictions: 150,            // Number of stored predictions
  activeEvents: 3,             // Number of ongoing events
  totalEstimatedMB: 2.5        // Estimated memory usage in MB
}
```

#### `getPerformanceStats()`
Get performance metrics and timing information.

**Returns:**
```javascript
{
  averageUpdateTime: 12.5,     // Average update processing time (ms)
  totalUpdates: 1200,          // Total updates processed
  updatesPerSecond: 0.2        // Average update frequency
}
```

## Event System

### Event Types

The simulation engine emits comprehensive events for UI integration and monitoring:

#### Core Lifecycle Events

- **`started`**: Simulation engine started
- **`stopped`**: Simulation engine stopped
- **`paused`**: Simulation paused
- **`resumed`**: Simulation resumed
- **`speed_changed`**: Speed multiplier changed

#### Conflict Events

- **`conflict_created`**: New conflict started
- **`conflict_ended`**: Conflict completed with victory details
- **`update`**: Regular simulation update with current state

#### Random Events

- **`random_event`**: Random event generated and applied

#### Prediction Events

- **`prediction_resolved`**: User prediction resolved with outcome

#### Error Events

- **`error`**: Error occurred during processing (simulation continues)

### Event Listener Management

#### `on(event, callback)`
Add event listener for specified event type.

#### `off(event, callback)`
Remove specific event listener.

### Event Data Structures

```javascript
// Started event
{
  conflict: Conflict,          // Initial conflict object
  timestamp: 1634567890123
}

// Update event
{
  conflict: Conflict,          // Current conflict
  duration: 15,                // Conflict duration
  stats: {                     // Real-time statistics
    territoryControl: [45, 55],
    casualties: [1200, 800],
    economicImpact: [-0.05, -0.03]
  }
}

// Conflict ended event
{
  conflict: Conflict,          // Completed conflict
  victory: {                   // Victory details
    winner: 0,
    condition: "territorial_control",
    description: "Achieved 75% territorial control"
  },
  duration: 45                 // Final conflict duration
}

// Random event
{
  event: {                     // Generated event
    type: "natural_disaster",
    description: "Severe earthquake disrupts supply lines",
    effects: { /* event effects */ }
  },
  conflict: Conflict           // Affected conflict
}

// Speed changed event
{
  oldSpeed: 1,                 // Previous speed
  newSpeed: 2,                 // New speed
  currentInterval: 2500        // New effective interval
}
```

## Subsystem Integration

### Country Selection System

- **Integration**: Uses CountrySelector for conflict pair generation
- **Timing**: New conflicts created after previous ones end (100ms delay)
- **Selection**: Weighted random selection based on geographic, historical, and political factors

### Conflict Engine

- **Integration**: Manages active Conflict instance lifecycle
- **Updates**: Calls conflict.updateTerritoryControl() and victory condition checks
- **Resolution**: Handles conflict.endConflict() when victory conditions met

### Event Generation System

- **Integration**: Uses EventGenerator for random event creation and management
- **Probability**: Configurable event probability (default 15% per update)
- **Effects**: Applies event effects to active conflict state

### Prediction System

- **Integration**: Automatic prediction submission and resolution
- **Validation**: Prevents duplicate predictions for same conflict
- **Resolution**: Resolves predictions when conflicts end with actual outcomes

## Performance Optimization

### Memory Management

#### Automatic Optimization
- **Conflict History**: Limited to last 50 conflicts
- **Prediction History**: Limited to last 1000 predictions
- **Update Metrics**: Limited to last 50 measurements
- **Optimization Interval**: Every 60 seconds

#### `optimizeDataStructures()`
Manually trigger memory optimization:
- Prune old conflict history
- Clean up prediction data
- Limit update time history
- Save optimized data to storage

### Timing Precision

#### Update Intervals
- **Base Interval**: 5000ms default (3-10 seconds recommended)
- **Speed Calculation**: `interval = baseInterval / speed`
- **Timer Management**: Automatic restart when speed changes
- **Precision**: Rounded to nearest millisecond

#### Performance Monitoring
- **Update Time Tracking**: Measures processing time for each update
- **Average Calculation**: Rolling average of last 100 updates
- **Performance Stats**: Updates per second calculation

## Error Handling

### Graceful Degradation

#### Update Errors
```javascript
try {
  // Process update logic
} catch (error) {
  this.emit('error', { error, context: 'processUpdate' });
  console.warn('Simulation update error:', error);
  // Continue running despite errors
}
```

#### Configuration Validation
- **Country Validation**: Minimum 2 countries required
- **Speed Limits**: 0 < speed ≤ 8
- **Interval Validation**: Positive update intervals only

#### Memory Recovery
- **localStorage Errors**: Graceful handling of storage failures
- **Data Corruption**: Reset to defaults when data is corrupted
- **Resource Cleanup**: Automatic cleanup on stop()

## Usage Examples

### Basic Simulation Setup

```javascript
const countries = [usa, china, russia, uk, france];
const engine = new SimulationEngine(countries);

// Start simulation
engine.start();

// Monitor events
engine.on('conflict_created', (data) => {
  console.log(`New conflict: ${data.countries[0].name} vs ${data.countries[1].name}`);
});

engine.on('update', (data) => {
  console.log(`Turn ${data.duration}: Territory ${data.stats.territoryControl}`);
});
```

### Advanced Configuration

```javascript
const config = {
  updateInterval: 3000,        // 3 second updates
  autoAdvance: true,           // Auto-create new conflicts
  eventProbability: 0.2        // 20% event chance
};

const engine = new SimulationEngine(countries, config);
engine.setSpeed(2);           // 2x speed (1.5 second effective interval)
```

### Prediction Integration

```javascript
engine.on('conflict_created', () => {
  // Submit prediction for new conflict
  const result = engine.submitPrediction(0, 7); // Predict country 0 wins, confidence 7
  if (result.success) {
    console.log(`Prediction submitted: ${result.predictionId}`);
  }
});

engine.on('prediction_resolved', (data) => {
  console.log(`Prediction ${data.predictionResult.correct ? 'correct' : 'wrong'}`);
});
```

### Performance Monitoring

```javascript
setInterval(() => {
  const stats = engine.getPerformanceStats();
  const memory = engine.getMemoryUsage();
  
  console.log(`Performance: ${stats.averageUpdateTime}ms avg, ${stats.updatesPerSecond}/sec`);
  console.log(`Memory: ${memory.totalEstimatedMB}MB estimated`);
}, 30000);
```

## Integration with UI Systems

### Real-time Updates

```javascript
engine.on('update', (data) => {
  // Update progress bars
  updateTerritoryBars(data.stats.territoryControl);
  
  // Update country information
  updateCountryCards(data.conflict.countries, data.stats);
  
  // Add to activity feed
  addActivityUpdate(data.duration, data.stats);
});
```

### Event Feed Integration

```javascript
engine.on('random_event', (data) => {
  addEventToFeed({
    type: data.event.type,
    description: data.event.description,
    timestamp: Date.now()
  });
});
```

### Control Panel Integration

```javascript
// Speed controls
document.getElementById('speed-1x').onclick = () => engine.setSpeed(1);
document.getElementById('speed-2x').onclick = () => engine.setSpeed(2);
document.getElementById('speed-4x').onclick = () => engine.setSpeed(4);

// Pause/resume controls
document.getElementById('pause').onclick = () => engine.pause();
document.getElementById('resume').onclick = () => engine.resume();
```

## Testing Coverage

The Simulation Engine maintains comprehensive test coverage:
- **43 Total Tests** across all functionality
- **Coverage**: High coverage across statements, branches, and functions
- **Timer Testing**: Uses Jest fake timers for precise timing tests
- **Event Testing**: Comprehensive event emission verification
- **Error Testing**: Graceful error handling validation

### Test Categories

- **Constructor**: Initialization and configuration validation
- **Lifecycle**: Start, stop, pause, resume operations
- **Speed Control**: Speed multiplier and timer management
- **Update Processing**: Core simulation loop functionality
- **Event Handling**: Event listener management and emission
- **Prediction Integration**: Prediction submission and resolution
- **Statistics**: Performance and memory monitoring
- **Error Handling**: Graceful error recovery

## Future Enhancements

### Planned Features

1. **Save/Load System**: Serialize and restore simulation state
2. **Replay System**: Record and replay simulation sequences
3. **Multiple Conflicts**: Support simultaneous conflicts
4. **Custom Events**: User-defined event creation
5. **AI Predictions**: System-generated prediction hints
6. **Tournament Mode**: Structured multi-conflict campaigns

### Performance Improvements

1. **Web Workers**: Move processing to background threads
2. **Lazy Loading**: On-demand country data loading
3. **Compression**: Compress archived data for storage
4. **Caching**: Intelligent caching of calculations
5. **Batching**: Batch multiple updates for high-speed simulation

### Advanced Analytics

1. **Trend Analysis**: Long-term statistical trends
2. **Pattern Recognition**: Identify recurring conflict patterns
3. **Predictive Modeling**: Machine learning outcome prediction
4. **Heat Maps**: Geographic conflict probability visualization