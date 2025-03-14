const logger = require('./logger');
const notificationController = require('../controllers/notification.controller');
const templateController = require('../controllers/template.controller');
const { ApiError } = require('../middleware/error.middleware');

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
        // Send welcome notification
        await sendWelcomeNotification(data);
        break;
      
      case 'user.updated':
        // Handle user update event if needed
        break;
      
      case 'user.password_reset':
        // Send password reset notification
        await sendPasswordResetNotification(data);
        break;
      
      case 'user.login':
        // Send login notification if needed
        await sendLoginNotification(data);
        break;
      
      default:
        logger.warn(`Unhandled user event: ${event}`);
    }
  } catch (error) {
    logger.error(`Error processing user event: ${error.message}`);
  }
}

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
      case 'transaction.created':
        // Send transaction notification
        await sendTransactionNotification(data);
        break;
      
      case 'transaction.updated':
        // Handle transaction update event if needed
        await sendTransactionUpdatedNotification(data);
        break;
      
      case 'transaction.failed':
        // Send transaction failed notification
        await sendTransactionFailedNotification(data);
        break;
      
      default:
        logger.warn(`Unhandled transaction event: ${event}`);
    }
  } catch (error) {
    logger.error(`Error processing transaction event: ${error.message}`);
  }
}

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
        // Send account created notification
        await sendAccountCreatedNotification(data);
        break;
      
      case 'account.updated':
        // Handle account update event if needed
        await sendAccountUpdatedNotification(data);
        break;
      
      case 'account.closed':
        // Send account closed notification
        await sendAccountClosedNotification(data);
        break;
      
      case 'account.low_balance':
        // Send low balance notification
        await sendLowBalanceNotification(data);
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

    switch (event) {
      case 'notification.send':
        // Create and send notification
        await createAndSendNotification(data);
        break;
      
      case 'notification.bulk_send':
        // Create and send bulk notifications
        await createAndSendBulkNotifications(data);
        break;
      
      default:
        logger.warn(`Unhandled notification event: ${event}`);
    }
  } catch (error) {
    logger.error(`Error processing notification event: ${error.message}`);
  }
}

/**
 * Send welcome notification
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
async function sendWelcomeNotification(userData) {
  try {
    const { _id: userId, firstName, email } = userData;
    
    // Render welcome template
    const templateData = await templateController.renderTemplateByName('welcome', {
      firstName: firstName || 'User',
      email: email
    });

    if (!templateData) {
      throw new Error('Welcome template not found');
    }

    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: 'Welcome to XNL Fintech Platform',
      message: templateData.content,
      priority: 'MEDIUM',
      data: { userData }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Welcome notification sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error sending welcome notification: ${error.message}`);
  }
}

/**
 * Send password reset notification
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
async function sendPasswordResetNotification(userData) {
  try {
    const { _id: userId, email, resetToken } = userData;
    
    // Render password reset template
    const templateData = await templateController.renderTemplateByName('password_reset', {
      email: email,
      resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    });

    if (!templateData) {
      throw new Error('Password reset template not found');
    }

    // Create notification
    const notification = {
      userId,
      type: 'EMAIL',
      title: 'Password Reset Request',
      message: templateData.content,
      priority: 'HIGH',
      data: { resetToken }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Password reset notification sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error sending password reset notification: ${error.message}`);
  }
}

/**
 * Send login notification
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
async function sendLoginNotification(userData) {
  try {
    const { _id: userId, ip, device, location } = userData;
    
    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: 'New Login Detected',
      message: `A new login was detected from ${location || 'unknown location'} using ${device || 'unknown device'}.`,
      priority: 'MEDIUM',
      data: { ip, device, location }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Login notification sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error sending login notification: ${error.message}`);
  }
}

/**
 * Send transaction notification
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<void>}
 */
async function sendTransactionNotification(transactionData) {
  try {
    const { userId, type, amount, currency, description } = transactionData;
    
    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: `${type} Transaction`,
      message: `A ${type.toLowerCase()} transaction of ${amount} ${currency} has been processed. ${description || ''}`,
      priority: 'MEDIUM',
      data: { transactionData }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Transaction notification sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error sending transaction notification: ${error.message}`);
  }
}

/**
 * Send transaction failed notification
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<void>}
 */
async function sendTransactionFailedNotification(transactionData) {
  try {
    const { userId, type, amount, currency, failureReason } = transactionData;
    
    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: 'Transaction Failed',
      message: `Your ${type.toLowerCase()} transaction of ${amount} ${currency} has failed. Reason: ${failureReason || 'Unknown error'}`,
      priority: 'HIGH',
      data: { transactionData }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Transaction failed notification sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error sending transaction failed notification: ${error.message}`);
  }
}

