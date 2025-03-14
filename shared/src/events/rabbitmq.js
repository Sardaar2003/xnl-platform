const amqp = require('amqplib');

// Try to use shared logger, but fall back to local logger if not available
let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  // Create a simple local logger
  logger = {
    info: (message) => console.log(`[INFO] ${message}`),
    error: (message) => console.error(`[ERROR] ${message}`),
    warn: (message) => console.warn(`[WARN] ${message}`),
    debug: (message) => console.debug(`[DEBUG] ${message}`)
  };
}

class RabbitMQManager {
  constructor(config = {}) {
    this.config = {
      url: config.url || process.env.RABBITMQ_URL || 'amqp://localhost',
      exchangeName: config.exchangeName || 'xnl_events',
      exchangeType: config.exchangeType || 'topic',
      reconnectInterval: config.reconnectInterval || 5000
    };
    
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.consumers = new Map();
  }
  
  async connect() {
    if (this.connection || this.isConnecting) return;
    
    this.isConnecting = true;
    
    try {
      logger.info(`Connecting to RabbitMQ at ${this.config.url}`);
      
      this.connection = await amqp.connect(this.config.url);
      
      this.connection.on('error', (err) => {
        logger.error(`RabbitMQ connection error: ${err.message}`);
        this.reconnect();
      });
      
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.reconnect();
      });
      
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange(
        this.config.exchangeName,
        this.config.exchangeType,
        { durable: true }
      );
      
      logger.info('Connected to RabbitMQ successfully');
      this.isConnecting = false;
      
      // Reestablish consumers if any
      if (this.consumers.size > 0) {
        for (const [queue, callback] of this.consumers.entries()) {
          await this.subscribe(queue, callback);
        }
      }
    } catch (error) {
      logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      this.isConnecting = false;
      this.reconnect();
    }
  }
  
  reconnect() {
    if (this.isConnecting) return;
    
    this.connection = null;
    this.channel = null;
    
    setTimeout(() => {
      logger.info('Attempting to reconnect to RabbitMQ');
      this.connect();
    }, this.config.reconnectInterval);
  }
  
  async publish(exchange, routingKey, message) {
    if (!this.channel) {
      await this.connect();
    }
    
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        contentType: 'application/json'
      });
      
      logger.debug(`Published message to ${exchange} with routing key ${routingKey}`);
      return true;
    } catch (error) {
      logger.error(`Failed to publish message: ${error.message}`);
      return false;
    }
  }
  
  async subscribe(queue, callback) {
    if (!this.channel) {
      await this.connect();
      
      // Store consumer for reconnection
      this.consumers.set(queue, callback);
    }
    
    try {
      await this.channel.assertQueue(queue, { durable: true });
      
      this.channel.consume(queue, (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            callback(content, msg);
            this.channel.ack(msg);
          } catch (error) {
            logger.error(`Error processing message: ${error.message}`);
            this.channel.nack(msg, false, false);
          }
        }
      });
      
      logger.info(`Subscribed to queue: ${queue}`);
      return true;
    } catch (error) {
      logger.error(`Failed to subscribe to queue ${queue}: ${error.message}`);
      return false;
    }
  }
  
  async bindQueue(queue, exchange, routingKey) {
    if (!this.channel) {
      await this.connect();
    }
    
    try {
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey);
      
      logger.info(`Bound queue ${queue} to exchange ${exchange} with routing key ${routingKey}`);
      return true;
    } catch (error) {
      logger.error(`Failed to bind queue: ${error.message}`);
      return false;
    }
  }
  
  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    
    if (this.connection) {
      await this.connection.close();
    }
    
    this.channel = null;
    this.connection = null;
    this.consumers.clear();
    
    logger.info('Closed RabbitMQ connection');
  }
}

module.exports = RabbitMQManager;
