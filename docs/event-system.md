# Event System Documentation

## Overview

The Event System adds unpredictability and realism to conflict simulations by introducing random events that can dramatically alter the course of a conflict. Events range from natural disasters to political upheavals, economic shocks, international pressure, and military developments.

## Architecture

### Class: EventGenerator

The `EventGenerator` class manages the creation, application, and tracking of random events throughout a conflict simulation.

#### Key Features

- **Configurable Event Probability**: Default 15% chance per simulation tick
- **Five Event Categories**: Natural disasters, political events, economic shocks, international pressure, military developments
- **Duration-Based Effects**: Events can have ongoing impacts over multiple turns
- **Realistic Impact Modeling**: Events affect territory, military efficiency, and GDP
- **Event Timeline Integration**: All events logged in conflict history

## Event Categories

### 1. Natural Disasters (natural_disaster)
Environmental events that disrupt military operations and economic activity.

#### Event Types
- **Major Earthquake**: Disrupts military infrastructure (-20% military efficiency)
- **Severe Flooding**: Hampers troop movements and shifts territory
- **Hurricane Strike**: Damages coastal operations and GDP
- **Severe Drought**: Affects supply lines and morale over extended period
- **Massive Wildfire**: Forces military redeployment, loses territory

#### Typical Effects
- Military efficiency reduction: 10-20%
- GDP impact: 1.5-3%
- Duration: 2-6 turns
- Territory shifts: 0-2%

### 2. Political Events (political_event)
Internal political developments that affect military capability and national stability.

#### Event Types
- **Government Coup**: Creates instability, major military efficiency impact
- **Mass Protests**: Anti-war sentiment reduces military morale
- **Leadership Change**: New strategy can improve or worsen performance
- **Political Scandal**: Corruption weakens war effort
- **Democratic Elections**: Policy uncertainty during transition

#### Typical Effects
- Military efficiency change: ±10-30%
- GDP impact: 0-5%
- Duration: 3-8 turns
- Asymmetric impact: Usually affects one country more than the other

### 3. Economic Events (economic_event)
Financial and trade-related developments affecting war economies.

#### Event Types
- **Trade War Escalation**: Sanctions intensify economic pressure
- **Economic Embargo**: Severe trade restrictions on one country
- **Global Recession**: Worldwide downturn affects both sides
- **Oil Price Shock**: Energy cost changes disrupt operations
- **Currency Crisis**: Exchange rate collapse affects imports
- **War Profiteering Boom**: Arms sales benefit one side's economy

#### Typical Effects
- GDP impact: 4-12% (can be positive for profiteering)
- Military efficiency impact: 10-20% (supply disruption)
- Duration: 5-12 turns (economic effects are longer-lasting)
- Can be symmetric (recession) or asymmetric (embargo)

### 4. International Pressure (international_pressure)
Diplomatic interventions and international community responses.

#### Event Types
- **UN Peace Resolution**: Calls for ceasefire, reduces aggression
- **International Mediation**: Major powers offer conflict resolution
- **Humanitarian Intervention**: Civilian protection forces separation
- **Allied Support**: Military aid boosts one side's capabilities
- **Peace Negotiations**: Forced diplomatic talks reduce hostilities

#### Typical Effects
- Military efficiency: Usually reduces aggression (10-20% decrease)
- Diplomacy bonus: Increases chance of diplomatic resolution
- Duration: 3-7 turns
- Territory impact: Sometimes forces separation/buffer zones
- Can provide military boosts through allied support

### 5. Military Developments (military_development)
Technological advances, intelligence breakthroughs, and strategic developments.

#### Event Types
- **New Weapons Technology**: Advanced weaponry provides significant advantage
- **Intelligence Breakthrough**: Strategic intelligence improves performance
- **Strategic Alliance**: New military partnerships boost capabilities
- **Cyber Warfare Attack**: Digital attacks disrupt communications
- **Special Operations Success**: Elite forces achieve tactical victories

#### Typical Effects
- Military efficiency change: ±10-20%
- Territory impact: Can provide immediate territorial gains (2-4%)
- Duration: 3-10 turns
- Highly asymmetric: Usually benefits one side significantly

## Event Mechanics

### Event Generation Process

1. **Probability Check**: Each simulation tick has configurable chance (default 15%)
2. **Type Selection**: Random selection from five event categories
3. **Event Creation**: Category-specific event generated with random parameters
4. **Effect Application**: Immediate and ongoing effects applied to conflict
5. **Timeline Logging**: Event recorded in conflict history

### Effect Application System

#### Immediate Effects
- **GDP Changes**: Applied instantly to current GDP values
- **Territory Changes**: Immediate territorial gains/losses
- **Military Efficiency**: Affects battle outcome calculations

#### Ongoing Effects
- **Duration Tracking**: Events remain active for specified turns
- **Continuous Impact**: Reduced ongoing effects each turn
- **Effect Decay**: Ongoing GDP effects reduced to 30% of initial impact
- **Automatic Expiration**: Events removed when duration reaches zero

