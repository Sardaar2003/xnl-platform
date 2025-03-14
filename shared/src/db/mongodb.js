const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');

// Use environment variable with fallback
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/xnl';

/**
 * Connect to MongoDB
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
      logger.info('Connected to MongoDB');
      console.log('Connected to MongoDB');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err}`);
        console.log(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        console.log('MongoDB disconnected');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return mongoose.connection;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = {
  connectToMongoDB,
}; 