# Conflict Engine Core Documentation

## Overview

The Conflict Engine is the heart of the conflict simulation game, managing realistic battles between two countries with complex victory conditions, economic impacts, and dynamic territory control.

## Architecture

### Class: Conflict

The main `Conflict` class orchestrates all aspects of a conflict simulation between two countries.

#### Key Features

- **Dynamic Territory Control**: Realistic battle outcomes affect territory percentages
- **Economic Impact**: War costs gradually reduce GDP over time  
- **Multiple Victory Conditions**: Territorial, economic, diplomatic, and intervention endings
- **Event Logging**: Complete timeline of all conflict developments
- **Casualty Tracking**: Estimates military losses throughout conflict

## Battle Mechanics

### Battle Outcome Calculation

The `calculateBattleOutcome()` method determines the probability of Country A winning the next battle based on:

#### Factors (Weighted)
1. **Military Strength (50%)**: Personnel count + expenditure + nuclear bonus
2. **Economic Power (25%)**: GDP-based supply line and equipment advantages
3. **Territory Momentum (15%)**: Defender's advantage vs attacker's momentum
4. **Economic War Impact (10%)**: How current GDP decline affects performance

#### Territory Momentum Logic
- **Winning (>60% territory)**: Momentum bonus up to +4% probability
- **Losing (<40% territory)**: Desperation penalty up to -3% probability  
- **Contested (40-60%)**: Neutral territory factor

#### Random Element
- ±5% random factor added to prevent predictable outcomes
- Ensures realistic uncertainty in battle results

### Territory Updates

Territory changes occur through `updateTerritoryControl()`:

- **Base Change**: 1-4% territory per battle
- **Diminishing Returns**: Harder to gain territory when controlling >70%
- **Total Conservation**: Territory percentages always sum to exactly 100%
- **Casualty Calculation**: Estimates losses based on battle intensity

## Victory Conditions

The engine supports four distinct victory conditions:

### 1. Territorial Control Victory
- **Trigger**: Country controls ≥75% of territory
- **Most Common**: Direct military domination

### 2. Economic Collapse Victory  
- **Trigger**: Country's GDP falls below 30% of starting value
- **Realistic**: War costs can devastate economies

### 3. Diplomatic Resolution
- **Trigger**: Random chance increasing over time
- **Probability**: Up to 15% chance at 1000+ simulation ticks
- **Outcome**: Random winner through negotiated settlement

### 4. International Intervention
- **Trigger**: High casualty count (>500k) increases intervention probability
- **Probability**: Up to 20% chance based on casualty severity
- **Outcome**: Winner determined by current territory control

## Economic Impact System

### War Cost Modeling
- **GDP Reduction**: ~0.2% per battle + random variance
- **Minimum Floor**: GDP cannot fall below 30% of original
- **Progressive Impact**: Costs compound over extended conflicts

### Economic Victory Logic
- Tracks initial vs current GDP for both countries
- Victory triggered when country's economy collapses (< 30% original GDP)
- Affects battle performance through supply line disruption

## Event System

### Event Types
- **conflict_start**: Initial conflict declaration
- **battle**: Individual battle outcomes with territory changes
- **conflict_end**: Final victory declaration

### Event Structure
```javascript
{
  timestamp: Date,
  type: string,
  description: string, 
  territoryChange: [number, number], // Change for [countryA, countryB]
  casualties: number
}
```

### Event Timeline
- All events stored chronologically in `conflict.events` array
- Provides complete conflict history for UI display
- Includes casualty estimates and territory shift details

## Statistics and Monitoring

### Real-Time Stats (`getStats()`)
- Current territory control percentages
- Total conflict duration (in simulation ticks)
- Casualty estimates 
- Economic impact percentages
- Conflict status (ongoing/ended)
- Victory information (winner, condition)

### Performance Metrics
- Duration tracking for long-running conflicts
- Casualty accumulation for intervention triggers
- Economic decline monitoring for collapse victories

## Usage Example

```javascript
// Create countries
const usa = new Country(usaData);
const china = new Country(chinaData);

// Initialize conflict
const conflict = new Conflict(usa, china);

// Simulation loop
while (conflict.status === 'ongoing') {
  // Update territory based on battle
  conflict.updateTerritoryControl();
  conflict.duration++;
  
  // Check for victory conditions
  const victory = conflict.checkVictoryConditions();
  if (victory.hasWinner) {
    conflict.endConflict(victory.winner, victory.condition, victory.description);
  }
  
  // Get current stats for UI
  const stats = conflict.getStats();
  console.log(`${stats.duration}s: Territory ${stats.territoryControl[0]}%-${stats.territoryControl[1]}%`);
}

console.log(`Winner: ${conflict.countries[conflict.winner].name} via ${conflict.victoryCondition}`);
```

## Integration Points

### With Country Selection Algorithm
- Receives pre-selected country pair from CountrySelector
- Uses country military/economic data for calculations

### With Event System (Future)
- Will integrate with random events that modify conflict parameters
- Events can affect military effectiveness, economic costs, territory changes

### With UI System (Future) 
- Provides real-time statistics through `getStats()`
- Event timeline for live updates feed
- Territory percentages for progress bars

## Testing Coverage

The Conflict Engine maintains high test coverage:
- **97.02% Statement Coverage**
- **91.07% Branch Coverage** 
- **100% Function Coverage**

### Test Categories
- **Constructor Validation**: Proper initialization and error handling
- **Battle Mechanics**: Probability calculations and territory updates
- **Victory Conditions**: All four victory types and edge cases
- **Event System**: Event logging and timeline management
- **Statistics**: Comprehensive stat calculation and formatting

## Performance Considerations

### Memory Usage
- Events array grows with conflict length
- Consider event pruning for very long conflicts (>1000 events)

### Calculation Efficiency  
- Battle outcome calculation is O(1) complexity
- Territory updates include casualty and economic calculations
- Victory condition checks are optimized for common cases first

### Randomness Management
- Uses Math.random() for battle outcomes and victory chances
- Seeded randomness could be added for reproducible simulations

## Future Enhancements

### Planned Features
1. **Alliance Effects**: Multi-country conflicts with alliance dynamics
2. **Resource Integration**: Territory control affects resource access
3. **Weather/Terrain**: Geographic factors affecting battle outcomes  
4. **Nuclear Warfare**: Special mechanics for nuclear weapon usage
5. **Refugee Systems**: Population displacement tracking