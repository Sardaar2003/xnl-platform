const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const shared = require('@xnl/shared');
const authenticate = shared.middleware.authenticate;
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/\d/)
      .withMessage('Password must contain a number')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
  ],
  validate,
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

/**
 * @route POST /api/auth/login-with-mfa
 * @desc Login with MFA
 * @access Public
 */
router.post(
  '/login-with-mfa',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
    body('mfaToken').notEmpty().withMessage('MFA token is required'),
  ],
  validate,
  authController.loginWithMFA
);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token
 * @access Public
 */
router.post(
  '/refresh-token',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  validate,
  authController.refreshToken
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Public
 */
router.post(
  '/logout',
  authController.logout
);

/**
 * @route GET /api/auth/verify-email/:token
 * @desc Verify email
 * @access Public
 */
router.get(
  '/verify-email/:token',
  authController.verifyEmail
);

/**
 * @route POST /api/auth/request-password-reset
 * @desc Request password reset
 * @access Public
 */
router.post(
  '/request-password-reset',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
  ],
  validate,
  authController.requestPasswordReset
);

/**
 * @route GET /api/auth/reset-password/:token
 * @desc Verify reset token
 * @access Public
 */
router.get(
  '/reset-password/:token',
  authController.verifyResetToken
);

/**
 * @route POST /api/auth/reset-password/:token
 * @desc Reset password
 * @access Public
 */
router.post(
  '/reset-password/:token',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/\d/)
      .withMessage('Password must contain a number')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter'),
  ],
  validate,
  authController.resetPassword
);

/**
 * @route POST /api/auth/setup-mfa
 * @desc Setup MFA
 * @access Private
 */
router.post(
  '/setup-mfa',
  authenticate,
  authController.setupMFA
);

/**
 * @route POST /api/auth/verify-mfa
 * @desc Verify MFA token
 * @access Private
 */
router.post(
  '/verify-mfa',
  authenticate,
  authController.verifyMFA
);

module.exports = router; 