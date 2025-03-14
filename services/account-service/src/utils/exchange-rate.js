const axios = require('axios');
const redis = require('./redis');
const logger = require('./logger');

// Cache TTL in seconds (1 hour)
const CACHE_TTL = 3600;

/**
 * Get exchange rates from API
 * @param {string} baseCurrency - Base currency code (e.g., USD)
 * @returns {Promise<Object>} - Exchange rates data
 */
const fetchExchangeRates = async (baseCurrency = 'USD') => {
  try {
    // Check if we have API key for premium API
    if (process.env.EXCHANGE_RATE_API_KEY) {
      // Use premium API
      const response = await axios.get(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/${baseCurrency}`);
      
      if (response.data.result === 'success') {
        return {
          base: response.data.base_code,
          rates: response.data.conversion_rates,
          timestamp: new Date().toISOString()
        };
      }
      
      throw new Error(`API Error: ${response.data.error_type}`);
    } else {
      // Use free API
      const response = await axios.get(`https://open.er-api.com/v6/latest/${baseCurrency}`);
      
      if (response.data.result === 'success') {
        return {
          base: response.data.base_code,
          rates: response.data.rates,
          timestamp: response.data.time_last_update_utc
        };
      }
      
      throw new Error('Failed to fetch exchange rates');
    }
  } catch (error) {
    logger.error('Error fetching exchange rates:', error);
    throw error;
  }
};

/**
 * Get exchange rates with caching
 * @param {string} baseCurrency - Base currency code (e.g., USD)
 * @returns {Promise<Object>} - Exchange rates data
 */
const getExchangeRates = async (baseCurrency = 'USD') => {
  try {
    const cacheKey = `exchange_rates:${baseCurrency}`;
    
    // Try to get from cache
    const cachedRates = await redis.get(cacheKey);
    
    if (cachedRates) {
      return JSON.parse(cachedRates);
    }
    
    // Fetch from API
    const rates = await fetchExchangeRates(baseCurrency);
    
    // Store in cache
    await redis.set(cacheKey, JSON.stringify(rates), 'EX', CACHE_TTL);
    
    return rates;
  } catch (error) {
    logger.error('Error getting exchange rates:', error);
    throw error;
  }
};

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Promise<number>} - Converted amount
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // Get exchange rates with source currency as base
    const rates = await getExchangeRates(fromCurrency);
    
    // Check if target currency is supported
    if (!rates.rates[toCurrency]) {
      throw new Error(`Unsupported currency: ${toCurrency}`);
    }
    
    // Convert amount
    const convertedAmount = amount * rates.rates[toCurrency];
    
    // Round to 2 decimal places
    return Math.round(convertedAmount * 100) / 100;
  } catch (error) {
    logger.error('Error converting currency:', error);
    throw error;
  }
};

/**
 * Get supported currencies
 * @returns {Promise<string[]>} - Array of supported currency codes
 */
const getSupportedCurrencies = async () => {
  try {
    // Get exchange rates with USD as base
    const rates = await getExchangeRates('USD');
    
    // Return array of currency codes
    return Object.keys(rates.rates);
  } catch (error) {
    logger.error('Error getting supported currencies:', error);
    throw error;
  }
};

module.exports = {
  getExchangeRates,
  convertCurrency,
  getSupportedCurrencies
}; 