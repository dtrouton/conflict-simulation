/**
 * Enhanced Data Service & Persistence
 * 
 * Provides real-time country data fetching from multiple APIs with intelligent
 * caching, offline fallback, rate limiting compliance, and memory management.
 * 
 * Data Sources:
 * - CIA World Factbook API (primary)
 * - World Bank API (economic data)
 * - SIPRI (military expenditure)
 * - Static fallback data
 * 
 * @class DataService
 */
class DataService {
  /**
   * Initialize data service with configuration
   * 
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    // Cache configuration
    this.cacheExpiry = config.cacheExpiry || (6 * 30 * 24 * 60 * 60 * 1000); // 6 months
    this.maxCacheSize = config.maxCacheSize || 100; // Max cached countries
    this.cachePrefix = 'conflict_sim_cache_';
    
    // API configuration
    this.retryDelays = config.retryDelays || [1000, 2000, 4000]; // Exponential backoff
    this.batchSize = config.batchSize || 10; // Countries per batch request
    this.requestTimeout = config.requestTimeout || 10000; // 10 seconds
    
    // API endpoints
    this.apiEndpoints = {
      cia: 'https://raw.githubusercontent.com/factbook/factbook.json/master/factbook.json',
      worldBank: 'https://api.worldbank.org/v2/country',
      sipri: 'https://www.sipri.org/api/military-expenditure'
    };
    
    // Static fallback data for major countries
    this.staticCountries = this.initializeStaticData();
  }

  /**
   * Fetch country data with retry logic and caching
   * 
   * @param {string} countryCode - ISO country code
   * @returns {Promise<Object>} Result with success status and data
   */
  async fetchCountryData(countryCode) {
    try {
      // Check cache first
      const cached = await this.getCachedData(countryCode);
      if (cached.success) {
        return cached;
      }

      // Attempt API fetch with retries
      const apiResult = await this.fetchFromAPIWithRetry(countryCode);
      if (apiResult.success) {
        // Save to cache
        await this.saveToCacheWithEviction(countryCode, apiResult.data);
        return apiResult;
      }

      // Fallback to static data
      return this.getFallbackData(countryCode);
      
    } catch (error) {
      console.warn(`Error fetching country data for ${countryCode}:`, error);
      return this.getFallbackData(countryCode);
    }
  }

  /**
   * Fetch multiple countries in batches for efficiency
   * 
   * @param {Array} countryCodes - Array of ISO country codes
   * @returns {Promise<Object>} Result with countries array and failure info
   */
  async batchFetchCountries(countryCodes) {
    const countries = [];
    const failures = [];
    
    try {
      // Process in batches to respect API limits
      for (let i = 0; i < countryCodes.length; i += this.batchSize) {
        const batch = countryCodes.slice(i, i + this.batchSize);
        
        try {
          const batchResult = await this.fetchBatch(batch);
          countries.push(...batchResult.countries);
          failures.push(...batchResult.failures);
        } catch (error) {
          // Add entire batch to failures
          failures.push(...batch.map(code => `${code}: ${error.message}`));
        }
        
        // Rate limiting delay between batches
        if (i + this.batchSize < countryCodes.length) {
          await this.delay(500); // 500ms between batches
        }
      }
      
      return {
        success: true,
        countries,
        failures,
        total: countryCodes.length,
        successful: countries.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        countries,
        failures
      };
    }
  }

