const Transaction = require('../models/transaction.model');
const { 
  getSpendingByCategory, 
  getIncomeByCategory, 
  getMonthlySpendingTrend,
  getSpendingInsights
} = require('../utils/transaction-analysis');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Get transaction summary for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getTransactionSummary = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { period = 'month', startDate, endDate } = req.query;
    
    // Validate period
    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid period. Must be one of: day, week, month, year'
      });
    }
    
    // Get transactions for the user
    const transactions = await Transaction.find({ 
      userId,
      createdAt: { 
        $gte: startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1)),
        $lte: endDate ? new Date(endDate) : new Date()
      }
    });
    
    // Group transactions by period
    const groupedTransactions = groupTransactionsByPeriod(transactions, period);
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'deposit' || (t.type === 'transfer' && t.toAccountId))
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpense = transactions
      .filter(t => t.type === 'withdrawal' || (t.type === 'transfer' && t.fromAccountId))
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Get top categories
    const categories = {};
    transactions.forEach(t => {
      if (t.category) {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      }
    });
    
    const topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));
    
    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalIncome,
          totalExpense,
          netChange: totalIncome - totalExpense
        },
        transactions: groupedTransactions,
        topCategories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get spending insights for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSpendingInsights = async (req, res) => {
  try {
    const { userId } = req.user;
    const { months = 6 } = req.query;
    
    const insights = await getSpendingInsights(userId, parseInt(months));
    
    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Error getting spending insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spending insights',
      error: error.message
    });
  }
};

/**
 * Get net worth history for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getNetWorthHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const { period = 'month', months = 6 } = req.query;
    
    // Calculate end date (today)
    const endDate = new Date();
    
    // Calculate start date based on period and months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    // Get all transactions in the date range
    const transactions = await Transaction.find({
      userId,
      transactionDate: { $gte: startDate, $lte: endDate }
    }).sort({ transactionDate: 1 });
    
    // Group transactions by period
    const groupedData = groupTransactionsByPeriod(transactions, period);
    
    // Calculate cumulative net worth
    let cumulativeNetWorth = 0; // Starting net worth (ideally should be fetched from account service)
    
    const netWorthHistory = groupedData.map(group => {
      // Calculate net change for the period
      const netChange = group.transactions.reduce((sum, transaction) => {
        // Add income, subtract expenses
        return sum + (transaction.amount * (transaction.type === 'income' ? 1 : -1));
      }, 0);
      
      // Update cumulative net worth
      cumulativeNetWorth += netChange;
      
      return {
        period: group.period,
        netWorth: cumulativeNetWorth,
        netChange
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        history: netWorthHistory,
        startDate,
        endDate,
        period
      }
    });
  } catch (error) {
    logger.error('Error getting net worth history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get net worth history',
      error: error.message
    });
  }
};

/**
 * Get cash flow for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCashFlow = async (req, res) => {
  try {
    const { userId } = req.user;
    const { period = 'month', months = 6 } = req.query;
    
    // Calculate end date (today)
    const endDate = new Date();
    
    // Calculate start date based on period and months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    // Get all transactions in the date range
    const transactions = await Transaction.find({
      userId,
      transactionDate: { $gte: startDate, $lte: endDate }
    }).sort({ transactionDate: 1 });
    
    // Group transactions by period
    const groupedData = groupTransactionsByPeriod(transactions, period);
    
    // Calculate income and expenses for each period
    const cashFlowData = groupedData.map(group => {
      // Calculate income
      const income = group.transactions
        .filter(transaction => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      
      // Calculate expenses
      const expenses = group.transactions
        .filter(transaction => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      
      return {
        period: group.period,
        income,
        expenses,
        netCashFlow: income - expenses
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        cashFlow: cashFlowData,
        startDate,
        endDate,
        period
      }
    });
  } catch (error) {
    logger.error('Error getting cash flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cash flow',
      error: error.message
    });
  }
};

/**
 * Calculate date range based on period
 * @param {string} period - Period (day, week, month, year)
 * @param {string} startDate - Start date (optional)
 * @param {string} endDate - End date (optional)
 * @returns {Object} Date range object
 */
function calculateDateRange(period, startDate, endDate) {
  const end = endDate ? new Date(endDate) : new Date();
  let start;
  
  if (startDate) {
    start = new Date(startDate);
  } else {
    start = new Date();
    
    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }
  }
  
  return {
    startDate: start,
    endDate: end
  };
}

/**
 * Group transactions by period
 * @param {Array} transactions - Array of transactions
 * @param {string} period - Period (day, week, month, year)
 * @returns {Array} Grouped transactions
 */
function groupTransactionsByPeriod(transactions, period) {
  const groupedData = [];
  const periodMap = new Map();
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.transactionDate);
    let periodKey;
    
    switch (period) {
      case 'day':
        periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        // Get the week number
        const weekNumber = getWeekNumber(date);
        periodKey = `${date.getFullYear()}-W${weekNumber}`;
        break;
      case 'year':
        periodKey = date.getFullYear().toString();
        break;
      case 'month':
      default:
        // Format as YYYY-MM
        periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        period: periodKey,
        transactions: []
      });
    }
    
    periodMap.get(periodKey).transactions.push(transaction);
  });
  
  // Convert map to array and sort by period
  return Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get week number for a date
 * @param {Date} date - Date object
 * @returns {number} Week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
  getTransactionSummary,
  getSpendingInsights,
  getNetWorthHistory,
  getCashFlow
}; 