# Enhanced Data Service & Persistence Documentation

## Overview

The Enhanced Data Service & Persistence system provides intelligent country data fetching from multiple APIs with robust caching, offline fallback capabilities, and comprehensive data management. It serves as the data backbone for the conflict simulation system, ensuring reliable access to real-world country information.

## Architecture

### Class: DataService

The `DataService` class manages all aspects of country data retrieval, caching, and persistence with enterprise-grade reliability and performance optimization.

#### Key Features

- **Multi-Source API Integration**: Fetches from CIA World Factbook, World Bank, and SIPRI APIs
- **Intelligent Caching**: localStorage-based caching with LRU eviction and freshness validation
- **Offline Fallback**: Static data fallback when APIs are unavailable
- **Rate Limiting Compliance**: Exponential backoff and retry logic for API rate limits
- **Batch Processing**: Efficient batch fetching to minimize API calls
- **Memory Management**: Automatic cache optimization and quota monitoring
- **Data Normalization**: Consistent data format across different API sources

## Core Functionality

### Data Source Hierarchy

1. **Cache (Primary)**: Fresh cached data (< 6 months old)
2. **API (Secondary)**: Live data from external APIs with retry logic
3. **Static Fallback (Tertiary)**: Built-in data for major countries

### Configuration Options

```javascript
const config = {
  cacheExpiry: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months (default)
  maxCacheSize: 100,                          // Max cached countries
  retryDelays: [1000, 2000, 4000],           // Exponential backoff delays (ms)
  batchSize: 10,                             // Countries per batch request
  requestTimeout: 10000                      // Request timeout (10 seconds)
};

const dataService = new DataService(config);
```

## API Methods

### Core Data Retrieval

#### `fetchCountryData(countryCode)`
Fetch comprehensive country data with intelligent fallback strategy.

**Parameters:**
- `countryCode` (string): ISO country code (e.g., 'US', 'CN', 'GB')

**Returns:**
```javascript
{
  success: true,
  data: {
    name: "United States",
    code: "US",
    population: 331002651,
    area: 9833517,
    gdp: 21430000000000,
    capital: "Washington, DC",
    military: { personnel: 1400000, expenditure: 778000000000, nuclear: true },
    economy: { gdp: 21430000000000, gdpPerCapita: 65280 },
    geography: { area: 9833517, population: 331002651, capital: [38.9, -77.0] },
    alliances: ["NATO", "AUKUS"],
    resources: ["oil", "coal", "agriculture"]
  },
  fromCache: false,     // true if data came from cache
  fromFallback: false,  // true if data came from static fallback
  timestamp: 1640995200000
}
```

**Data Retrieval Flow:**
1. Check cache for fresh data (< 6 months)
2. If cache miss/stale, fetch from API with retry logic
3. If API fails, use static fallback data
4. Save successful API responses to cache

#### `batchFetchCountries(countryCodes)`
Efficiently fetch multiple countries in batches with rate limiting.

**Parameters:**
- `countryCodes` (Array): Array of ISO country codes

**Returns:**
```javascript
{
  success: true,
  countries: [...],      // Array of country data objects
  failures: [...],       // Array of failed country codes with reasons
  total: 5,             // Total countries requested
  successful: 4         // Number successfully fetched
}
```

**Batch Processing Benefits:**
- Reduces API calls through efficient batching
- Respects rate limits with inter-batch delays
- Partial success handling (some countries succeed, others fail)
- Automatic caching of successful responses

### Cache Management

#### `getCachedData(countryCode)`
Retrieve data from cache with freshness validation.

**Returns:**
```javascript
{
  success: true,
  data: {...},
  fromCache: true,
  timestamp: 1640995200000
}
// OR
{
  success: false,
  reason: "expired" | "not_found" | "corrupted"
}
```

#### `clearOldCache()`
Remove expired cache entries based on expiry settings.

**Returns:**
```javascript
{
  cleared: 15  // Number of entries removed
}
```