  /**
   * Get cached data if fresh, otherwise return failure
   * 
   * @param {string} countryCode - ISO country code
   * @returns {Promise<Object>} Cached data or failure reason
   */
  async getCachedData(countryCode) {
    try {
      const cacheKey = this.cachePrefix + countryCode;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return { success: false, reason: 'not_found' };
      }

      const cacheData = JSON.parse(cached);
      
      if (!this.isDataFresh(cacheData)) {
        localStorage.removeItem(cacheKey);
        return { success: false, reason: 'expired' };
      }

      // Update last accessed time
      cacheData.lastAccessed = Date.now();
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      return {
        success: true,
        data: cacheData.data,
        fromCache: true,
        timestamp: cacheData.timestamp
      };

    } catch (_error) {
      // Handle corrupted cache data
      const cacheKey = this.cachePrefix + countryCode;
      localStorage.removeItem(cacheKey);
      return { success: false, reason: 'corrupted' };
    }
  }

  /**
   * Fetch from API with exponential backoff retry logic
   * 
   * @param {string} countryCode - ISO country code
   * @returns {Promise<Object>} API fetch result
   */
  async fetchFromAPIWithRetry(countryCode) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.retryDelays.length; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.retryDelays[attempt - 1]);
        }
        
        const result = await this.fetchFromAPI(countryCode);
        
        if (result.success) {
          return result;
        }
        
        // Handle rate limiting
        if (result.status === 429) {
          const retryAfter = result.retryAfter || this.retryDelays[attempt] || 2000;
          await this.delay(retryAfter);
          continue;
        }
        
        lastError = result.error;
        
      } catch (error) {
        lastError = error;
      }
    }
    
    return {
      success: false,
      error: `Failed to fetch ${countryCode} after ${this.retryDelays.length + 1} attempts: ${lastError?.message || lastError}`
    };
  }

  /**
   * Fetch country data from CIA World Factbook API
   * 
   * @param {string} countryCode - ISO country code
   * @returns {Promise<Object>} Normalized country data
   */
  async fetchFromAPI(countryCode) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(this.apiEndpoints.cia, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Conflict-Simulation/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: `API returned ${response.status}: ${response.statusText}`,
          retryAfter: Number(response.headers.get('Retry-After') || 0) * 1000
        };
      }

      const data = await response.json();
      const countryData = this.extractCountryData(data, countryCode);
      
      if (!countryData) {
        return {
          success: false,
          error: `Country ${countryCode} not found in API response`
        };
      }

      const normalizedData = this.normalizeCountryData(countryData, countryCode);
      
      return {
        success: true,
        data: normalizedData,
        timestamp: Date.now()
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timeout after ${this.requestTimeout}ms`
        };
      }
      
      throw error;
    }
  }

  /**
   * Fetch a batch of countries efficiently
   * 
   * @param {Array} countryCodes - Batch of country codes
   * @returns {Promise<Object>} Batch result with countries and failures
   */
  async fetchBatch(countryCodes) {
    const countries = [];
    const failures = [];

    try {
      const response = await fetch(this.apiEndpoints.cia, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Conflict-Simulation/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      for (const countryCode of countryCodes) {
        try {
          const countryData = this.extractCountryData(data, countryCode);
          
          if (countryData) {
            const normalizedData = this.normalizeCountryData(countryData, countryCode);
            countries.push(normalizedData);
            
            // Save to cache
            await this.saveToCacheWithEviction(countryCode, normalizedData);
          } else {
            failures.push(`${countryCode}: not found in API`);
          }
        } catch (error) {
          failures.push(`${countryCode}: ${error.message}`);
        }
      }

    } catch (_error) {
      // If batch fetch fails, try individual fallbacks
      for (const countryCode of countryCodes) {
        const fallback = this.getFallbackData(countryCode);
        if (fallback.success) {
          countries.push(fallback.data);
        } else {
          failures.push(`${countryCode}: batch failed, no fallback`);
        }
      }
    }

    return { countries, failures };
  }

  /**
   * Extract country data from API response
   * 
   * @param {Object} apiData - Full API response
   * @param {string} countryCode - Target country code
   * @returns {Object|null} Country data or null if not found
   */
  extractCountryData(apiData, countryCode) {
    if (!apiData?.countries || typeof apiData.countries !== 'object') {
      return null;
    }

    // Try direct lookup first
    if (apiData.countries[countryCode]) {
      return apiData.countries[countryCode];
    }

    // Search by various country code formats
    const upperCode = countryCode.toUpperCase();
    const lowerCode = countryCode.toLowerCase();
    
    for (const [key, value] of Object.entries(apiData.countries)) {
      if (key.toUpperCase() === upperCode || 
          key.toLowerCase() === lowerCode ||
          value.code === countryCode ||
          value.iso_code === countryCode) {
        return value;
      }
    }

    return null;
  }

  /**
   * Normalize country data from different API formats
   * 
   * @param {Object} countryData - Raw country data
   * @param {string} countryCode - ISO country code
   * @returns {Object} Normalized country data
   */
  normalizeCountryData(countryData, countryCode) {
    try {
      const normalized = {
        name: this.extractName(countryData),
        code: countryCode.toUpperCase(),
        population: this.extractPopulation(countryData),
        area: this.extractArea(countryData),
        gdp: this.extractGDP(countryData),
        capital: this.extractCapital(countryData),
        military: this.extractMilitaryData(countryData),
        economy: this.extractEconomyData(countryData),
        geography: this.extractGeographyData(countryData),
        alliances: this.extractAlliances(countryData),
        resources: this.extractResources(countryData)
      };

      return normalized;

    } catch (error) {
      console.warn(`Error normalizing data for ${countryCode}:`, error);
      
      // Return minimal valid data
      return {
        name: countryData.name || `Country ${countryCode}`,
        code: countryCode.toUpperCase(),
        population: 0,
        area: 0,
        gdp: 0,
        capital: 'Unknown',
        military: { personnel: 0, expenditure: 0, nuclear: false },
        economy: { gdpPerCapita: 0 },
        geography: { population: 0 },
        alliances: [],
        resources: []
      };
    }
  }

  /**
   * Extract country name from various API formats
   */
  extractName(data) {
    return data.name ||
           data.government?.country_name?.conventional_short_form ||
           data.government?.country_name?.conventional_long_form ||
           'Unknown Country';
  }

  /**
   * Extract population from various API formats
   */
  extractPopulation(data) {
    return data.people?.population?.total ||
           data.data?.people?.population?.total ||
           data.population ||
           0;
  }

  /**
   * Extract area from various API formats
   */
  extractArea(data) {
    return data.geography?.area?.total?.value ||
           data.data?.geography?.area?.total?.value ||
           data.area ||
           0;
  }

  /**
   * Extract GDP from various API formats
   */
  extractGDP(data) {
    const gdpData = data.economy?.gdp?.purchasing_power_parity?.annual_values?.[0]?.value ||
                   data.data?.economy?.gdp?.purchasing_power_parity?.annual_values?.[0]?.value ||
                   data.gdp;
    
    return gdpData || 0;
  }

  /**
   * Extract capital from various API formats
   */
  extractCapital(data) {
    return data.government?.capital?.name ||
           data.data?.government?.capital?.name ||
           data.capital ||
           'Unknown';
  }

  /**
   * Extract military data from various API formats
   */
  extractMilitaryData(data) {
    return {
      personnel: data.military?.personnel || 0,
      expenditure: data.military?.expenditure || 0,
      nuclear: data.military?.nuclear || false
    };
  }

  /**
   * Extract economy data from various API formats
   */
  extractEconomyData(data) {
    const population = this.extractPopulation(data);
    const gdp = this.extractGDP(data);
    
    return {
      gdp: gdp,
      gdpPerCapita: population > 0 ? gdp / population : 0
    };
  }

  /**
   * Extract geography data from various API formats
   */
  extractGeographyData(data) {
    return {
      area: this.extractArea(data),
      population: this.extractPopulation(data),
      capital: this.extractCapital(data).split(',').map(coord => parseFloat(coord.trim())).filter(n => !isNaN(n))
    };
  }

  /**
   * Extract alliances (placeholder - would need additional data source)
   */
  extractAlliances(_data) {
    // This would require additional API integration
    // For now, return empty array
    return [];
  }

  /**
   * Extract resources (placeholder - would need additional data source)
   */
  extractResources(_data) {
    // This would require additional API integration
    // For now, return empty array
    return [];
  }

  /**
   * Save data to cache with LRU eviction if needed
   * 
   * @param {string} countryCode - ISO country code
   * @param {Object} data - Country data to cache
   */
  async saveToCacheWithEviction(countryCode, data) {
    try {
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        lastAccessed: Date.now()
      };

      const cacheKey = this.cachePrefix + countryCode;
      
      // Check if we need to evict old entries
      const currentCacheSize = this.getCurrentCacheSize();
      if (currentCacheSize >= this.maxCacheSize) {
        this.evictLRUEntries(1);
      }

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    } catch (error) {
      if (error.message.includes('QuotaExceededError') || 
          error.message.includes('quota') ||
          error.name === 'QuotaExceededError') {
        // Clear some space and try again
        this.evictLRUEntries(Math.floor(this.maxCacheSize * 0.2)); // Clear 20%
        
        try {
          const cacheKey = this.cachePrefix + countryCode;
          localStorage.setItem(cacheKey, JSON.stringify({
            data: data,
            timestamp: Date.now(),
            lastAccessed: Date.now()
          }));
        } catch (secondError) {
          console.warn('Failed to save to cache after quota cleanup:', secondError);
        }
      } else {
        console.warn('Error saving to cache:', error);
      }
    }
  }

  /**
   * Get current cache size (number of entries)
   */
  getCurrentCacheSize() {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Evict least recently used cache entries
   * 
   * @param {number} count - Number of entries to evict
   */
  evictLRUEntries(count) {
    const cacheEntries = [];
    
    // Collect all cache entries with access times
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          cacheEntries.push({
            key: key,
            lastAccessed: data.lastAccessed || 0
          });
        } catch (_error) {
          // Remove corrupted entry
          localStorage.removeItem(key);
        }
      }
    }

    // Sort by last accessed time (oldest first)
    cacheEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Remove the oldest entries
    for (let i = 0; i < Math.min(count, cacheEntries.length); i++) {
      localStorage.removeItem(cacheEntries[i].key);
    }
  }

  /**
   * Clear old cache entries based on expiry time
   * 
   * @returns {Object} Cleanup statistics
   */
  clearOldCache() {
    let cleared = 0;
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (!this.isDataFresh(data)) {
            keysToRemove.push(key);
          }
        } catch (_error) {
          // Remove corrupted entries
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      cleared++;
    });

    return { cleared };
  }

  /**
   * Get storage quota information
   * 
   * @returns {Object} Storage usage statistics
   */
  getStorageQuota() {
    let used = 0;
    let entries = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        const value = localStorage.getItem(key);
        used += key.length + (value ? value.length : 0);
        entries++;
      }
    }

    // Estimate total localStorage quota (usually 5-10MB)
    const estimatedQuota = 5 * 1024 * 1024; // 5MB
    
    return {
      used: used,
      entries: entries,
      estimatedQuota: estimatedQuota,
      percentUsed: (used / estimatedQuota) * 100
    };
  }

  /**
   * Check if cached data is still fresh
   * 
   * @param {Object} cacheData - Cached data with timestamp
   * @returns {boolean} True if data is fresh
   */
  isDataFresh(cacheData) {
    if (!cacheData || !cacheData.timestamp) {
      return false;
    }

    const age = Date.now() - cacheData.timestamp;
    return age < this.cacheExpiry;
  }

  /**
   * Validate country data structure
   * 
   * @param {Object} data - Country data to validate
   * @returns {boolean} True if valid
   */
  validateCountryData(data) {
    const requiredFields = ['name', 'code', 'population', 'area', 'gdp'];
    
    return requiredFields.every(field =>
      Object.hasOwn(data, field) &&
      data[field] !== undefined &&
      data[field] !== null
    );
  }

  /**
   * Get fallback static data for major countries
   * 
   * @param {string} countryCode - ISO country code
   * @returns {Object} Static country data or error
   */
  getFallbackData(countryCode) {
    const staticData = this.staticCountries[countryCode.toUpperCase()];
    
    if (staticData) {
      return {
        success: true,
        data: staticData,
        fromFallback: true,
        timestamp: Date.now()
      };
    }

    return {
      success: false,
      error: `No fallback data available for ${countryCode}`
    };
  }

  /**
   * Prefetch likely countries based on selection algorithm
   * 
   * @param {Array} countryCodes - Countries likely to be selected
   * @returns {Promise<Object>} Prefetch results
   */
  async prefetchLikelyCountries(countryCodes) {
    try {
      let prefetched = 0;
      let skipped = 0;
      
      // Filter out already cached countries
      const needsFetch = [];
      
      for (const countryCode of countryCodes) {
        const cached = await this.getCachedData(countryCode);
        if (cached.success) {
          skipped++;
        } else {
          needsFetch.push(countryCode);
        }
      }

      // Batch fetch the remaining countries
      if (needsFetch.length > 0) {
        const result = await this.batchFetchCountries(needsFetch);
        prefetched = result.successful;
      }

      return {
        success: true,
        prefetched: prefetched,
        skipped: skipped,
        total: countryCodes.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        prefetched: 0,
        skipped: 0
      };
    }
  }

  /**
   * Initialize static fallback data for major countries
   * 
   * @returns {Object} Static country data
   */
  initializeStaticData() {
    return {
      'US': {
        name: "United States",
        code: "US",
        military: { personnel: 1400000, expenditure: 778000000000, nuclear: true },
        economy: { gdp: 21430000000000, gdpPerCapita: 65280 },
        geography: { area: 9833517, population: 331002651, capital: [38.9072, -77.0369] },
        alliances: ["NATO", "AUKUS"],
        resources: ["oil", "coal", "agriculture"],
        population: 331002651,
        area: 9833517,
        gdp: 21430000000000,
        capital: "Washington, DC"
      },
      'CN': {
        name: "China",
        code: "CN",
        military: { personnel: 2035000, expenditure: 261000000000, nuclear: true },
        economy: { gdp: 14342000000000, gdpPerCapita: 10261 },
        geography: { area: 9596960, population: 1439323776, capital: [39.9042, 116.4074] },
        alliances: ["SCO"],
        resources: ["coal", "rare_earth", "agriculture"],
        population: 1439323776,
        area: 9596960,
        gdp: 14342000000000,
        capital: "Beijing"
      },
      'RU': {
        name: "Russia",
        code: "RU",
        military: { personnel: 850000, expenditure: 61700000000, nuclear: true },
        economy: { gdp: 4000000000000, gdpPerCapita: 27900 },
        geography: { area: 17098242, population: 145934462, capital: [55.7558, 37.6176] },
        alliances: ["CSTO", "SCO"],
        resources: ["oil", "natural_gas", "minerals"],
        population: 145934462,
        area: 17098242,
        gdp: 4000000000000,
        capital: "Moscow"
      }
    };
  }

  /**
   * Utility function to delay execution
   * 
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataService;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.DataService = DataService;
}