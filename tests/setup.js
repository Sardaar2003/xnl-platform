// Load environment variables
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Set test database
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/xnl_test';

// Set test RabbitMQ URL
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Set test JWT secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Increase timeout for async tests
jest.setTimeout(30000);

// Global teardown
afterAll(async () => {
  // Add any global cleanup here
}); 