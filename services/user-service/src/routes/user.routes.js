const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/user.controller');
const shared = require('@xnl/shared');
const { authenticate, authorize } = shared.middleware;
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @route GET /api/users/profile
 * @desc Get current user profile
 * @access Private
 */
router.get(
  '/profile',
  authenticate,
  userController.getProfile
);

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('profile.phoneNumber').optional().isMobilePhone().withMessage('Please enter a valid phone number'),
    body('profile.address.street').optional().notEmpty().withMessage('Street cannot be empty'),
    body('profile.address.city').optional().notEmpty().withMessage('City cannot be empty'),
    body('profile.address.state').optional().notEmpty().withMessage('State cannot be empty'),
    body('profile.address.zipCode').optional().notEmpty().withMessage('Zip code cannot be empty'),
    body('profile.address.country').optional().notEmpty().withMessage('Country cannot be empty'),
    body('profile.dateOfBirth').optional().isISO8601().withMessage('Please enter a valid date'),
  ],
  validate,
  userController.updateProfile
);

/**
 * @route PUT /api/users/change-password
 * @desc Change password
 * @access Private
 */
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/\d/)
      .withMessage('Password must contain a number')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter'),
  ],
  validate,
  userController.changePassword
);

/**
 * @route POST /api/users/kyc-documents
 * @desc Upload KYC document
 * @access Private
 */
router.post(
  '/kyc-documents',
  authenticate,
  [
    body('documentType')
      .isIn(['passport', 'drivers_license', 'national_id', 'utility_bill'])
      .withMessage('Invalid document type'),
    body('documentId').notEmpty().withMessage('Document ID is required'),
  ],
  validate,
  userController.uploadKycDocument
);

/**
 * Admin routes
 */

/**
 * @route GET /api/users
 * @desc Get all users
 * @access Admin
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  userController.getAllUsers
);

/**
 * @route GET /api/users/:userId
 * @desc Get user by ID
 * @access Admin
 */
router.get(
  '/:userId',
  authenticate,
  authorize('admin'),
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
  ],
  validate,
  userController.getUserById
);

/**
 * @route PUT /api/users/:userId
 * @desc Update user
 * @access Admin
 */
router.put(
  '/:userId',
  authenticate,
  authorize('admin'),
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('role').optional().isIn(['user', 'admin', 'financial_advisor']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('isEmailVerified').optional().isBoolean().withMessage('isEmailVerified must be a boolean'),
    body('profile.kycVerified').optional().isBoolean().withMessage('kycVerified must be a boolean'),
  ],
  validate,
  userController.updateUser
);

/**
 * @route DELETE /api/users/:userId
 * @desc Delete user
 * @access Admin
 */
router.delete(
  '/:userId',
  authenticate,
  authorize('admin'),
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
  ],
  validate,
  userController.deleteUser
);

module.exports = router; 