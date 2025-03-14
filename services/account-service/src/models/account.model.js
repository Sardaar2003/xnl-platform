const mongoose = require('mongoose');

/**
 * Account Schema
 */
const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
    },
    accountType: {
      type: String,
      required: [true, 'Account type is required'],
      enum: ['SAVINGS', 'CHECKING', 'INVESTMENT', 'CREDIT'],
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative for this account type']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'INR'],
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'FROZEN', 'CLOSED'],
      default: 'ACTIVE'
    },
    closedAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
accountSchema.index({ userId: 1, accountType: 1 });
accountSchema.index({ status: 1 });

/**
 * Pre-save middleware
 */
accountSchema.pre('save', function(next) {
  // Update the updatedAt field on every save
  this.updatedAt = Date.now();
  next();
});

/**
 * Account model
 */
const Account = mongoose.model('Account', accountSchema);

module.exports = Account; 