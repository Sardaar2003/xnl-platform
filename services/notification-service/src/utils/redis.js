const redis = require('redis');
const logger = require('./logger');

// Create Redis client
const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = redis.createClient({
    url: redisUrl
  });

  client.on('error', (err) => {
    logger.error(`Redis Error: ${err}`);
  });

  client.on('connect', () => {
    logger.info('Connected to Redis');
  });

  client.on('reconnecting', () => {
    logger.info('Reconnecting to Redis');
  });

  client.on('end', () => {
    logger.info('Redis connection closed');
  });

  // Connect to Redis
  (async () => {
    try {
      await client.connect();
    } catch (err) {
      logger.error(`Failed to connect to Redis: ${err}`);
    }
  })();

  return client;
};

// Create a singleton Redis client
let redisClient;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

module.exports = {
  getRedisClient,
  // Add a mock implementation for development/testing
  getMockRedisClient: () => {
    const mockClient = {
      get: async (key) => null,
      set: async (key, value, options) => 'OK',
      del: async (key) => 1,
      publish: async (channel, message) => 0,
      subscribe: async (channel, callback) => {},
      unsubscribe: async (channel) => {},
      disconnect: async () => {},
      isReady: true
    };
    return mockClient;
  }
}; 