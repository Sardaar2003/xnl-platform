const amqp = require('amqplib');
const logger = require('./logger');

// RabbitMQ connection URL
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Exchange and queue names
const TRANSACTION_EXCHANGE = 'transaction.exchange';
const TRANSACTION_QUEUE = 'transaction.queue';
const ACCOUNT_SERVICE_QUEUE = 'account.service.queue';
const NOTIFICATION_SERVICE_QUEUE = 'notification.service.queue';
const DEAD_LETTER_EXCHANGE = 'dead.letter.exchange';
const DEAD_LETTER_QUEUE = 'dead.letter.queue';

// Connection and channel variables
let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ
 * @returns {Promise<void>}
 */
async function connect() {
  try {
    // Create a connection
    connection = await amqp.connect(rabbitmqUrl);
    logger.info('Connected to RabbitMQ');

    // Create a channel
    channel = await connection.createChannel();
    logger.info('Channel created');

    // Assert exchange
    await channel.assertExchange(TRANSACTION_EXCHANGE, 'topic', { durable: true });
    logger.info(`Exchange ${TRANSACTION_EXCHANGE} asserted`);

    // Assert transaction queue
    await channel.assertQueue(TRANSACTION_QUEUE, { durable: true });
    await channel.bindQueue(TRANSACTION_QUEUE, TRANSACTION_EXCHANGE, 'transaction.#');
    logger.info(`Queue ${TRANSACTION_QUEUE} asserted and bound to exchange`);

    // Assert account service queue
    await channel.assertQueue(ACCOUNT_SERVICE_QUEUE, { durable: true });
    await channel.bindQueue(ACCOUNT_SERVICE_QUEUE, TRANSACTION_EXCHANGE, 'account.#');
    logger.info(`Queue ${ACCOUNT_SERVICE_QUEUE} asserted and bound to exchange`);

    // Assert notification service queue
    await channel.assertQueue(NOTIFICATION_SERVICE_QUEUE, { durable: true });
    await channel.bindQueue(NOTIFICATION_SERVICE_QUEUE, TRANSACTION_EXCHANGE, 'notification.#');
    logger.info(`Queue ${NOTIFICATION_SERVICE_QUEUE} asserted and bound to exchange`);

    // Assert dead letter exchange
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', { durable: true });
    logger.info(`Exchange ${DEAD_LETTER_EXCHANGE} asserted`);

    // Assert dead letter queue
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    await channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, 'dead.letter.#');
    logger.info(`Queue ${DEAD_LETTER_QUEUE} asserted and bound to exchange`);

    // Handle connection close
    connection.on('close', () => {
      logger.error('RabbitMQ connection closed');
      setTimeout(connect, 5000);
    });

    // Handle errors
    connection.on('error', (err) => {
      logger.error(`RabbitMQ connection error: ${err.message}`);
      setTimeout(connect, 5000);
    });

    return channel;
  } catch (error) {
    logger.error(`Error connecting to RabbitMQ: ${error.message}`);
    setTimeout(connect, 5000);
  }
}

/**
 * Publish a message to the exchange
 * @param {string} routingKey - The routing key for the message
 * @param {object} message - The message to publish
 * @param {object} options - Additional options
 * @param {number} options.retries - Number of retries (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<boolean>} - True if the message was published successfully
 */
