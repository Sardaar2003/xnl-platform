const express = require('express');
const { body, param, query } = require('express-validator');
const notificationController = require('../controllers/notification.controller');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @route POST /api/notifications
 * @desc Create a new notification
 * @access Private
 */
router.post(
  '/',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('type')
      .notEmpty()
      .withMessage('Notification type is required')
      .isIn(['ACCOUNT', 'TRANSACTION', 'SECURITY', 'SYSTEM', 'MARKETING'])
      .withMessage('Invalid notification type'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .withMessage('Invalid priority'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expiration date must be a valid ISO 8601 date'),
    validate
  ],
  notificationController.createNotification
);

/**
 * @route GET /api/notifications/user/:userId
 * @desc Get all notifications for a user
 * @access Private
 */
router.get(
  '/user/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    query('status')
      .optional()
      .isIn(['UNREAD', 'READ', 'ARCHIVED'])
      .withMessage('Invalid status'),
    query('type')
      .optional()
      .isIn(['ACCOUNT', 'TRANSACTION', 'SECURITY', 'SYSTEM', 'MARKETING'])
      .withMessage('Invalid notification type'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    validate
  ],
  notificationController.getUserNotifications
);

/**
 * @route GET /api/notifications/:id
 * @desc Get notification by ID
 * @access Private
 */
router.get(
  '/:id',
  [
    param('id').notEmpty().withMessage('Notification ID is required'),
    validate
  ],
  notificationController.getNotificationById
);

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.patch(
  '/:id/read',
  [
    param('id').notEmpty().withMessage('Notification ID is required'),
    validate
  ],
  notificationController.markAsRead
);

/**
 * @route PATCH /api/notifications/:id/archive
 * @desc Mark notification as archived
 * @access Private
 */
router.patch(
  '/:id/archive',
  [
    param('id').notEmpty().withMessage('Notification ID is required'),
    validate
  ],
  notificationController.markAsArchived
);

/**
 * @route PATCH /api/notifications/user/:userId/read-all
 * @desc Mark all notifications as read for a user
 * @access Private
 */
router.patch(
  '/user/:userId/read-all',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    validate
  ],
  notificationController.markAllAsRead
);

module.exports = router; 