/**
 * Global type declarations for conflict simulation
 * These classes are loaded via script tags in the browser
 */

declare class Country {
  constructor(data: any);
  name: string;
  code: string;
  military: { personnel: number; expenditure: number; nuclear: boolean };
  economy: { gdp: number; gdpPerCapita: number };
  geography: { area: number; population: number; capital: [number, number] };
  alliances: string[];
  resources: string[];
  getMilitaryStrength(): number;
  getEconomicPower(): number;
  getGeographicAdvantage(opponent: Country): number;
  hasAlliance(allianceName: string): boolean;
}

declare class CountrySelector {
  constructor(countries: Country[], conflictHistory?: any[]);
  selectRandomPair(): [Country, Country];
  calculateConflictProbability(countryA: Country, countryB: Country): number;
}

declare class Conflict {
  constructor(countryA: Country, countryB: Country);
  countries: Country[];
  territoryControl: number[];
  currentGDP: number[];
  initialGDP: number[];
  duration: number;
  status: string;
  events: any[];
  winner?: number;
  victoryCondition?: string;
  updateTerritoryControl(): void;
  calculateBattleOutcome(): number;
  checkVictoryConditions(): { hasWinner: boolean; winner?: number; condition?: string; description?: string };
  endConflict(winner: number, condition: string, description: string): void;
  addEvent(event: any): void;
  getStats(): any;
}

declare class EventGenerator {
  constructor(eventProbability?: number);
  activeEvents: any[];
  eventProbability: number;
  generateRandomEvent(conflict: Conflict): any;
  applyEventEffects(conflict: Conflict, event: any): void;
  updateActiveEvents(conflict: Conflict): void;
}

declare class PredictionSystem {
  constructor();
  predictions: any[];
  currentStreak: number;
  bestStreak: number;
  submitPrediction(countryA: Country, countryB: Country, winner: number, confidence: number): any;
  resolvePrediction(predictionId: string, actualWinner: number, victoryCondition: string): any;
  getCurrentPrediction(countryA: Country, countryB: Country): any;
  getStatistics(): any;
  calculateAccuracy(): number;
  clearHistory(): void;
  saveToStorage(): void;
}

declare class DataService {
  constructor(config?: any);
  fetchCountryData(countryCode: string): Promise<any>;
  batchFetchCountries(countryCodes: string[]): Promise<any>;
  getCachedData(countryCode: string): Promise<any>;
  clearOldCache(): any;
  getFallbackData(countryCode: string): any;
}

declare class SimulationEngine {
  constructor(countries: Country[], config?: any);
  currentConflict: Conflict | null;
  predictionSystem: PredictionSystem;
  running: boolean;
  paused: boolean;
  speed: number;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  setSpeed(speed: number): void;
  isRunning(): boolean;
  isPaused(): boolean;
  submitPrediction(winner: number, confidence: number): any;
  processUpdate(): void;
  endCurrentConflict(victory: any): void;
  getSimulationStats(): any;
  on(event: string, callback: Function): void;
  off(event: string, callback?: Function): void;
}

declare class UIController {
  constructor(simulationEngine: SimulationEngine);
  renderCountryCards(conflict: Conflict): void;
  updatePredictionInterface(conflict: Conflict): void;
  destroy(): void;
}

interface Window {
  Country: typeof Country;
  CountrySelector: typeof CountrySelector;
  Conflict: typeof Conflict;
  EventGenerator: typeof EventGenerator;
  PredictionSystem: typeof PredictionSystem;
  DataService: typeof DataService;
  SimulationEngine: typeof SimulationEngine;
  UIController: typeof UIController;
  initializeConflictSimulation: () => { simulationEngine: SimulationEngine; uiController: UIController } | null;
  simulationEngine: SimulationEngine;
  uiController: UIController;
  gameDebug: any;
}
