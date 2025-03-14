const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer', 'payment', 'refund', 'fee'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
    relatedTransactions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Generate transaction ID
transactionSchema.pre('save', async function (next) {
  if (!this.isNew) {
    return next();
  }
  
  // Generate a random transaction ID
  const timestamp = new Date().getTime();
  const randomNum = Math.floor(Math.random() * 1000000);
  this.transactionId = `TXN${timestamp}${randomNum}`;
  
  next();
});

// Create Transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 