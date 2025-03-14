const express = require('express');
const router = express.Router();
const financialOverviewController = require('../controllers/financial-overview.controller');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validator');

/**
 * @route GET /api/financial-overview
 * @desc Get consolidated financial overview for a user
 * @access Private
 */
router.get(
  '/',
  authenticate,
  financialOverviewController.getFinancialOverview
);

/**
 * @route GET /api/financial-overview/account-balances
 * @desc Get account balances for a user
 * @access Private
 */
router.get(
  '/account-balances',
  authenticate,
  financialOverviewController.getAccountBalances
);

/**
 * @route GET /api/financial-overview/net-worth-history
 * @desc Get net worth history for a user
 * @access Private
 */
router.get(
  '/net-worth-history',
  authenticate,
  financialOverviewController.getNetWorthHistory
);

/**
 * @route GET /api/financial-overview/cash-flow
 * @desc Get cash flow for a user
 * @access Private
 */
router.get(
  '/cash-flow',
  authenticate,
  financialOverviewController.getCashFlow
);

module.exports = router; 