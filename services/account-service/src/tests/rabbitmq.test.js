require('dotenv').config();
const rabbitmq = require('../utils/rabbitmq');
const logger = require('../utils/logger');

/**
 * Test RabbitMQ connection and message publishing
 */
async function testRabbitMQ() {
  try {
    // Connect to RabbitMQ
    await rabbitmq.connect();
    logger.info('Connected to RabbitMQ');
    
    // Test message
    const testMessage = {
      event: 'test.event',
      data: {
        id: 'test123',
        timestamp: new Date().toISOString(),
        message: 'This is a test message'
      }
    };
    
    // Publish test message
    const success = await rabbitmq.publishMessage('test.event', testMessage);
    
    if (success) {
      logger.info('Test message published successfully');
    } else {
      logger.error('Failed to publish test message');
    }
    
    // Set up a test consumer
    await rabbitmq.consumeMessages('test.queue', async (message) => {
      logger.info(`Received test message: ${JSON.stringify(message)}`);
      return true;
    });
    
    logger.info('Test consumer set up successfully');
    
    // Keep the process running for a while to receive messages
    logger.info('Waiting for messages...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Close connection
    await rabbitmq.closeConnection();
    logger.info('RabbitMQ connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error in RabbitMQ test: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testRabbitMQ(); 