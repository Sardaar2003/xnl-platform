const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const NotificationPreference = require('../models/notification-preference.model');
const { ApiError } = require('../middleware/error.middleware');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');
const { sendNotificationToUser } = require('../utils/websocket');
const { sendPushNotification } = require('../utils/push-notification');
const logger = require('../utils/logger');

/**
 * Create a new notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createNotification = async (req, res, next) => {
  try {
    const { userId, type, title, message, data, priority } = req.body;
    
    // Create notification
    const notification = new Notification({
      notificationId: uuidv4(),
      userId,
      type,
      title,
      message,
      data,
      priority: priority || 'normal',
      status: 'pending',
      createdAt: new Date()
    });
    
    await notification.save();
    
    // Process notification (send via appropriate channels)
    await processNotification(notification);
    
    res.status(201).json({
      success: true,
      data: {
        notification: {
          notificationId: notification.notificationId,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          status: notification.status,
          createdAt: notification.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

/**
 * Get notifications for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { status, type, page = 1, limit = 20 } = req.query;
    
    const query = { userId };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Notification.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map(notification => ({
          notificationId: notification.notificationId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          status: notification.status,
          createdAt: notification.createdAt,
          readAt: notification.readAt
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { notificationId } = req.params;
    
    const notification = await Notification.findOne({
      notificationId,
      userId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    notification.status = 'read';
    notification.readAt = new Date();
    await notification.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const { userId } = req.user;
    
    await Notification.updateMany(
      { userId, status: 'delivered' },
      { status: 'read', readAt: new Date() }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

/**
 * Delete notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { notificationId } = req.params;
    
    const notification = await Notification.findOne({
      notificationId,
      userId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    await notification.remove();
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

/**
 * Get notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getNotificationPreferences = async (req, res, next) => {
  try {
    const { userId } = req.user;
    
    let preferences = await NotificationPreference.findOne({ userId });
    
    if (!preferences) {
      // Create default preferences
      preferences = new NotificationPreference({
        userId,
        email: true,
        sms: true,
        push: true,
        inApp: true,
        types: {
          transaction: {
            email: true,
            sms: true,
            push: true,
            inApp: true
          },
          account: {
            email: true,
            sms: false,
            push: true,
            inApp: true
          },
          security: {
            email: true,
            sms: true,
            push: true,
            inApp: true
          },
          marketing: {
            email: true,
            sms: false,
            push: false,
            inApp: true
          }
        }
      });
      
      await preferences.save();
    }
    
    res.status(200).json({
      success: true,
      data: {
        preferences: {
          email: preferences.email,
          sms: preferences.sms,
          push: preferences.push,
          inApp: preferences.inApp,
          types: preferences.types
        }
      }
    });
  } catch (error) {
    logger.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message
    });
  }
};

/**
 * Update notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { email, sms, push, inApp, types } = req.body;
    
    let preferences = await NotificationPreference.findOne({ userId });
    
    if (!preferences) {
      preferences = new NotificationPreference({ userId });
    }
    
    if (email !== undefined) preferences.email = email;
    if (sms !== undefined) preferences.sms = sms;
    if (push !== undefined) preferences.push = push;
    if (inApp !== undefined) preferences.inApp = inApp;
    
    if (types) {
      // Update specific notification type preferences
      for (const [type, channels] of Object.entries(types)) {
        if (!preferences.types[type]) {
          preferences.types[type] = {};
        }
        
        for (const [channel, enabled] of Object.entries(channels)) {
          preferences.types[type][channel] = enabled;
        }
      }
    }
    
    await preferences.save();
    
    res.status(200).json({
      success: true,
      data: {
        preferences: {
          email: preferences.email,
          sms: preferences.sms,
          push: preferences.push,
          inApp: preferences.inApp,
          types: preferences.types
        }
      }
    });
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
};

// Process notification (internal function)
const processNotification = async (notification) => {
  try {
    const { userId, type, title, message, data, priority } = notification;
    
    // Get user
    const user = await User.findOne({ userId });
    
    if (!user) {
      logger.error(`User not found for notification: ${notification.notificationId}`);
      notification.status = 'failed';
      notification.error = 'User not found';
      await notification.save();
      return;
    }
    
    // Get user preferences
    let preferences = await NotificationPreference.findOne({ userId });
    
    if (!preferences) {
      // Create default preferences
      preferences = new NotificationPreference({
        userId,
        email: true,
        sms: true,
        push: true,
        inApp: true,
        types: {
          transaction: {
            email: true,
            sms: true,
            push: true,
            inApp: true
          },
          account: {
            email: true,
            sms: false,
            push: true,
            inApp: true
          },
          security: {
            email: true,
            sms: true,
            push: true,
            inApp: true
          },
          marketing: {
            email: true,
            sms: false,
            push: false,
            inApp: true
          }
        }
      });
      
      await preferences.save();
    }
    
    // Determine which channels to use based on preferences and notification type
    const channels = {
      email: preferences.email && preferences.types[type]?.email !== false,
      sms: preferences.sms && preferences.types[type]?.sms !== false,
      push: preferences.push && preferences.types[type]?.push !== false,
      inApp: preferences.inApp && preferences.types[type]?.inApp !== false
    };
    
    // Override preferences for high priority notifications
    if (priority === 'high') {
      channels.email = true;
      channels.sms = true;
      channels.push = true;
      channels.inApp = true;
    }
    
    // Send via appropriate channels
    const results = {
      email: false,
      sms: false,
      push: false,
      inApp: false
    };
    
    // Send in-app notification via WebSocket
    if (channels.inApp) {
      results.inApp = await sendNotificationToUser(userId, {
        notificationId: notification.notificationId,
        type,
        title,
        message,
        data,
        createdAt: notification.createdAt
      });
    }
    
    // Send email notification
    if (channels.email && user.email) {
      results.email = await sendEmail(user.email, title, message, {
        type,
        data
      });
    }
    
    // Send SMS notification
    if (channels.sms && user.phoneNumber) {
      results.sms = await sendSMS(user.phoneNumber, `${title}: ${message}`);
    }
    
    // Send push notification
    if (channels.push && user.pushTokens && user.pushTokens.length > 0) {
      results.push = await sendPushNotification(user.pushTokens, title, message, {
        type,
        data
      });
    }
    
    // Update notification status
    notification.status = 'delivered';
    notification.deliveredAt = new Date();
    notification.channels = results;
    await notification.save();
    
    logger.info(`Notification ${notification.notificationId} processed successfully`, { results });
    
    return results;
  } catch (error) {
    logger.error(`Error processing notification ${notification.notificationId}:`, error);
    
    notification.status = 'failed';
    notification.error = error.message;
    await notification.save();
    
    throw error;
  }
};

// Process notification from event (used by event consumers)
const processNotificationFromEvent = async (eventData) => {
  try {
    const { userId, type, title, message, data, priority } = eventData;
    
    // Create notification
    const notification = new Notification({
      notificationId: uuidv4(),
      userId,
      type,
      title,
      message,
      data,
      priority: priority || 'normal',
      status: 'pending',
      createdAt: new Date()
    });
    
    await notification.save();
    
    // Process notification
    return await processNotification(notification);
  } catch (error) {
    logger.error('Process notification from event error:', error);
    throw error;
  }
};

/**
 * Create a notification internally (for use by other services)
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createNotificationInternal = async (notificationData) => {
  try {
    const { userId, type, title, message, data, priority } = notificationData;
    
    // Create notification
    const notification = new Notification({
      notificationId: uuidv4(),
      userId,
      type,
      title,
      message,
      data,
      priority: priority || 'normal',
      status: 'pending',
      createdAt: new Date()
    });
    
    await notification.save();
    
    // Process notification (send via appropriate channels)
    await processNotification(notification);
    
    logger.info(`Notification created internally for user ${userId}: ${notification.notificationId}`);
    
    return notification;
  } catch (error) {
    logger.error(`Error creating notification internally: ${error.message}`, { error });
    throw error;
  }
};

/**
 * Create bulk notifications internally (for use by other services)
 * @param {Array} notifications - Array of notification data
 * @returns {Promise<Array>} Created notifications
 */
const createBulkNotificationsInternal = async (notifications) => {
  try {
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      throw new Error('Invalid notifications array');
    }
    
    const createdNotifications = [];
    
    for (const notificationData of notifications) {
      const notification = await createNotificationInternal(notificationData);
      createdNotifications.push(notification);
    }
    
    logger.info(`${createdNotifications.length} bulk notifications created internally`);
    
    return createdNotifications;
  } catch (error) {
    logger.error(`Error creating bulk notifications internally: ${error.message}`, { error });
    throw error;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  processNotificationFromEvent,
  createNotificationInternal,
  createBulkNotificationsInternal
}; 