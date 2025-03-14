const shared = require('@xnl/shared');
const RabbitMQManager = shared.events.RabbitMQManager;
const winston = require('winston');

// Create a simple logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  ]
});

// Create a singleton instance of RabbitMQManager
const rabbitMQManager = new RabbitMQManager({
  url: process.env.RABBITMQ_URL || 'amqp://localhost',
  exchangeName: process.env.RABBITMQ_EXCHANGE || 'xnl_events',
  exchangeType: 'topic'
});

// Initialize RabbitMQ connection
const initializeRabbitMQ = async () => {
  try {
    await rabbitMQManager.connect();
    logger.info('Connected to RabbitMQ successfully');
    
    return true;
  } catch (error) {
    logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
    return false;
  }
};

// Initialize RabbitMQ connection on startup
initializeRabbitMQ();

/**
 * Event Publisher Middleware
 * This middleware adds an eventPublisher object to the request object
 * to allow controllers to publish events to RabbitMQ
 */
const eventPublisherMiddleware = () => {
  // Return middleware function
  return (req, res, next) => {
    // Add eventPublisher to request object
    req.eventPublisher = {
      /**
       * Publish an event to RabbitMQ
       * @param {string} service - The service name (e.g., 'users', 'accounts')
       * @param {string} eventType - The event type (e.g., 'user.created', 'account.updated')
       * @param {object} data - The event data
       * @returns {Promise<boolean>} - Whether the event was published successfully
       */
      publishEvent: async (service, eventType, data) => {
        try {
          // Create event object
          const event = {
            id: require('crypto').randomUUID(),
            service,
            type: eventType,
            timestamp: new Date().toISOString(),
            data
          };
          
          // Check if RabbitMQ is connected
          try {
            // Try to publish event to RabbitMQ
            const success = await rabbitMQManager.publish(
              rabbitMQManager.config.exchangeName,
              eventType,
              event
            );
            
            if (!success) {
              logger.error(`Failed to publish event: ${eventType}`);
            }
            
            return success;
          } catch (publishError) {
            logger.error(`Error publishing event: ${publishError.message}`);
            logger.info('Continuing without publishing event to RabbitMQ');
            return true; // Return true to prevent blocking the request
          }
        } catch (error) {
          logger.error(`Error creating event: ${error.message}`);
          return true; // Return true to prevent blocking the request
        }
      }
    };
    
    next();
  };
};

module.exports = eventPublisherMiddleware; 