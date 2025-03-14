const express = require('express');
const router = express.Router();
const transactionAnalysisController = require('../controllers/transaction-analysis.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @route GET /api/transactions/summary
 * @desc Get transaction summary for a user
 * @access Private
 */
router.get(
  '/summary',
  authenticate,
  transactionAnalysisController.getTransactionSummary
);

/**
 * @route GET /api/transactions/insights
 * @desc Get spending insights for a user
 * @access Private
 */
router.get(
  '/insights',
  authenticate,
  transactionAnalysisController.getSpendingInsights
);

/**
 * @route GET /api/transactions/net-worth-history
 * @desc Get net worth history for a user
 * @access Private
 */
router.get(
  '/net-worth-history',
  authenticate,
  transactionAnalysisController.getNetWorthHistory
);

/**
 * @route GET /api/transactions/cash-flow
 * @desc Get cash flow for a user
 * @access Private
 */
router.get(
  '/cash-flow',
  authenticate,
  transactionAnalysisController.getCashFlow
);

module.exports = router; 