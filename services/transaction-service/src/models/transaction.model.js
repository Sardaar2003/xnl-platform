const mongoose = require('mongoose');

/**
 * Transaction Schema
 */
const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      index: true
    },
    sourceAccountId: {
      type: String,
      required: [true, 'Source account ID is required'],
      index: true
    },
    destinationAccountId: {
      type: String,
      index: true
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT', 'REFUND', 'FEE'],
      uppercase: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'INR'],
      default: 'USD'
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      uppercase: true
    },
    metadata: {
      type: Map,
      of: String,
      default: {}
    },
    relatedTransactions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    failedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ sourceAccountId: 1, createdAt: -1 });
transactionSchema.index({ destinationAccountId: 1, createdAt: -1 });

/**
 * Generate transaction ID
 */
transactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 1000000);
    this.transactionId = `TXN${timestamp}${randomNum}`;
  }
  
  // Update the updatedAt field on every save
  this.updatedAt = Date.now();
  
  next();
});

/**
 * Update status timestamps
 */
transactionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'COMPLETED' && !this.completedAt) {
      this.completedAt = Date.now();
    } else if (this.status === 'FAILED' && !this.failedAt) {
      this.failedAt = Date.now();
    } else if (this.status === 'CANCELLED' && !this.cancelledAt) {
      this.cancelledAt = Date.now();
    }
  }
  next();
});

/**
 * Transaction model
 */
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 