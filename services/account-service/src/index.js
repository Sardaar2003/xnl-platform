require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const rabbitmq = require('./utils/rabbitmq');
const messageHandler = require('./utils/messageHandler');

// Import routes
const accountRoutes = require('./routes/account.routes');
const financialOverviewRoutes = require('./routes/financial-overview.routes');
const externalAccountRoutes = require('./routes/external-account.routes');

// Import middleware
const { notFound, errorConverter, errorHandler } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Set up middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xnl-account-service')
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'account-service',
    uptime: process.uptime(),
    dbConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/accounts', accountRoutes);
app.use('/api/financial-overview', financialOverviewRoutes);
app.use('/api/external-accounts', externalAccountRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorConverter);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  logger.info(`Account service running on port ${PORT}`);
  
  // Initialize RabbitMQ connection
  initializeRabbitMQ();
});

/**
 * Initialize RabbitMQ connection
 */
async function initializeRabbitMQ() {
  try {
    // Connect to RabbitMQ
    await rabbitmq.connect();
    logger.info('RabbitMQ connection initialized');
    
    // Set up message consumers with retry options
    await rabbitmq.consumeMessages(
      rabbitmq.TRANSACTION_SERVICE_QUEUE, 
      messageHandler.processTransactionEvent,
      { maxRetries: 3 }
    );
    logger.info('Transaction event consumer initialized');
    
    // Set up user event consumer if needed
    // await rabbitmq.consumeMessages(
    //   'user.events.account', 
    //   messageHandler.processUserEvent,
    //   { maxRetries: 3 }
    // );
    // logger.info('User event consumer initialized');
  } catch (error) {
    logger.error(`Error initializing RabbitMQ: ${error.message}`);
    setTimeout(initializeRabbitMQ, 5000);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Graceful shutdown function
 */
async function gracefulShutdown() {
  logger.info('Received shutdown signal, closing connections...');
  
  try {
    // Close RabbitMQ connection
    await rabbitmq.closeConnection();
    
    // Close MongoDB connection
    await mongoose.connection.close();
    
    logger.info('Connections closed, exiting process');
    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error.message}`);
    process.exit(1);
  }
}

module.exports = app; 