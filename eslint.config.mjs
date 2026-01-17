import js from '@eslint/js';
import globals from 'globals';

// Classes defined across modules and shared via script tag loading
const sharedClasses = {
  Country: 'readonly',
  CountrySelector: 'readonly',
  Conflict: 'readonly',
  EventGenerator: 'readonly',
  PredictionSystem: 'readonly',
  DataService: 'readonly',
  SimulationEngine: 'readonly',
  UIController: 'readonly',
};

export default [
  js.configs.recommended,
  // Module files that DEFINE classes (allow redeclaration of globals)
  {
    files: [
      'js/country.js',
      'js/country-selector.js',
      'js/conflict.js',
      'js/events.js',
      'js/prediction.js',
      'js/data-service.js',
      'js/simulation.js',
      'js/ui-controller.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        module: 'readonly',
        require: 'readonly',
        ...sharedClasses,
      }
    },
    rules: {
      'no-redeclare': 'off', // These files define the classes
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
    }
  },
  // Browser entry files that USE classes (console allowed for user feedback)
  {
    files: ['js/main.js', 'js/ui.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...sharedClasses,
      }
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': 'off', // Entry points use console for user feedback
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
    }
  },
  // Test files
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
        document: 'readonly',
        window: 'readonly',
        TouchEvent: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
    }
  },
  {
    ignores: ['node_modules/', 'coverage/']
  }
];
