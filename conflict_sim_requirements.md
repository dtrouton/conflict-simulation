# Conflict Simulation Game - Requirements Document

## Project Overview
Build a web-based, text-only conflict simulation game where users observe randomly generated conflicts between real countries in real-time. The primary interaction is predicting winners and watching outcomes unfold.

## Core Functionality

### 1. Conflict Generation
- **Random Country Selection**: At startup and after each conflict resolution, randomly select two countries from a global dataset
- **Conflict Initialization**: Generate realistic conflict scenarios based on:
  - Geographical proximity (border disputes more likely)
  - Historical relationships (past conflicts increase probability)
  - Current geopolitical tensions
  - Resource competition

### 2. Real-Time Simulation Engine
- **Update Frequency**: Display new developments every 3-10 seconds
- **Simulation Speed**: Allow 1x, 2x, 4x speed controls
- **Pause/Resume**: User can pause simulation at any time
- **Auto-advance**: Automatically start new conflict when current one ends

### 3. Prediction System
- **Winner Prediction**: Before conflict starts, user can predict the winner
- **Confidence Level**: User sets confidence (1-10 scale)
- **Accuracy Tracking**: Track prediction success rate over time
- **Statistics Display**: Show user's prediction history and accuracy

### 4. Victory Conditions
The simulation ends when one of these occurs:
- **Territorial Control**: One country controls 75%+ of opponent's territory
- **Economic Collapse**: Country's GDP falls below 30% of starting value
- **Diplomatic Resolution**: Random chance of negotiated settlement increases over time
- **International Intervention**: Major powers or UN force ceasefire (random event)

## Data Requirements

### Country Statistics (Real-World Data)
Required for each country:
- **Military**: Active personnel, military expenditure, nuclear weapons (Y/N)
- **Economic**: GDP, GDP per capita, military spending % of GDP
- **Geographic**: Land area, population, capital coordinates
- **Political**: Government type, alliance memberships (NATO, etc.)
- **Infrastructure**: Road network, ports, airports

### Data Sources
1. **Primary**: CIA World Factbook API
2. **Secondary**: World Bank Open Data API
3. **Military**: Stockholm International Peace Research Institute (SIPRI)
4. **Backup**: Manual data entry for critical countries if APIs unavailable

### Data Management
- **Refresh Policy**: Update all country data if older than 6 months at application startup
- **Caching**: Store data locally to minimize API calls
- **Fallback**: Include static dataset as backup if APIs are unavailable

## Real-Time Updates & Events

### Battle Progress Updates
Display every 5-15 seconds:
- Territory control percentage
- Casualty estimates
- Economic impact
- International response
- Refugee movements

### Random Events (15% chance per update cycle)
- **Natural Disasters**: Earthquakes, floods affecting military operations
- **Third-Party Involvement**: Neighboring countries choosing sides
- **Internal Politics**: Coups, elections, civil unrest
- **Economic Events**: Sanctions, oil price shocks, trade embargos
- **International Pressure**: UN resolutions, peace negotiations

### Status Indicators
- **Conflict Duration**: Real-time timer
- **Territory Control**: Percentage bars for each country
- **Morale**: Military and civilian morale indicators
- **International Support**: Allied nation backing levels

## User Interface Requirements

### Layout (Single Page Web App)
```
+----------------------------------------------------------+
|  CONFLICT SIMULATION                           [Speed: 2x] |
+----------------------------------------------------------+
| Country A vs Country B                    [Duration: 0:45] |
| [Flag] COUNTRY A (65% territory) | [Flag] COUNTRY B (35%) |
+----------------------------------------------------------+
| PREDICTION PANEL                                         |
| Winner: [Country A] [Country B]  Confidence: [Slider]   |
| [Submit Prediction] or [Conflict in Progress...]        |
+----------------------------------------------------------+
| LIVE UPDATES FEED                                       |
| [15:23] Country A advances on eastern front             |
| [15:21] Random Event: Trade embargo imposed             |
| [15:18] Country B requests international assistance     |
| [...scroll for more updates...]                        |
+----------------------------------------------------------+
| STATISTICS                                              |
| Territory: A 65% | B 35%  Military: A 234k | B 198k    |
| Economy: A -12% | B -8%   Morale: A High | B Medium    |
+----------------------------------------------------------+
| YOUR PREDICTIONS                                        |
| Accuracy: 67% (8/12)  Current Streak: 3                |
+----------------------------------------------------------+
```

### Required UI Elements
- **Country Information Cards**: Display key stats for each country
- **Real-time Update Feed**: Scrolling list of conflict developments
- **Progress Bars**: Visual representation of territory control, casualties
- **Prediction Interface**: Dropdown/buttons for winner selection
- **Speed Controls**: 1x, 2x, 4x simulation speed
- **Conflict Archive**: Button to view past conflict summaries

## Technical Requirements

### Technology Stack
- **Frontend**: HTML5, CSS3, vanilla JavaScript (or lightweight framework)
- **No Backend Required**: Client-side only application
- **Data Storage**: localStorage for user statistics and cached country data
- **APIs**: Fetch country data from external sources

### Performance Requirements
- **Load Time**: Initial page load < 3 seconds
- **Update Smoothness**: No lag between real-time updates
- **Memory Usage**: Efficient handling of country data (200+ countries)
- **Offline Capability**: Work with cached data if APIs unavailable

### Browser Compatibility
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Responsive**: Works on tablets and phones
- **No Plugins**: Pure web technologies, no Flash/Java

## Implementation Details

### Conflict Logic
```javascript
// Pseudo-code structure
class Conflict {
  constructor(countryA, countryB) {
    this.countries = [countryA, countryB];
    this.territoryControl = [50, 50]; // Initial 50/50 split
    this.duration = 0;
    this.events = [];
  }
  
  calculateAdvantage() {
    // Factor in military strength, economy, geography, alliances
    // Return probability of Country A advancing
  }
  
  processUpdate() {
    // Calculate battle outcomes
    // Apply random events
    // Update territory control
    // Check victory conditions
  }
}
```

### Data Structure
```javascript
// Country data format
const countryData = {
  name: "United States",
  code: "US",
  military: {
    personnel: 1400000,
    expenditure: 778000000000, // USD
    nuclear: true
  },
  economy: {
    gdp: 21430000000000, // USD
    gdpPerCapita: 65280
  },
  geography: {
    area: 9833517, // km²
    population: 331002651,
    capital: [38.9072, -77.0369] // lat, lng
  },
  alliances: ["NATO", "AUKUS"]
};
```

### File Structure
```
conflict-simulator/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── conflict.js
│   ├── countries.js
│   ├── events.js
│   └── ui.js
├── data/
│   └── countries-backup.json
└── README.md
```

## Success Criteria
1. **Functional**: Successfully simulates conflicts with realistic outcomes
2. **Engaging**: Users want to watch multiple conflicts in succession
3. **Educational**: Provides insight into real-world country capabilities
4. **Stable**: Runs without crashes for extended periods
5. **Accurate**: Uses current, reliable real-world data

## Future Enhancements (Not Required for MVP)
- Historical conflict replay mode
- Multiple simultaneous conflicts
- User-selectable conflict parameters
- Economic trade simulation during conflicts
- Alliance system with multiple countries per side