### Integration with Conflict Engine

#### Battle Outcome Modification
Events don't directly modify battle calculations but affect the underlying factors:
- **Military Efficiency**: Stored in EventGenerator.activeEvents, accessed during battle calculations
- **Economic Impact**: GDP changes immediately affect economic power calculations
- **Territory Effects**: Direct territorial changes applied immediately

#### Victory Condition Interactions
- **Economic Collapse**: Event-driven GDP reduction can trigger economic victory
- **Diplomatic Resolution**: International pressure events increase diplomacy chances
- **Territorial Control**: Military events can push territory over 75% threshold

## Usage Examples

### Basic Event Generation
```javascript
const eventGenerator = new EventGenerator(0.15); // 15% event chance

// During simulation loop
const event = eventGenerator.generateRandomEvent(conflict);
if (event) {
  eventGenerator.applyEventEffects(conflict, event);
  console.log(`Event: ${event.description}`);
}

// Update ongoing events each turn
eventGenerator.updateActiveEvents(conflict);
```

### Custom Event Probability
```javascript
// Higher event frequency for chaotic scenarios
const chaoticEvents = new EventGenerator(0.25); // 25% chance

// Lower frequency for stable regions  
const stableEvents = new EventGenerator(0.08); // 8% chance
```

### Active Event Monitoring
```javascript
// Get current active events for UI display
const activeDescriptions = eventGenerator.getActiveEventsDescription();
console.log('Active Events:', activeDescriptions);

// Check specific event types
const eventTypes = eventGenerator.getEventTypes();
console.log('Available Event Categories:', eventTypes);
```

## Integration Points

### With Conflict Engine
- **Effect Application**: Modifies conflict.currentGDP, conflict.territoryControl
- **Event Logging**: Uses conflict.addEvent() for timeline integration  
- **Statistics Impact**: Events affect conflict.getStats() through GDP and territory changes

### With Battle System
- **Military Efficiency**: Active events modify battle outcome probabilities
- **Economic Factors**: GDP changes from events affect economic power calculations
- **Territory Momentum**: Immediate territory changes affect territorial control dynamics

### With Victory Conditions
- **Economic Victory**: Event-driven GDP collapse can end conflicts
- **Diplomatic Victory**: International pressure increases diplomatic resolution probability
- **Intervention Victory**: Severe events can trigger international intervention conditions

## Performance Considerations

### Memory Management
- **Active Events Array**: Grows with long-duration events, automatically pruned
- **Effect Storage**: Each active event stores effects object, consider limits for very long conflicts
- **Event History**: All events logged in conflict timeline, consider pruning for memory

### Calculation Efficiency
- **Event Generation**: O(1) selection from predefined event arrays
- **Effect Application**: O(1) direct property modifications
- **Update Processing**: O(n) where n = number of active events (typically < 10)

### Randomness Quality
- **Event Selection**: Uses Math.random() for type and parameter selection
- **Balanced Distribution**: Equal probability for each event category
- **Parameter Variation**: Random ranges ensure event variety within categories

## Testing Coverage

The Event System maintains comprehensive test coverage:
- **93.33% Statement Coverage**
- **88% Branch Coverage**  
- **100% Function Coverage**

### Test Categories
- **Event Generation**: Probability mechanics and type variety
- **Effect Application**: GDP, territory, and military efficiency changes
- **Duration Management**: Ongoing effects and expiration
- **Event Type Validation**: Each category creates appropriate events
- **Integration Testing**: Proper interaction with Conflict class

## Configuration Options

### Event Probability Tuning
```javascript
// Conservative (realistic)
new EventGenerator(0.10); // 10% chance per turn

// Moderate (default)
new EventGenerator(0.15); // 15% chance per turn  

// Chaotic (high drama)
new EventGenerator(0.25); // 25% chance per turn
```

### Duration Scaling
Event durations can be modified by adjusting the duration values in event definitions:
- **Short conflicts**: Reduce all durations by 50%
- **Extended conflicts**: Increase durations by 2x
- **Variable scaling**: Different scaling factors per event type

## Future Enhancements

### Planned Features
1. **Event Chains**: Sequential events triggered by previous events
2. **Country-Specific Events**: Events based on country characteristics (resources, government type)
3. **Seasonal Events**: Time-based events (monsoons, harvest cycles)
4. **Alliance Events**: Multi-country events affecting alliance members
5. **Nuclear Events**: Special handling for nuclear weapon usage
6. **Resource-Based Events**: Events affecting specific resources (oil embargoes, rare earth shortages)

### Advanced Mechanics
1. **Event Prerequisites**: Conditions that must be met for certain events
2. **Cascading Effects**: Events that trigger other events
3. **Player Influence**: User choices affecting event outcomes
4. **Regional Modifiers**: Geographic factors affecting event probability and impact
5. **Historical Context**: Events influenced by real-world historical patterns