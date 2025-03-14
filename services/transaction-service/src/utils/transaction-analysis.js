const Transaction = require('../models/transaction.model');
const logger = require('./logger');

// Transaction categories
const CATEGORIES = {
  INCOME: {
    SALARY: 'Salary',
    INTEREST: 'Interest',
    DIVIDEND: 'Dividend',
    GIFT: 'Gift',
    REFUND: 'Refund',
    OTHER_INCOME: 'Other Income'
  },
  EXPENSE: {
    HOUSING: 'Housing',
    TRANSPORTATION: 'Transportation',
    FOOD: 'Food',
    UTILITIES: 'Utilities',
    INSURANCE: 'Insurance',
    HEALTHCARE: 'Healthcare',
    ENTERTAINMENT: 'Entertainment',
    SHOPPING: 'Shopping',
    PERSONAL_CARE: 'Personal Care',
    EDUCATION: 'Education',
    TRAVEL: 'Travel',
    DEBT_PAYMENT: 'Debt Payment',
    INVESTMENT: 'Investment',
    CHARITY: 'Charity',
    OTHER_EXPENSE: 'Other Expense'
  }
};

// Keywords for automatic categorization
const CATEGORY_KEYWORDS = {
  [CATEGORIES.INCOME.SALARY]: ['salary', 'payroll', 'wage', 'income', 'paycheck'],
  [CATEGORIES.INCOME.INTEREST]: ['interest', 'savings interest', 'deposit interest'],
  [CATEGORIES.INCOME.DIVIDEND]: ['dividend', 'stock dividend', 'share dividend'],
  [CATEGORIES.INCOME.GIFT]: ['gift', 'present', 'donation'],
  [CATEGORIES.INCOME.REFUND]: ['refund', 'reimbursement', 'cashback', 'return'],
  
  [CATEGORIES.EXPENSE.HOUSING]: ['rent', 'mortgage', 'property tax', 'home', 'apartment', 'house', 'housing'],
  [CATEGORIES.EXPENSE.TRANSPORTATION]: ['gas', 'fuel', 'car', 'auto', 'vehicle', 'transport', 'uber', 'lyft', 'taxi', 'bus', 'train', 'subway', 'metro'],
  [CATEGORIES.EXPENSE.FOOD]: ['grocery', 'restaurant', 'food', 'meal', 'dinner', 'lunch', 'breakfast', 'cafe', 'coffee', 'supermarket'],
  [CATEGORIES.EXPENSE.UTILITIES]: ['electric', 'water', 'gas', 'utility', 'internet', 'phone', 'mobile', 'cable', 'tv', 'streaming'],
  [CATEGORIES.EXPENSE.INSURANCE]: ['insurance', 'policy', 'coverage', 'premium'],
  [CATEGORIES.EXPENSE.HEALTHCARE]: ['doctor', 'hospital', 'medical', 'health', 'dental', 'pharmacy', 'prescription', 'medicine'],
  [CATEGORIES.EXPENSE.ENTERTAINMENT]: ['movie', 'theater', 'concert', 'show', 'game', 'entertainment', 'netflix', 'spotify', 'subscription'],
  [CATEGORIES.EXPENSE.SHOPPING]: ['amazon', 'walmart', 'target', 'store', 'mall', 'shop', 'purchase', 'buy'],
  [CATEGORIES.EXPENSE.PERSONAL_CARE]: ['salon', 'spa', 'haircut', 'beauty', 'cosmetic', 'personal care'],
  [CATEGORIES.EXPENSE.EDUCATION]: ['tuition', 'school', 'college', 'university', 'course', 'education', 'book', 'textbook'],
  [CATEGORIES.EXPENSE.TRAVEL]: ['hotel', 'flight', 'airline', 'vacation', 'travel', 'trip', 'airbnb', 'booking'],
  [CATEGORIES.EXPENSE.DEBT_PAYMENT]: ['loan', 'debt', 'credit card', 'payment', 'installment'],
  [CATEGORIES.EXPENSE.INVESTMENT]: ['investment', 'stock', 'bond', 'mutual fund', 'etf', 'crypto', 'bitcoin'],
  [CATEGORIES.EXPENSE.CHARITY]: ['charity', 'donation', 'nonprofit', 'ngo']
};

/**
 * Categorize a transaction based on description and metadata
 * @param {Object} transaction - Transaction object
 * @returns {string} - Category
 */
const categorizeTransaction = (transaction) => {
  const { type, description, metadata } = transaction;
  
  // If category is already set in metadata, use it
  if (metadata && metadata.category) {
    return metadata.category;
  }
  
  // Determine if it's income or expense based on transaction type
  const transactionType = ['deposit', 'refund'].includes(type) ? 'INCOME' : 'EXPENSE';
  
  // Convert description to lowercase for case-insensitive matching
  const desc = description ? description.toLowerCase() : '';
  
  // Check for keyword matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  // Default categories if no match found
  return transactionType === 'INCOME' ? CATEGORIES.INCOME.OTHER_INCOME : CATEGORIES.EXPENSE.OTHER_EXPENSE;
};

