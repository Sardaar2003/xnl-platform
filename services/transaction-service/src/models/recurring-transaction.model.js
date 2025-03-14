const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema(
  {
    recurringTransactionId: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    accountId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer', 'investment'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    description: {
      type: String
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'],
      required: true
    },
    dayOfWeek: {
      type: Number, // 0-6 (Sunday-Saturday)
      validate: {
        validator: function(v) {
          return this.frequency === 'weekly' || this.frequency === 'biweekly' ? v >= 0 && v <= 6 : true;
        },
        message: 'Day of week must be between 0 and 6 for weekly or biweekly frequency'
      }
    },
    dayOfMonth: {
      type: Number, // 1-31
      validate: {
        validator: function(v) {
          return this.frequency === 'monthly' || this.frequency === 'quarterly' || this.frequency === 'annually' ? v >= 1 && v <= 31 : true;
        },
        message: 'Day of month must be between 1 and 31 for monthly, quarterly, or annually frequency'
      }
    },
    month: {
      type: Number, // 0-11 (January-December)
      validate: {
        validator: function(v) {
          return this.frequency === 'annually' ? v >= 0 && v <= 11 : true;
        },
        message: 'Month must be between 0 and 11 for annually frequency'
      }
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    nextExecutionDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active'
    },
    metadata: {
      type: Object
    },
    destinationAccountId: {
      type: String,
      required: function() {
        return this.type === 'transfer';
      }
    },
    lastExecutedAt: {
      type: Date
    },
    executionCount: {
      type: Number,
      default: 0
    },
    maxExecutions: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

// Calculate next execution date
recurringTransactionSchema.methods.calculateNextExecutionDate = function() {
  const now = new Date();
  let nextDate = new Date(this.nextExecutionDate);
  
  // If next execution date is in the past, calculate the next one
  if (nextDate < now) {
    nextDate = new Date(now);
    
    switch (this.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
        
      case 'weekly':
        // Find the next occurrence of the day of week
        const daysUntilNextDay = (this.dayOfWeek - nextDate.getDay() + 7) % 7;
        nextDate.setDate(nextDate.getDate() + (daysUntilNextDay === 0 ? 7 : daysUntilNextDay));
        break;
        
      case 'biweekly':
        // Find the next occurrence of the day of week
        const daysUntilNextBiweekly = (this.dayOfWeek - nextDate.getDay() + 7) % 7;
        nextDate.setDate(nextDate.getDate() + (daysUntilNextBiweekly === 0 ? 14 : daysUntilNextBiweekly));
        break;
        
      case 'monthly':
        // Set to the specified day of the month
        nextDate.setDate(1); // Go to first day of current month
        nextDate.setMonth(nextDate.getMonth() + 1); // Go to first day of next month
        
        // Adjust for days that don't exist in some months
        const maxDaysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(this.dayOfMonth, maxDaysInMonth));
        break;
        
      case 'quarterly':
        // Set to the specified day of the month, 3 months from now
        nextDate.setDate(1); // Go to first day of current month
        nextDate.setMonth(nextDate.getMonth() + 3); // Go to first day 3 months ahead
        
        // Adjust for days that don't exist in some months
        const maxDaysInQuarter = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(this.dayOfMonth, maxDaysInQuarter));
        break;
        
      case 'annually':
        // Set to the specified month and day
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        nextDate.setMonth(this.month);
        
        // Adjust for days that don't exist in some months
        const maxDaysInYear = new Date(nextDate.getFullYear(), this.month + 1, 0).getDate();
        nextDate.setDate(Math.min(this.dayOfMonth, maxDaysInYear));
        break;
    }
  }
  
  return nextDate;
};

// Update next execution date after a transaction is executed
recurringTransactionSchema.methods.updateAfterExecution = function() {
  this.executionCount += 1;
  this.lastExecutedAt = new Date();
  
  // Calculate next execution date
  this.nextExecutionDate = this.calculateNextExecutionDate();
  
  // Check if max executions reached
  if (this.maxExecutions && this.executionCount >= this.maxExecutions) {
    this.status = 'completed';
  }
  
  // Check if end date reached
  if (this.endDate && this.nextExecutionDate > this.endDate) {
    this.status = 'completed';
  }
  
  return this.save();
};

const RecurringTransaction = mongoose.model('RecurringTransaction', recurringTransactionSchema);

module.exports = RecurringTransaction; 