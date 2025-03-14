const logger = require('./logger');
const Transaction = require('../models/transaction.model');
const { ApiError } = require('../middleware/errorHandler');
const axios = require('axios');

// Account service URL
const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3002';

/**
 * Process account events
 * @param {Object} message - The message content
 * @returns {Promise<void>}
 */
async function processAccountEvent(message) {
  try {
    const { event, data } = message;
    logger.info(`Processing account event: ${event}`);

    switch (event) {
      case 'account.created':
        // Handle account created event
        await handleAccountCreated(data);
        break;
      
      case 'account.updated':
        // Handle account updated event
        await handleAccountUpdated(data);
        break;
      
      case 'account.closed':
        // Handle account closed event
        await handleAccountClosed(data);
        break;
      
      case 'account.balance.updated':
        // Handle account balance updated event
        await handleAccountBalanceUpdated(data);
        break;
      
      default:
        logger.warn(`Unhandled account event: ${event}`);
    }
  } catch (error) {
    logger.error(`Error processing account event: ${error.message}`);
  }
}

/**
 * Process notification events
 * @param {Object} message - The message content
 * @returns {Promise<void>}
 */
async function processNotificationEvent(message) {
  try {
    const { event, data } = message;
    logger.info(`Processing notification event: ${event}`);

    // Handle notification events if needed
  } catch (error) {
    logger.error(`Error processing notification event: ${error.message}`);
  }
}

/**
 * Handle account created event
 * @param {Object} data - Account data
 * @returns {Promise<void>}
 */
async function handleAccountCreated(data) {
  try {
    logger.info(`Handling account created: ${data._id}`);
    
    // No specific action needed for now
    // Could be used for analytics or to trigger welcome transactions
    
  } catch (error) {
    logger.error(`Error handling account created: ${error.message}`);
  }
}

/**
 * Handle account updated event
 * @param {Object} data - Account data
 * @returns {Promise<void>}
 */
async function handleAccountUpdated(data) {
  try {
    logger.info(`Handling account updated: ${data._id}`);
    
    // Update any cached account information if needed
    
  } catch (error) {
    logger.error(`Error handling account updated: ${error.message}`);
  }
}

/**
 * Handle account closed event
 * @param {Object} data - Account data
 * @returns {Promise<void>}
 */
async function handleAccountClosed(data) {
  try {
    logger.info(`Handling account closed: ${data._id}`);
    
    // Cancel any pending transactions for this account
    const pendingTransactions = await Transaction.find({
      $or: [
        { sourceAccountId: data._id },
        { destinationAccountId: data._id }
      ],
      status: 'PENDING'
    });
    
    for (const transaction of pendingTransactions) {
      transaction.status = 'CANCELLED';
      transaction.cancelledAt = Date.now();
      transaction.metadata.set('cancelReason', 'Account closed');
      
      await transaction.save();
      logger.info(`Transaction ${transaction._id} cancelled due to account closure`);
    }
    
  } catch (error) {
    logger.error(`Error handling account closed: ${error.message}`);
  }
}

/**
 * Handle account balance updated event
 * @param {Object} data - Account balance data
 * @returns {Promise<void>}
 */
async function handleAccountBalanceUpdated(data) {
  try {
    logger.info(`Handling account balance updated: ${data.accountId}`);
    
    // Check if there are any pending transactions that can now be processed
    // due to sufficient balance
    if (data.operation === 'CREDIT') {
      const pendingTransactions = await Transaction.find({
        sourceAccountId: data.accountId,
        status: 'PENDING'
      }).sort({ createdAt: 1 });
      
      for (const transaction of pendingTransactions) {
        // Try to process the transaction
        try {
          // Check current account balance
          const accountResponse = await axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts/${data.accountId}`);
          const account = accountResponse.data.data;
          
          // If sufficient balance, process the transaction
          if (account.balance >= transaction.amount) {
            logger.info(`Processing previously pending transaction ${transaction._id} due to balance update`);
            
            // This would call your transaction processing logic
            // For simplicity, we're just logging it here
          }
        } catch (error) {
          logger.error(`Error checking account for transaction processing: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    logger.error(`Error handling account balance updated: ${error.message}`);
  }
}

module.exports = {
  processAccountEvent,
  processNotificationEvent
}; 