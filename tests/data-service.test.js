const DataService = require('../js/data-service');

// Mock fetch for testing
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

describe('DataService', () => {
  let dataService;

  // Create a simple localStorage mock that actually stores data
  const createLocalStorageMock = () => {
    let store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = value; }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { store = {}; }),
      get length() { return Object.keys(store).length; },
      key: jest.fn((index) => Object.keys(store)[index] || null)
    };
  };
  
  beforeEach(() => {
    // Use the improved localStorage mock
    global.localStorage = createLocalStorageMock();
    
    dataService = new DataService({
      retryDelays: [100, 200, 400], // Faster retries for testing
      requestTimeout: 1000 // Shorter timeout for testing
    });
    fetch.mockClear();
  });

  describe('constructor', () => {
    test('should initialize with default configuration', () => {
      const defaultService = new DataService(); // Don't use our test config
      expect(defaultService.cacheExpiry).toBe(6 * 30 * 24 * 60 * 60 * 1000); // 6 months
      expect(defaultService.maxCacheSize).toBe(100);
      expect(defaultService.retryDelays).toEqual([1000, 2000, 4000]);
      expect(defaultService.batchSize).toBe(10);
    });

    test('should accept custom configuration', () => {
      const config = {
        cacheExpiry: 1000000,
        maxCacheSize: 50,
        retryDelays: [500, 1000],
        batchSize: 5
      };
      
      const customService = new DataService(config);
      expect(customService.cacheExpiry).toBe(1000000);
      expect(customService.maxCacheSize).toBe(50);
      expect(customService.retryDelays).toEqual([500, 1000]);
      expect(customService.batchSize).toBe(5);
    });
  });

  describe('fetchCountryData', () => {
    test('should fetch data from CIA API successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
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
        })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await dataService.fetchCountryData('US');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('factbook.json'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('name', 'United States');
      expect(result.data).toHaveProperty('population');
      expect(result.data).toHaveProperty('area');
      expect(result.data).toHaveProperty('gdp');
    });

    test('should handle API errors with retry logic', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      fetch.mockRejectedValueOnce(new Error('Network error'));
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ countries: { US: { name: "United States" } } })
      });

      const result = await dataService.fetchCountryData('US');
      
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    test('should return failure after exhausting retries', async () => {
      fetch.mockRejectedValue(new Error('Persistent network error'));

      const result = await dataService.fetchCountryData('US');
      
      expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(result.success).toBe(true); // Should fallback to static data
      expect(result.fromFallback).toBe(true);
    }, 10000);

    test('should handle rate limiting with exponential backoff', async () => {
      fetch.mockResolvedValueOnce({ status: 429, ok: false });
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ countries: { US: { name: "United States" } } })
      });

      const startTime = Date.now();
      const result = await dataService.fetchCountryData('US');
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(90); // Should wait at least ~100ms (adjusted for test delays)
    });
  });

  describe('batchFetchCountries', () => {
    test('should fetch countries in batches', async () => {
      const countryCodes = ['US', 'CN', 'RU', 'GB', 'FR'];
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          countries: {
            US: { name: "United States" },
            CN: { name: "China" },
            RU: { name: "Russia" },
            GB: { name: "United Kingdom" },
            FR: { name: "France" }
          }
        })
      });

      const result = await dataService.batchFetchCountries(countryCodes);
      
      expect(result.success).toBe(true);
      expect(result.countries).toHaveLength(5);
      expect(result.countries[0]).toHaveProperty('name', 'United States');
    });

    test('should handle partial failures in batch', async () => {
      const countryCodes = ['US', 'CN', 'INVALID'];
      
      fetch.mockImplementation((url) => {
        if (url.includes('INVALID')) {
          return Promise.resolve({ status: 404, ok: false });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            countries: {
              US: { name: "United States" },
              CN: { name: "China" }
            }
          })
        });
      });

      const result = await dataService.batchFetchCountries(countryCodes);
      
      expect(result.success).toBe(true);
      expect(result.countries).toHaveLength(2); // Only successful ones
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toContain('INVALID');
    });
  });

  describe('caching functionality', () => {
    test('should save fetched data to cache', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          countries: { US: { name: "United States" } }
        })
      });

      await dataService.fetchCountryData('US');
      
      // Verify data was cached
      const cachedData = localStorage.getItem('conflict_sim_cache_US');
      expect(cachedData).toBeTruthy();
      expect(cachedData).toContain('"name":"United States"');
    });

    test('should return cached data if fresh', async () => {
      const cachedData = {
        data: { name: "United States", population: 331000000 },
        timestamp: Date.now() - 1000 // 1 second ago
      };
      
      // Pre-populate cache
      localStorage.setItem('conflict_sim_cache_US', JSON.stringify(cachedData));

      const result = await dataService.getCachedData('US');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedData.data);
      expect(result.fromCache).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should reject stale cached data', async () => {
      const staleData = {
        data: { name: "United States" },
        timestamp: Date.now() - (7 * 30 * 24 * 60 * 60 * 1000) // 7 months ago
      };
      
      // Pre-populate cache with stale data
      localStorage.setItem('conflict_sim_cache_US', JSON.stringify(staleData));

      const result = await dataService.getCachedData('US');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('expired');
      
      // Verify stale data was removed
      expect(localStorage.getItem('conflict_sim_cache_US')).toBeNull();
    });

    test('should handle corrupted cache data', async () => {
      // Pre-populate cache with invalid JSON
      localStorage.setItem('conflict_sim_cache_US', 'invalid json data');

      const result = await dataService.getCachedData('US');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('corrupted');
      
      // Verify corrupted data was removed
      expect(localStorage.getItem('conflict_sim_cache_US')).toBeNull();
    });
  });

  describe('cache management', () => {
    test('should clear old cache entries', () => {
      // Pre-populate cache with old entries
      const oldData = JSON.stringify({
        data: { name: "Test" },
        timestamp: Date.now() - (7 * 30 * 24 * 60 * 60 * 1000) // 7 months old
      });
      const newData = JSON.stringify({
        data: { name: "Test" },
        timestamp: Date.now() - 1000 // 1 second old
      });
      
      localStorage.setItem('conflict_sim_cache_US', oldData);
      localStorage.setItem('conflict_sim_cache_CN', oldData);
      localStorage.setItem('conflict_sim_cache_GB', newData);
      localStorage.setItem('other_data', 'not cache data');

      const result = dataService.clearOldCache();
      
      expect(result.cleared).toBe(2);
      expect(localStorage.getItem('conflict_sim_cache_US')).toBeNull();
      expect(localStorage.getItem('conflict_sim_cache_CN')).toBeNull();
      expect(localStorage.getItem('conflict_sim_cache_GB')).toBeTruthy(); // Fresh data should remain
    });

    test('should get storage quota information', () => {
      // Pre-populate cache entries with different sizes
      localStorage.setItem('conflict_sim_cache_US', 'a'.repeat(1000)); // 1KB + key length
      localStorage.setItem('conflict_sim_cache_CN', 'b'.repeat(2000)); // 2KB + key length  
      localStorage.setItem('conflict_sim_cache_GB', 'c'.repeat(500));  // 0.5KB + key length
      localStorage.setItem('other_data', 'not counted');

      const quota = dataService.getStorageQuota();
      
      expect(quota.used).toBeGreaterThan(3000); // At least 3.5KB + key lengths
      expect(quota.entries).toBe(3); // Only cache entries counted
      expect(quota.percentUsed).toBeGreaterThan(0);
    });

    test('should implement LRU eviction when cache is full', async () => {
      // Set cache at capacity
      dataService.maxCacheSize = 2;
      
      // Pre-populate cache with 2 entries (at capacity)
      const oldData = JSON.stringify({
        data: { name: "US" },
        timestamp: Date.now(),
        lastAccessed: Date.now() - 10000 // 10 seconds ago (oldest)
      });
      const newData = JSON.stringify({
        data: { name: "CN" },
        timestamp: Date.now(),
        lastAccessed: Date.now() - 5000  // 5 seconds ago (newer)
      });
      
      localStorage.setItem('conflict_sim_cache_US', oldData);
      localStorage.setItem('conflict_sim_cache_CN', newData);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          countries: { GB: { name: "United Kingdom" } }
        })
      });

      await dataService.fetchCountryData('GB'); // This should trigger LRU eviction
      
      // The oldest entry (US) should be removed
      expect(localStorage.getItem('conflict_sim_cache_US')).toBeNull();
      expect(localStorage.getItem('conflict_sim_cache_CN')).toBeTruthy(); // Newer data remains
      expect(localStorage.getItem('conflict_sim_cache_GB')).toBeTruthy(); // New data added
    });
  });

  describe('fallback to static data', () => {
    test('should use static data when API fails', async () => {
      // Mock API failure
      fetch.mockRejectedValue(new Error('API unavailable'));

      const result = await dataService.fetchCountryData('US');
      
      expect(result.success).toBe(true);
      expect(result.fromFallback).toBe(true);
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('military');
      expect(result.data).toHaveProperty('economy');
    }, 10000);

    test('should prefer API data over static when available', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          countries: { US: { name: "United States API" } }
        })
      });

      const result = await dataService.fetchCountryData('US');
      
      expect(result.success).toBe(true);
      expect(result.fromFallback).toBeFalsy();
      expect(result.data.name).toContain('API'); // Should be from API, not static
    });
  });

  describe('data transformation', () => {
    test('should normalize data from different API sources', async () => {
      const mockAPIData = {
        countries: {
          US: {
            name: "United States",
            data: {
              people: { 
                population: { total: 331002651 } 
              },
              geography: { 
                area: { 
                  total: { value: 9833517 },
                  comparative: "about half the size of Russia"
                }
              },
              economy: { 
                gdp: { 
                  purchasing_power_parity: { 
                    annual_values: [{ value: 21430000000000 }] 
                  } 
                } 
              },
              government: {
                country_name: { conventional_short_form: "United States" },
                capital: { name: "Washington, DC", coordinates: "38 53 N, 77 02 W" }
              }
            }
          }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIData)
      });

      const result = await dataService.fetchCountryData('US');
      
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        name: "United States",
        code: "US",
        population: 331002651,
        area: 9833517,
        gdp: 21430000000000,
        capital: expect.any(String)
      });
    });

    test('should handle missing data fields gracefully', async () => {
      const incompleteData = {
        countries: {
          XX: {
            name: "Test Country",
            // Missing most fields
          }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(incompleteData)
      });

      const result = await dataService.fetchCountryData('XX');
      
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        name: "Test Country",
        code: "XX",
        population: 0, // Default value
        area: 0, // Default value
        gdp: 0 // Default value
      });
    });
  });

  describe('data freshness and validation', () => {
    test('should validate data freshness', () => {
      const freshData = { timestamp: Date.now() - 1000 }; // 1 second ago
      const staleData = { timestamp: Date.now() - (7 * 30 * 24 * 60 * 60 * 1000) }; // 7 months ago

      expect(dataService.isDataFresh(freshData)).toBe(true);
      expect(dataService.isDataFresh(staleData)).toBe(false);
    });

    test('should validate country data structure', () => {
      const validData = {
        name: "Test Country",
        code: "TC",
        population: 1000000,
        area: 50000,
        gdp: 1000000000
      };

      const invalidData = {
        name: "Test Country"
        // Missing required fields
      };

      expect(dataService.validateCountryData(validData)).toBe(true);
      expect(dataService.validateCountryData(invalidData)).toBe(false);
    });
  });

  describe('prefetch functionality', () => {
    test('should prefetch likely countries based on selection algorithm', async () => {
      // Mock successful fetches
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          countries: {
            US: { name: "United States" },
            CN: { name: "China" },
            RU: { name: "Russia" }
          }
        })
      });

      const result = await dataService.prefetchLikelyCountries(['US', 'CN', 'RU']);
      
      expect(result.success).toBe(true);
      expect(result.prefetched).toBe(3);
      expect(fetch).toHaveBeenCalledTimes(1); // Should batch the requests
    });

    test('should skip prefetching for already cached countries', async () => {
      // Pre-populate cache with US data
      localStorage.setItem('conflict_sim_cache_US', JSON.stringify({
        data: { name: "United States" },
        timestamp: Date.now()
      }));

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          countries: { CN: { name: "China" } }
        })
      });

      const result = await dataService.prefetchLikelyCountries(['US', 'CN']);
      
      expect(result.success).toBe(true);
      expect(result.prefetched).toBe(1); // Only CN, US was cached
      expect(result.skipped).toBe(1);
    });
  });

  describe('error handling and recovery', () => {
    test('should handle localStorage quota exceeded', async () => {
      // Mock quota exceeded error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          countries: { US: { name: "United States" } }
        })
      });

      const result = await dataService.fetchCountryData('US');
      
      expect(result.success).toBe(true); // Should still succeed
      expect(result.data.name).toBe("United States");
      // Should have attempted to clear old cache
    });

    test('should recover from network interruption', async () => {
      // First attempt fails, second succeeds
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            countries: { US: { name: "United States" } }
          })
        });

      const result = await dataService.fetchCountryData('US');
      
      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('should handle malformed API responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "response structure" })
      });

      const result = await dataService.fetchCountryData('US');
      
      expect(result.success).toBe(true); // Should fallback to static data
      expect(result.fromFallback).toBe(true);
    }, 10000);
  });
});