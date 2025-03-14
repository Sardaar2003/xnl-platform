require('dotenv').config();
const rabbitmq = require('../utils/rabbitmq');
const logger = require('../utils/logger');

/**
 * Test RabbitMQ connection and message publishing/consuming
 */
async function testRabbitMQ() {
  try {
    // Connect to RabbitMQ
    await rabbitmq.connect();
    logger.info('Connected to RabbitMQ');
    
    // Test transaction message
    const testTransactionMessage = {
      event: 'transaction.test',
      data: {
        transactionId: 'TXN' + Date.now(),
        sourceAccountId: 'test-source-account',
        destinationAccountId: 'test-destination-account',
        type: 'TRANSFER',
        amount: 100.00,
        currency: 'USD',
        description: 'Test transaction',
        status: 'COMPLETED',
        timestamp: new Date().toISOString()
      }
    };
    
    // Publish test transaction message
    const transactionSuccess = await rabbitmq.publishMessage('transaction.test', testTransactionMessage);
    
    if (transactionSuccess) {
      logger.info('Test transaction message published successfully');
    } else {
      logger.error('Failed to publish test transaction message');
    }
    
    // Test account message (simulating an account event from Account Service)
    const testAccountMessage = {
      event: 'account.test',
      data: {
        _id: 'test-account-' + Date.now(),
        userId: 'test-user',
        accountType: 'CHECKING',
        name: 'Test Account',
        currency: 'USD',
        balance: 1000.00,
        status: 'ACTIVE',
        timestamp: new Date().toISOString()
      }
    };
    
    // Set up a test consumer for account events
    await rabbitmq.consumeMessages('test.account.queue', async (message) => {
      logger.info(`Received account test message: ${JSON.stringify(message)}`);
      return true;
    });
    
    logger.info('Test account consumer set up successfully');
    
    // Publish test account message to the test queue
    // Note: In a real scenario, this would come from the Account Service
    const accountSuccess = await rabbitmq.publishMessage('account.test', testAccountMessage);
    
    if (accountSuccess) {
      logger.info('Test account message published successfully');
    } else {
      logger.error('Failed to publish test account message');
    }
    
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