/**
 * Get spending by category for a user
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID (optional)
 * @param {Object} dateRange - Date range object with startDate and endDate
 * @returns {Promise<Object>} - Spending by category
 */
const getSpendingByCategory = async (userId, accountId, dateRange) => {
  try {
    const query = {
      userId,
      type: { $in: ['withdrawal', 'transfer', 'payment'] },
      status: 'completed',
      createdAt: {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      }
    };
    
    if (accountId) {
      query.accountId = accountId;
    }
    
    const transactions = await Transaction.find(query);
    
    // Group transactions by category
    const spendingByCategory = {};
    
    for (const transaction of transactions) {
      const category = transaction.metadata?.category || categorizeTransaction(transaction);
      
      if (!spendingByCategory[category]) {
        spendingByCategory[category] = 0;
      }
      
      spendingByCategory[category] += transaction.amount;
    }
    
    return spendingByCategory;
  } catch (error) {
    logger.error('Error getting spending by category:', error);
    throw error;
  }
};

/**
 * Get income by category for a user
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID (optional)
 * @param {Object} dateRange - Date range object with startDate and endDate
 * @returns {Promise<Object>} - Income by category
 */
const getIncomeByCategory = async (userId, accountId, dateRange) => {
  try {
    const query = {
      userId,
      type: { $in: ['deposit', 'refund'] },
      status: 'completed',
      createdAt: {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      }
    };
    
    if (accountId) {
      query.accountId = accountId;
    }
    
    const transactions = await Transaction.find(query);
    
    // Group transactions by category
    const incomeByCategory = {};
    
    for (const transaction of transactions) {
      const category = transaction.metadata?.category || categorizeTransaction(transaction);
      
      if (!incomeByCategory[category]) {
        incomeByCategory[category] = 0;
      }
      
      incomeByCategory[category] += transaction.amount;
    }
    
    return incomeByCategory;
  } catch (error) {
    logger.error('Error getting income by category:', error);
    throw error;
  }
};

/**
 * Get monthly spending trend for a user
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID (optional)
 * @param {number} months - Number of months to include
 * @returns {Promise<Array>} - Monthly spending trend
 */
const getMonthlySpendingTrend = async (userId, accountId, months = 6) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    
    const query = {
      userId,
      type: { $in: ['withdrawal', 'transfer', 'payment'] },
      status: 'completed',
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (accountId) {
      query.accountId = accountId;
    }
    
    const transactions = await Transaction.find(query);
    
    // Group transactions by month
    const monthlySpending = {};
    
    for (let i = 0; i < months; i++) {
      const month = new Date(endDate);
      month.setMonth(month.getMonth() - i);
      const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      monthlySpending[monthKey] = 0;
    }
    
    for (const transaction of transactions) {
      const date = new Date(transaction.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlySpending[monthKey] !== undefined) {
        monthlySpending[monthKey] += transaction.amount;
      }
    }
    
    // Convert to array and sort by month
    const trend = Object.entries(monthlySpending).map(([month, amount]) => ({
      month,
      amount
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    return trend;
  } catch (error) {
    logger.error('Error getting monthly spending trend:', error);
    throw error;
  }
};

/**
 * Get spending insights for a user
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID (optional)
 * @returns {Promise<Object>} - Spending insights
 */
const getSpendingInsights = async (userId, accountId) => {
  try {
    // Get current month spending
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const currentMonthSpending = await getSpendingByCategory(userId, accountId, {
      startDate: currentMonthStart,
      endDate: new Date()
    });
    
    // Get previous month spending
    const previousMonthStart = new Date(currentMonthStart);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    
    const previousMonthEnd = new Date(currentMonthStart);
    previousMonthEnd.setDate(previousMonthEnd.getDate() - 1);
    
    const previousMonthSpending = await getSpendingByCategory(userId, accountId, {
      startDate: previousMonthStart,
      endDate: previousMonthEnd
    });
    
    // Calculate total spending
    const currentMonthTotal = Object.values(currentMonthSpending).reduce((sum, amount) => sum + amount, 0);
    const previousMonthTotal = Object.values(previousMonthSpending).reduce((sum, amount) => sum + amount, 0);
    
    // Calculate month-over-month change
    const monthOverMonthChange = previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : 0;
    
    // Get top spending categories
    const topCategories = Object.entries(currentMonthSpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / currentMonthTotal) * 100
      }));
    
    // Get monthly trend
    const monthlyTrend = await getMonthlySpendingTrend(userId, accountId, 6);
    
    return {
      currentMonth: {
        total: currentMonthTotal,
        byCategory: currentMonthSpending
      },
      previousMonth: {
        total: previousMonthTotal,
        byCategory: previousMonthSpending
      },
      monthOverMonthChange,
      topCategories,
      monthlyTrend
    };
  } catch (error) {
    logger.error('Error getting spending insights:', error);
    throw error;
  }
};

module.exports = {
  CATEGORIES,
  categorizeTransaction,
  getSpendingByCategory,
  getIncomeByCategory,
  getMonthlySpendingTrend,
  getSpendingInsights
}; 