#### `getStorageQuota()`
Monitor localStorage usage and quota information.

**Returns:**
```javascript
{
  used: 2048000,           // Bytes used by cache
  entries: 25,             // Number of cached countries
  estimatedQuota: 5242880, // Estimated localStorage quota
  percentUsed: 39.1        // Percentage of quota used
}
```

### Advanced Features

#### `prefetchLikelyCountries(countryCodes)`
Proactively fetch countries likely to be selected by the simulation algorithm.

**Benefits:**
- Reduces simulation startup time
- Ensures data availability for high-probability conflicts
- Skips already cached countries
- Background processing for better UX

#### `validateCountryData(data)`
Validate country data structure and completeness.

**Validation Rules:**
- Required fields: name, code, population, area, gdp
- Numeric field validation
- Structure consistency checks

#### `isDataFresh(cacheData)`
Check if cached data is still within expiry period.

**Freshness Criteria:**
- Default: 6 months expiry
- Configurable expiry period
- Timestamp-based validation

## Data Normalization

### API Response Transformation

The DataService normalizes data from different API formats into a consistent structure:

#### CIA World Factbook Format
```javascript
// API Response
{
  countries: {
    US: {
      name: "United States",
      data: {
        people: { population: { total: 331002651 } },
        geography: { area: { total: { value: 9833517 } } },
        economy: { gdp: { purchasing_power_parity: { annual_values: [{ value: 21430000000000 }] } } }
      }
    }
  }
}

// Normalized Output
{
  name: "United States",
  code: "US",
  population: 331002651,
  area: 9833517,
  gdp: 21430000000000,
  // ... additional fields
}
```

### Normalization Pipeline

1. **Field Extraction**: Extract data from nested API structures
2. **Type Conversion**: Convert strings to numbers where appropriate
3. **Default Values**: Provide defaults for missing fields
4. **Validation**: Ensure data completeness and consistency
5. **Enhancement**: Add computed fields (e.g., GDP per capita)

## Caching Strategy

### LRU (Least Recently Used) Eviction

When cache reaches capacity:

1. **Access Tracking**: Update `lastAccessed` timestamp on cache hits
2. **Eviction Selection**: Sort entries by access time (oldest first)
3. **Selective Removal**: Remove oldest entries to make space
4. **Preservation**: Keep frequently accessed countries in cache

### Cache Key Strategy

```javascript
const cacheKey = `conflict_sim_cache_${countryCode}`;
```

**Cache Entry Structure:**
```javascript
{
  data: {...},              // Normalized country data
  timestamp: 1640995200000, // Cache creation time
  lastAccessed: 1640995500000  // Last access time for LRU
}
```

### Cache Performance

- **Hit Rate Optimization**: LRU eviction keeps popular countries cached
- **Memory Efficiency**: Configurable cache size limits
- **Automatic Cleanup**: Periodic removal of expired entries
- **Quota Management**: Monitors localStorage usage to prevent overflow

## Error Handling & Resilience

### API Error Recovery

#### Retry Logic with Exponential Backoff
```javascript
// Default retry delays: [1000, 2000, 4000] milliseconds
attempt 1: immediate
attempt 2: wait 1000ms
attempt 3: wait 2000ms  
attempt 4: wait 4000ms
final: fallback to static data
```

#### Rate Limiting Handling
- **429 Response Detection**: Automatic detection of rate limit responses
- **Retry-After Header**: Respects API-provided retry delays
- **Adaptive Delays**: Increases delays when rate limited
- **Circuit Breaker**: Temporary API circuit breaking on repeated failures

### Storage Error Recovery

#### localStorage Quota Exceeded
```javascript
try {
  localStorage.setItem(key, data);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Clear 20% of cache (oldest entries)
    this.evictLRUEntries(Math.floor(this.maxCacheSize * 0.2));
    // Retry storage
    localStorage.setItem(key, data);
  }
}
```

