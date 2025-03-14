const amqp = require('amqplib');
const winston = require('winston');

// Create a logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// RabbitMQ connection URL
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Exchange and queue names
const NOTIFICATION_EXCHANGE = 'notification.exchange';
const NOTIFICATION_QUEUE = 'notification.queue';
const USER_EVENT_QUEUE = 'user.events.notification';
const TRANSACTION_EVENT_QUEUE = 'transaction.events.notification';
const ACCOUNT_EVENT_QUEUE = 'account.events.notification';

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
    await channel.assertExchange(NOTIFICATION_EXCHANGE, 'topic', { durable: true });
    logger.info(`Exchange ${NOTIFICATION_EXCHANGE} asserted`);

    // Assert notification queue
    await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
    await channel.bindQueue(NOTIFICATION_QUEUE, NOTIFICATION_EXCHANGE, 'notification.#');
    logger.info(`Queue ${NOTIFICATION_QUEUE} asserted and bound to exchange`);

    // Assert user events queue
    await channel.assertQueue(USER_EVENT_QUEUE, { durable: true });
    await channel.bindQueue(USER_EVENT_QUEUE, NOTIFICATION_EXCHANGE, 'user.#');
    logger.info(`Queue ${USER_EVENT_QUEUE} asserted and bound to exchange`);

    // Assert transaction events queue
    await channel.assertQueue(TRANSACTION_EVENT_QUEUE, { durable: true });
    await channel.bindQueue(TRANSACTION_EVENT_QUEUE, NOTIFICATION_EXCHANGE, 'transaction.#');
    logger.info(`Queue ${TRANSACTION_EVENT_QUEUE} asserted and bound to exchange`);

    // Assert account events queue
    await channel.assertQueue(ACCOUNT_EVENT_QUEUE, { durable: true });
    await channel.bindQueue(ACCOUNT_EVENT_QUEUE, NOTIFICATION_EXCHANGE, 'account.#');
    logger.info(`Queue ${ACCOUNT_EVENT_QUEUE} asserted and bound to exchange`);

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
 * @returns {Promise<boolean>} - True if the message was published successfully
 */
async function publishMessage(routingKey, message) {
  try {
    if (!channel) {
      await connect();
    }

    const success = channel.publish(
      NOTIFICATION_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    if (success) {
      logger.info(`Message published to ${routingKey}`);
    } else {
      logger.error(`Failed to publish message to ${routingKey}`);
    }

    return success;
  } catch (error) {
    logger.error(`Error publishing message: ${error.message}`);
    return false;
  }
}

/**
 * Consume messages from a queue
 * @param {string} queueName - The name of the queue to consume from
 * @param {function} callback - The callback function to handle messages
 * @returns {Promise<void>}
 */
async function consumeMessages(queueName, callback) {
  try {
    if (!channel) {
      await connect();
    }

    await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Received message from ${queueName}: ${JSON.stringify(content)}`);
          
          await callback(content, msg.properties);
          channel.ack(msg);
        } catch (error) {
          logger.error(`Error processing message: ${error.message}`);
          channel.nack(msg, false, false);
        }
      }
    });

    logger.info(`Consuming messages from ${queueName}`);
  } catch (error) {
    logger.error(`Error consuming messages: ${error.message}`);
    setTimeout(() => consumeMessages(queueName, callback), 5000);
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
  NOTIFICATION_EXCHANGE,
  NOTIFICATION_QUEUE,
  USER_EVENT_QUEUE,
  TRANSACTION_EVENT_QUEUE,
  ACCOUNT_EVENT_QUEUE
}; 