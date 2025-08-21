# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based conflict simulation game that displays real-time conflicts between randomly selected countries. Users can predict winners and track their accuracy over time. The application is client-side only, using real-world country data from external APIs with localStorage caching.

## Development Commands

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode during development
- `npm run test:coverage` - Generate test coverage report
- Jest coverage thresholds are set to 70-75% minimum across all metrics

### Development Server
- `npm run serve` - Start local development server on port 8000
- Open `http://localhost:8000` in browser

### Code Coverage
The project maintains strict coverage requirements:
- Branches: 70%+
- Functions: 75%+
- Lines: 75%+
- Statements: 75%+

## Architecture

### Core Game Loop
The simulation follows this pattern:
1. **Country Selection** - Algorithm selects two countries based on geographical proximity, historical tensions, and resource competition
2. **Conflict Initialization** - Creates new conflict with 50/50 territory split
3. **Real-time Updates** - Updates every 3-10 seconds with battle progress and random events
4. **Victory Detection** - Monitors for 4 victory conditions (territorial control, economic collapse, diplomatic resolution, international intervention)
5. **Prediction Tracking** - Records user predictions and calculates accuracy statistics

### Module Structure
- **country.js** - Country data model and military/economic calculations
- **conflict.js** - Core conflict simulation logic and victory conditions
- **events.js** - Random event system (15% chance per update cycle)
- **prediction.js** - User prediction tracking and statistics
- **simulation.js** - Real-time engine with speed controls and timing
- **ui.js** - UI updates and user interaction handling
- **main.js** - Application initialization and coordination

### Data Flow
1. **External APIs** → **localStorage cache** → **Country objects**
2. **Country Selection Algorithm** → **Conflict creation**
3. **Simulation Engine** → **Event System** → **UI Updates**
4. **User Predictions** → **localStorage persistence** → **Statistics tracking**

### API Integration Strategy
The application uses multiple data sources with fallback hierarchy:
1. CIA World Factbook API (primary military/geographic data)
2. World Bank API (economic indicators)
3. SIPRI API (military expenditure)
4. Static JSON backup (fallback when APIs unavailable)

Data is cached in localStorage with 6-month freshness checks and LRU eviction.

### Testing Strategy
- **Unit tests** for individual class methods and calculations
- **Integration tests** for component interactions (Conflict + Events, UI + Simulation)
- **localStorage mocking** is set up in tests/setup.js
- **fetch mocking** is available globally for API testing
- **Timer testing** should use Jest fake timers for simulation engine tests

### Performance Considerations
- Memory target: < 50MB total with 200+ countries cached
- Load time target: < 3 seconds initial load
- Update smoothness: No frame drops during real-time updates
- API rate limiting: < 100 requests/hour compliance
- localStorage quota: < 5MB per user

### Mobile Support Requirements
The UI must support:
- Viewport widths from 320px+
- Touch gestures for interaction
- Responsive layout adapting country cards and control panels
- Fixed bottom positioning for mobile controls