#### Corrupted Data Recovery
- **JSON Parse Errors**: Automatic detection and removal of corrupted entries
- **Schema Validation**: Verification of data structure integrity
- **Graceful Degradation**: Continue operation with partial data
- **Data Regeneration**: Re-fetch corrupted entries from API

### Network Resilience

#### Timeout Handling
- **Request Timeouts**: 10-second default timeout per request
- **Abort Controllers**: Clean cancellation of timed-out requests
- **Resource Cleanup**: Proper cleanup of network resources

#### Offline Capability
- **Static Data Fallback**: Built-in data for major countries (US, CN, RU, etc.)
- **Cache-First Strategy**: Use cached data even when slightly stale during network issues
- **Graceful Degradation**: Continue simulation with available data

## Performance Optimization

### Memory Management

#### Automatic Optimization
```javascript
// Triggered every 60 seconds or manually
optimizeDataStructures() {
  // Limit conflict history (last 50 entries)
  // Clean prediction data (last 1000 entries)
  // Prune cache entries (LRU eviction)
  // Compress stored data
}
```

#### Memory Usage Tracking
- **Cache Size Monitoring**: Track localStorage usage in bytes
- **Entry Counting**: Monitor number of cached countries
- **Quota Analysis**: Calculate percentage of storage quota used
- **Proactive Cleanup**: Clear old data before quota exceeded

### API Efficiency

#### Request Optimization
- **Batch Processing**: Multiple countries per API request
- **Request Deduplication**: Avoid duplicate requests for same country
- **Parallel Processing**: Concurrent requests within rate limits
- **Smart Prefetching**: Background loading of likely-needed countries

#### Bandwidth Optimization
- **Selective Field Fetching**: Request only needed data fields
- **Response Compression**: Handle gzipped API responses
- **Incremental Updates**: Only fetch changed data when possible

## Static Fallback Data

### Built-in Country Data

The service includes comprehensive static data for major countries to ensure system functionality even when all APIs are unavailable.

```javascript
staticCountries = {
  'US': {
    name: "United States",
    code: "US", 
    military: { personnel: 1400000, expenditure: 778000000000, nuclear: true },
    economy: { gdp: 21430000000000, gdpPerCapita: 65280 },
    geography: { area: 9833517, population: 331002651 },
    alliances: ["NATO", "AUKUS"],
    resources: ["oil", "coal", "agriculture"]
  },
  // ... additional countries
}
```

### Fallback Strategy

1. **API Failure Detection**: Detect when all retry attempts fail
2. **Static Data Lookup**: Search built-in data for requested country
3. **Data Validation**: Ensure static data completeness
4. **Fallback Indication**: Mark response as `fromFallback: true`

## Integration Points

### With Country Selection Algorithm
- **Data Requirements**: Provides military, economic, geographic data for selection calculations
- **Batch Loading**: Efficiently loads all available countries for selection pool
- **Performance**: Cached data enables fast repeated selections

### With Conflict Engine  
- **Real-time Data**: Provides current country statistics for conflict initialization
- **Data Validation**: Ensures country objects have required fields for conflict calculations
- **Consistency**: Normalized data format ensures predictable conflict behavior

### With Simulation Engine
- **Prefetching**: Loads likely country pairs before conflicts start
- **Background Updates**: Refreshes data during simulation downtime
- **Memory Management**: Optimizes cache during long-running simulations

### With UI System (Future)
- **Progressive Loading**: Load country data as UI elements are displayed
- **Search Functionality**: Fast country lookup for user selection
- **Data Visualization**: Provide formatted data for country information panels

## Testing Coverage

The Data Service maintains comprehensive test coverage:
- **26 Tests Total** across all functionality
- **100% Pass Rate** with robust error handling
- **High Coverage** across statements, branches, and functions

### Test Categories

#### API Integration Tests
- **Successful Fetching**: Verify API response parsing and normalization
- **Error Handling**: Test retry logic and fallback mechanisms
- **Rate Limiting**: Validate exponential backoff and 429 response handling
- **Timeout Handling**: Ensure proper cleanup of timed-out requests

