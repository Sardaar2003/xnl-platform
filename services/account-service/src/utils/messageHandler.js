const logger = require('./logger');
const Account = require('../models/account.model');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Process transaction events
 * @param {Object} message - The message content
 * @returns {Promise<void>}
 */
async function processTransactionEvent(message) {
  try {
    const { event, data } = message;
    logger.info(`Processing transaction event: ${event}`);

    switch (event) {
      case 'transaction.completed':
        // Handle transaction completed event
        await handleTransactionCompleted(data);
        break;
      
      case 'transaction.failed':
        // Handle transaction failed event
        await handleTransactionFailed(data);
        break;
      
      case 'transaction.cancelled':
        // Handle transaction cancelled event
        await handleTransactionCancelled(data);
        break;
      
      default:
        logger.warn(`Unhandled transaction event: ${event}`);
    }
  } catch (error) {
    logger.error(`Error processing transaction event: ${error.message}`);
  }
}

/**
 * Process user events
 * @param {Object} message - The message content
 * @returns {Promise<void>}
 */
async function processUserEvent(message) {
  try {
    const { event, data } = message;
    logger.info(`Processing user event: ${event}`);

    switch (event) {
      case 'user.created':
        // Handle user created event - potentially create default accounts
        await handleUserCreated(data);
        break;
      
      case 'user.updated':
        // Handle user update event if needed
        await handleUserUpdate(data);
        break;
      
      case 'user.deleted':
        // Handle user deleted event - potentially close accounts
        await handleUserDeleted(data);
        break;
      
      default:
        logger.warn(`Unhandled user event: ${event}`);
    }
  } catch (error) {
    logger.error(`Error processing user event: ${error.message}`);
  }
}

/**
 * Handle transaction completed event
 * @param {Object} data - Transaction data
 * @returns {Promise<void>}
 */
async function handleTransactionCompleted(data) {
  try {
    logger.info(`Handling transaction completed: ${data.transactionId}`);
    
    // This would typically be handled by direct API calls from the Transaction Service
    // But we can add additional logic here if needed
    
  } catch (error) {
    logger.error(`Error handling transaction completed: ${error.message}`);
  }
}

/**
 * Handle transaction failed event
 * @param {Object} data - Transaction data
 * @returns {Promise<void>}
 */
async function handleTransactionFailed(data) {
  try {
    logger.info(`Handling transaction failed: ${data.transactionId}`);
    
    // Add logic to handle failed transactions if needed
    // For example, reverting any pending changes or updating account status
    
  } catch (error) {
    logger.error(`Error handling transaction failed: ${error.message}`);
  }
}

/**
 * Handle transaction cancelled event
 * @param {Object} data - Transaction data
 * @returns {Promise<void>}
 */
async function handleTransactionCancelled(data) {
  try {
    logger.info(`Handling transaction cancelled: ${data.transactionId}`);
    
    // Add logic to handle cancelled transactions if needed
    
  } catch (error) {
    logger.error(`Error handling transaction cancelled: ${error.message}`);
  }
}

/**
 * Handle user created event
 * @param {Object} data - User data
 * @returns {Promise<void>}
 */
async function handleUserCreated(data) {
  try {
    logger.info(`Handling user created: ${data._id}`);
    
    // Check if we should automatically create default accounts for new users
    // This is a business decision - some platforms create default accounts automatically
    
    // Example: Create a default checking account
    /*
    const defaultAccount = new Account({
      userId: data._id,
      accountType: 'CHECKING',
      name: 'Default Checking Account',
      currency: 'USD',
      description: 'Default account created on user registration',
      balance: 0,
      status: 'ACTIVE'
    });
    
    await defaultAccount.save();
    logger.info(`Default account created for user ${data._id}: ${defaultAccount._id}`);
    */
    
  } catch (error) {
    logger.error(`Error handling user created: ${error.message}`);
  }
}

/**
 * Handle user deleted event
 * @param {Object} data - User data
 * @returns {Promise<void>}
 */
async function handleUserDeleted(data) {
  try {
    logger.info(`Handling user deleted: ${data._id}`);
    
    // Close all accounts for the deleted user
    const accounts = await Account.find({ userId: data._id, status: { $ne: 'CLOSED' } });
    
    for (const account of accounts) {
      // Check if account has balance
      if (account.balance > 0) {
        logger.warn(`Cannot close account ${account._id} with positive balance for deleted user ${data._id}`);
        continue;
      }
      
      account.status = 'CLOSED';
      account.closedAt = Date.now();
      account.updatedAt = Date.now();
      
      await account.save();
      logger.info(`Account ${account._id} closed due to user deletion`);
    }
    
  } catch (error) {
    logger.error(`Error handling user deleted: ${error.message}`);
  }
}

/**
 * Handle user update event
 * @param {Object} data - User update event data
 */
async function handleUserUpdate(data) {
  try {
    const { userId, updatedFields } = data;
    
    logger.info(`Processing user update for userId: ${userId}`);
    
    // If we need to update any account-related information based on user updates
    if (updatedFields && Object.keys(updatedFields).length > 0) {
      // Example: Update accounts if user email or name changed
      if (updatedFields.email || updatedFields.name) {
        const accounts = await Account.find({ userId });
        
        logger.info(`Found ${accounts.length} accounts to update for user ${userId}`);
        
        // Update relevant account information if needed
        // This is just an example - implement based on your specific requirements
        for (const account of accounts) {
          // You might want to update account metadata or other fields
          // based on user information changes
          if (account.metadata) {
            account.metadata.lastUserUpdate = new Date();
            await account.save();
          }
        }
      }
    }
    
    logger.info(`Successfully processed user update for userId: ${userId}`);
  } catch (error) {
    logger.error(`Error handling user update: ${error.message}`, { error });
    throw error;
  }
}

module.exports = {
  processTransactionEvent,
  processUserEvent
}; 