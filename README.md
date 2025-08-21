# Conflict Simulation Game

A web-based, real-time conflict simulation game where users observe randomly generated conflicts between real countries and predict winners. Built with vanilla JavaScript and comprehensive test coverage.

![Test Status](https://img.shields.io/badge/tests-256%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-75%25+-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎮 Features

- **Real-time Simulation**: Watch conflicts unfold with 3-10 second updates
- **Country Data**: Based on real-world military, economic, and geographic data
- **Prediction System**: Predict winners and track your accuracy over time
- **Random Events**: Natural disasters, political upheaval, and international pressure
- **Victory Conditions**: Territorial control, economic collapse, diplomatic resolution, international intervention
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline Capable**: Cached data allows operation without internet connection

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14+ recommended) - for running tests
- **Python 3** - for local development server
- Modern web browser (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dtrouton/conflict-simulation.git
   cd conflict-simulation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run serve
   ```

4. **Open in browser**:
   Navigate to `http://localhost:8000`

That's it! The game should load and start simulating conflicts automatically.

## 🧪 Testing

The project maintains comprehensive test coverage with 256 tests across 9 test suites.

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage Requirements

- **Branches**: 70%+
- **Functions**: 75%+  
- **Lines**: 75%+
- **Statements**: 75%+

Coverage reports are generated in the `coverage/` directory with detailed HTML reports.

### Test Structure

- **Unit Tests**: Individual class methods and calculations
- **Integration Tests**: Component interactions and workflows
- **End-to-End Tests**: Complete simulation lifecycles
- **Error Handling**: Network failures, corrupted data, edge cases

## 📁 Project Structure

```
conflict-simulation/
├── index.html              # Main application entry point
├── package.json            # Dependencies and scripts
├── css/
│   └── styles.css          # Application styling
├── js/                     # Core application modules
│   ├── main.js             # Application initialization
│   ├── country.js          # Country data model
│   ├── country-selector.js # Country selection algorithm
│   ├── conflict.js         # Conflict simulation engine
│   ├── events.js           # Random event system
│   ├── prediction.js       # User prediction tracking
│   ├── simulation.js       # Real-time simulation orchestration
│   ├── data-service.js     # API integration & caching
│   ├── ui-controller.js    # UI management & responsive design
│   └── ui.js              # UI initialization & utilities
├── tests/                  # Comprehensive test suite
│   ├── setup.js           # Jest configuration
│   ├── *.test.js          # Unit tests for each module
│   └── integration.test.js # End-to-end integration tests
├── docs/                   # Detailed technical documentation
│   ├── conflict-engine.md
│   ├── simulation-engine.md
│   ├── prediction-system.md
│   ├── event-system.md
│   ├── data-service.md
│   ├── ui-system.md
│   ├── integration-tests.md
│   └── project-status.md
└── data/                   # Static fallback data (future use)
```

## 📖 Documentation

Comprehensive technical documentation is available in the `docs/` directory:

### Core Systems
- **[Conflict Engine](docs/conflict-engine.md)** - Battle calculations, victory conditions, statistics
- **[Simulation Engine](docs/simulation-engine.md)** - Real-time orchestration, speed controls, event handling
- **[Prediction System](docs/prediction-system.md)** - User predictions, accuracy tracking, statistics
- **[Event System](docs/event-system.md)** - Random events, effects, ongoing event management

### Infrastructure
- **[Data Service](docs/data-service.md)** - API integration, caching, offline fallbacks
- **[UI System](docs/ui-system.md)** - Responsive design, mobile support, accessibility
- **[Integration Tests](docs/integration-tests.md)** - Test architecture and workflow validation
- **[Project Status](docs/project-status.md)** - Implementation progress and metrics

### Design Documents
- **[Requirements](conflict_sim_requirements.md)** - Original project specification
- **[Implementation Plan](implementation-plan.md)** - TDD development approach
- **[CLAUDE.md](CLAUDE.md)** - AI assistant instructions and architecture

## 🎯 How to Play

1. **Start Simulation**: The game automatically generates conflicts between randomly selected countries
2. **Make Predictions**: Before each conflict, predict which country will win and set your confidence level (1-10)
3. **Watch Events**: Observe real-time updates as the conflict unfolds with random events
4. **Track Performance**: View your prediction accuracy, streak records, and detailed statistics
5. **Speed Controls**: Adjust simulation speed (1x, 2x, 4x) or pause/resume as needed

### Victory Conditions

Conflicts end when one of these occurs:
- **Territorial Control**: Country controls 75%+ of opponent's territory
- **Economic Collapse**: Country's GDP falls below 30% of starting value  
- **Diplomatic Resolution**: Negotiated settlement (probability increases over time)
- **International Intervention**: UN or major powers force ceasefire

## 🔧 Configuration

The simulation can be configured through the browser console:

```javascript
// Adjust simulation speed (1x - 8x)
simulationEngine.setSpeed(2.5);

// Pause/resume simulation
simulationEngine.pause();
simulationEngine.resume();

// View current statistics
console.log(simulationEngine.getSimulationStats());
console.log(predictionSystem.getStatistics());
```

## 🌐 Browser Support

- **Chrome** 80+
- **Firefox** 75+
- **Safari** 13+
- **Edge** 80+

**Mobile Support**: Responsive design works on all screen sizes (320px+) with touch gestures.

## 🔄 Data Sources

The application integrates with multiple APIs for real-world country data:

1. **CIA World Factbook API** (Primary) - Military and geographic data
2. **World Bank API** (Secondary) - Economic indicators  
3. **SIPRI API** (Tertiary) - Military expenditure data
4. **Static JSON** (Fallback) - Cached data for offline operation

Data is cached locally with 6-month freshness checks and LRU eviction.

## ⚡ Performance

- **Load Time**: < 3 seconds initial load
- **Memory Usage**: < 50MB with 200+ countries cached
- **Update Frequency**: 3-10 seconds with smooth animations
- **API Compliance**: < 100 requests/hour rate limiting
- **Storage**: < 5MB localStorage usage per user

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Standards

- **Test Coverage**: All new features must include comprehensive tests
- **Code Style**: Follow existing patterns and conventions
- **Documentation**: Update relevant documentation for significant changes
- **Performance**: Maintain performance benchmarks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Country Data**: CIA World Factbook, World Bank, SIPRI
- **Testing Framework**: Jest with jsdom environment
- **Development**: Test-driven development with comprehensive coverage
- **AI Assistant**: Enhanced with Claude Code for development acceleration

---

**Built with ❤️ and comprehensive testing for maximum reliability**

For detailed technical information, see the [documentation](docs/) directory.