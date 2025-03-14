require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { initializeRabbitMQ } = require('./utils/rabbitmq');
const { initializeWebSocket } = require('./utils/websocket');
const routes = require('./routes');
const logger = require('./utils/logger');
const { setupEventConsumers } = require('./events/consumers');
const { notFound, errorConverter, errorHandler } = require('./middleware/error.middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'notification-service' });
});

// Error handling middleware
app.use(notFound);
app.use(errorConverter);
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('Connected to MongoDB');
  
  // Initialize RabbitMQ
  return initializeRabbitMQ({
    retryOptions: {
      retries: 5,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 60000
    }
  });
})
.then(() => {
  logger.info('Connected to RabbitMQ');
  
  // Setup event consumers
  return setupEventConsumers();
})
.then(() => {
  logger.info('Event consumers set up successfully');
  
  // Initialize WebSocket server
  initializeWebSocket(server);
  
  // Start server
  server.listen(PORT, () => {
    logger.info(`Notification service running on port ${PORT}`);
  });
})
.catch(err => {
  logger.error('Failed to start notification service', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
  // Don't crash the server, but log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  // Exit with error
  process.exit(1);
}); 