async function publishMessage(routingKey, message, options = {}) {
  const { retries = 3, retryDelay = 1000 } = options;
  let attempts = 0;
  
  while (attempts <= retries) {
    try {
      if (!channel) {
        await connect();
      }

      const success = channel.publish(
        TRANSACTION_EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { 
          persistent: true,
          messageId: message.id || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          timestamp: Date.now(),
          contentType: 'application/json'
        }
      );

      if (success) {
        logger.info(`Message published to ${routingKey}`);
        return true;
      } else {
        logger.error(`Failed to publish message to ${routingKey}`);
        
        // If this was the last attempt, return false
        if (attempts === retries) {
          return false;
        }
        
        // Otherwise, retry
        attempts++;
        logger.info(`Retrying publish (${attempts}/${retries}) after ${retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      logger.error(`Error publishing message: ${error.message}`);
      
      // If this was the last attempt, throw the error
      if (attempts === retries) {
        return false;
      }
      
      // Otherwise, retry with exponential backoff
      attempts++;
      const backoffDelay = retryDelay * Math.pow(2, attempts - 1);
      logger.info(`Retrying publish (${attempts}/${retries}) after ${backoffDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  return false;
}

/**
 * Consume messages from a queue
 * @param {string} queueName - The name of the queue to consume from
 * @param {function} callback - The callback function to handle messages
 * @param {object} options - Additional options
 * @param {number} options.maxRetries - Maximum number of retries before sending to dead letter queue (default: 3)
 * @returns {Promise<void>}
 */
async function consumeMessages(queueName, callback, options = {}) {
  const { maxRetries = 3 } = options;
  
  try {
    if (!channel) {
      await connect();
    }
    
    // Assert dead letter exchange and queue if they don't exist
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    await channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, '#');
    logger.info(`Dead letter exchange and queue asserted`);

    await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const retryCount = (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;
          
          logger.info(`Received message from ${queueName}: ${JSON.stringify(content)}`);
          
          try {
            await callback(content, msg.properties);
            channel.ack(msg);
            logger.info(`Successfully processed message from ${queueName}`);
          } catch (error) {
            logger.error(`Error processing message: ${error.message}`);
            
            // Check if we should retry or send to dead letter queue
            if (retryCount < maxRetries) {
              // Retry with a delay based on retry count (exponential backoff)
              const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, etc.
              
              setTimeout(() => {
                try {
                  // Republish the message with incremented retry count
                  channel.publish(
                    msg.fields.exchange,
                    msg.fields.routingKey,
                    msg.content,
                    {
                      persistent: true,
                      headers: {
                        ...msg.properties.headers,
                        'x-retry-count': retryCount + 1,
                        'x-original-exchange': msg.fields.exchange,
                        'x-original-routing-key': msg.fields.routingKey,
                        'x-error-message': error.message
                      }
                    }
                  );
                  
                  logger.info(`Republished message for retry ${retryCount + 1}/${maxRetries}`);
                  channel.ack(msg);
                } catch (republishError) {
                  logger.error(`Error republishing message: ${republishError.message}`);
                  channel.nack(msg, false, true); // Requeue the message
                }
              }, retryDelay);
            } else {
              // Send to dead letter queue
              channel.publish(
                DEAD_LETTER_EXCHANGE,
                `dead.letter.${queueName}`,
                msg.content,
                {
                  persistent: true,
                  headers: {
                    ...msg.properties.headers,
                    'x-original-exchange': msg.fields.exchange,
                    'x-original-routing-key': msg.fields.routingKey,
                    'x-error-message': error.message,
                    'x-failed-at': new Date().toISOString()
                  }
                }
              );
              
              logger.warn(`Message sent to dead letter queue after ${retryCount} retries`);
              channel.ack(msg); // Acknowledge the original message
            }
          }
        } catch (parseError) {
          logger.error(`Error parsing message: ${parseError.message}`);
          
          // Send malformed messages to dead letter queue
          channel.publish(
            DEAD_LETTER_EXCHANGE,
            `dead.letter.${queueName}.malformed`,
            msg.content,
            {
              persistent: true,
              headers: {
                'x-error-message': parseError.message,
                'x-failed-at': new Date().toISOString()
              }
            }
          );
          
          channel.ack(msg); // Acknowledge the malformed message
        }
      }
    });

    logger.info(`Consuming messages from ${queueName}`);
  } catch (error) {
    logger.error(`Error consuming messages: ${error.message}`);
    setTimeout(() => consumeMessages(queueName, callback, options), 5000);
  }
}

/**
 * Close the RabbitMQ connection
 * @returns {Promise<void>}
 */
async function closeConnection() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error(`Error closing RabbitMQ connection: ${error.message}`);
  }
}

module.exports = {
  connect,
  publishMessage,
  consumeMessages,
  closeConnection,
  TRANSACTION_EXCHANGE,
  TRANSACTION_QUEUE,
  ACCOUNT_SERVICE_QUEUE,
  NOTIFICATION_SERVICE_QUEUE,
  DEAD_LETTER_EXCHANGE,
  DEAD_LETTER_QUEUE
}; 