#### Caching Tests
- **Cache Storage**: Verify data is properly cached after API responses
- **Cache Retrieval**: Test cache hit behavior with fresh data
- **Cache Expiry**: Validate removal of stale cached data
- **Corrupted Data**: Handle JSON parsing errors gracefully

#### Batch Processing Tests
- **Batch Efficiency**: Test multiple countries fetched in single request
- **Partial Failures**: Handle scenarios where some countries fail
- **Rate Limiting**: Respect delays between batches

#### Memory Management Tests
- **LRU Eviction**: Verify oldest entries removed when cache full
- **Quota Management**: Test localStorage quota exceeded scenarios
- **Cache Cleanup**: Validate removal of expired entries

## Usage Examples

### Basic Country Data Fetching

```javascript
const dataService = new DataService();

// Fetch single country
const result = await dataService.fetchCountryData('US');
if (result.success) {
  console.log(`Country: ${result.data.name}`);
  console.log(`Population: ${result.data.population.toLocaleString()}`);
  console.log(`GDP: $${(result.data.gdp / 1e12).toFixed(1)}T`);
}
```

### Batch Country Loading

```javascript
// Fetch multiple countries efficiently
const countryCodes = ['US', 'CN', 'RU', 'GB', 'FR', 'DE', 'JP', 'IN'];
const batchResult = await dataService.batchFetchCountries(countryCodes);

console.log(`Successfully fetched: ${batchResult.successful}/${batchResult.total} countries`);
batchResult.countries.forEach(country => {
  console.log(`${country.name}: ${country.gdp.toLocaleString()} GDP`);
});

if (batchResult.failures.length > 0) {
  console.log('Failed to fetch:', batchResult.failures);
}
```

### Advanced Configuration

```javascript
const config = {
  cacheExpiry: 3 * 30 * 24 * 60 * 60 * 1000, // 3 months
  maxCacheSize: 50,                           // Limit cache size
  retryDelays: [500, 1000, 2000],            // Faster retries
  batchSize: 5,                              // Smaller batches
  requestTimeout: 5000                       // 5 second timeout
};

const dataService = new DataService(config);
```

### Cache Management

```javascript
// Monitor cache usage
const quota = dataService.getStorageQuota();
console.log(`Cache usage: ${quota.percentUsed.toFixed(1)}% (${quota.entries} countries)`);

if (quota.percentUsed > 80) {
  // Clean up old entries
  const cleaned = dataService.clearOldCache();
  console.log(`Cleared ${cleaned.cleared} expired entries`);
}
```

### Prefetching for Performance

```javascript
// Prefetch likely country pairs based on selection algorithm
const likelyCountries = ['US', 'CN', 'RU', 'IR', 'KP'];
const prefetchResult = await dataService.prefetchLikelyCountries(likelyCountries);

console.log(`Prefetched: ${prefetchResult.prefetched}, Skipped: ${prefetchResult.skipped}`);
```

## Future Enhancements

### Planned Features

1. **Additional APIs**: Integration with more data sources (UN, World Bank economic indicators)
2. **Real-time Updates**: WebSocket-based data updates for dynamic information
3. **Machine Learning**: Predictive caching based on usage patterns
4. **Data Compression**: Advanced compression algorithms for cache efficiency
5. **Offline Mode**: Complete offline functionality with periodic sync

### Performance Improvements

1. **Service Workers**: Background data fetching and cache management
2. **GraphQL Integration**: More efficient API queries with selective field fetching
3. **CDN Integration**: Geographic data distribution for faster access
4. **Database Backend**: Optional database storage for enterprise deployments

### Advanced Analytics

1. **Usage Metrics**: Track data access patterns and API performance
2. **Cache Analytics**: Optimize cache size and eviction strategies based on usage
3. **API Monitoring**: Real-time API health and response time tracking
4. **Data Quality Metrics**: Monitor data completeness and accuracy across sources