/**
 * Send account created notification
 * @param {Object} accountData - Account data
 * @returns {Promise<void>}
 */
async function sendAccountCreatedNotification(accountData) {
  try {
    const { userId, accountType, name, accountNumber } = accountData;
    
    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: 'Account Created',
      message: `Your new ${accountType} account "${name}" has been created successfully. Account number: ${accountNumber}`,
      priority: 'MEDIUM',
      data: { accountData }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Account created notification sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error sending account created notification: ${error.message}`);
  }
}

/**
 * Send account closed notification
 * @param {Object} accountData - Account data
 * @returns {Promise<void>}
 */
async function sendAccountClosedNotification(accountData) {
  try {
    const { userId, accountType, name, accountNumber } = accountData;
    
    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: 'Account Closed',
      message: `Your ${accountType} account "${name}" (${accountNumber}) has been closed.`,
      priority: 'MEDIUM',
      data: { accountData }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Account closed notification sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error sending account closed notification: ${error.message}`);
  }
}

/**
 * Send low balance notification
 * @param {Object} accountData - Account data
 * @returns {Promise<void>}
 */
async function sendLowBalanceNotification(accountData) {
  try {
    const { userId, name, balance, currency, threshold } = accountData;
    
    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: 'Low Balance Alert',
      message: `Your account "${name}" balance is below the threshold. Current balance: ${balance} ${currency}. Threshold: ${threshold} ${currency}`,
      priority: 'HIGH',
      data: { accountData }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Low balance notification sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error sending low balance notification: ${error.message}`);
  }
}

/**
 * Create and send notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<void>}
 */
async function createAndSendNotification(notificationData) {
  try {
    await notificationController.createNotificationInternal(notificationData);
    logger.info(`Notification created and sent to user ${notificationData.userId}`);
  } catch (error) {
    logger.error(`Error creating and sending notification: ${error.message}`);
  }
}

/**
 * Create and send bulk notifications
 * @param {Object} bulkData - Bulk notification data
 * @returns {Promise<void>}
 */
async function createAndSendBulkNotifications(bulkData) {
  try {
    const { userIds, notification } = bulkData;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('Invalid user IDs for bulk notification');
    }

    const notifications = userIds.map(userId => ({
      ...notification,
      userId
    }));

    await notificationController.createBulkNotificationsInternal(notifications);
    logger.info(`Bulk notifications sent to ${userIds.length} users`);
  } catch (error) {
    logger.error(`Error sending bulk notifications: ${error.message}`);
  }
}

/**
 * Send transaction updated notification
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<void>}
 */
async function sendTransactionUpdatedNotification(transactionData) {
  try {
    const { userId, transactionId, status, type, amount, currency } = transactionData;
    
    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: 'Transaction Updated',
      message: `Your ${type.toLowerCase()} transaction of ${amount} ${currency} has been updated. Status: ${status}`,
      priority: 'MEDIUM',
      data: { transactionData }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Transaction updated notification sent to user ${userId} for transaction ${transactionId}`);
  } catch (error) {
    logger.error(`Error sending transaction updated notification: ${error.message}`);
  }
}

/**
 * Send account updated notification
 * @param {Object} accountData - Account data
 * @returns {Promise<void>}
 */
async function sendAccountUpdatedNotification(accountData) {
  try {
    const { userId, accountId, name, accountType, updatedFields } = accountData;
    
    // Create a message based on what was updated
    let updateMessage = `Your ${accountType} account "${name}" has been updated.`;
    
    if (updatedFields) {
      if (updatedFields.status) {
        updateMessage = `Your ${accountType} account "${name}" status has been changed to ${updatedFields.status}.`;
      } else if (updatedFields.balance !== undefined) {
        updateMessage = `Your ${accountType} account "${name}" balance has been updated.`;
      }
    }
    
    // Create notification
    const notification = {
      userId,
      type: 'IN_APP',
      title: 'Account Updated',
      message: updateMessage,
      priority: 'MEDIUM',
      data: { accountData }
    };

    await notificationController.createNotificationInternal(notification);
    logger.info(`Account updated notification sent to user ${userId} for account ${accountId}`);
  } catch (error) {
    logger.error(`Error sending account updated notification: ${error.message}`);
  }
}

module.exports = {
  processUserEvent,
  processTransactionEvent,
  processAccountEvent,
  processNotificationEvent
}; 