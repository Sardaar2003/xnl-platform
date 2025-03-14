// Data Migration and Seeding Script
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('Failed to connect to MongoDB', err);
  process.exit(1);
});

// Define schemas
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'customer', 'financial_advisor'], default: 'customer' },
  kycVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const accountSchema = new mongoose.Schema({
  accountId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  accountType: { type: String, enum: ['checking', 'savings', 'investment'], required: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  accountId: { type: String, required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'investment'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  description: { type: String },
  metadata: { type: Object },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Account = mongoose.model('Account', accountSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// Seed admin user
async function seedAdminUser() {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const adminUser = new User({
      userId: uuidv4(),
      username: 'admin',
      email: 'admin@xnlfintech.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      kycVerified: true
    });

    await adminUser.save();
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

// Seed test users
async function seedTestUsers() {
  try {
    const existingUsers = await User.countDocuments({ role: 'customer' });
    if (existingUsers >= 5) {
      console.log('Test users already exist');
      return;
    }

    const hashedPassword = await bcrypt.hash('Test@123', 10);
    const testUsers = [];

    for (let i = 1; i <= 5; i++) {
      testUsers.push({
        userId: uuidv4(),
        username: `testuser${i}`,
        email: `testuser${i}@example.com`,
        password: hashedPassword,
        firstName: `Test${i}`,
        lastName: 'User',
        role: 'customer',
        kycVerified: i <= 3 // First 3 users are KYC verified
      });
    }

    await User.insertMany(testUsers);
    console.log('Test users created successfully');
    return testUsers;
  } catch (error) {
    console.error('Error seeding test users:', error);
    return [];
  }
}

// Seed test accounts
async function seedTestAccounts(testUsers) {
  try {
    const existingAccounts = await Account.countDocuments();
    if (existingAccounts >= 10) {
      console.log('Test accounts already exist');
      return;
    }

    const accountTypes = ['checking', 'savings', 'investment'];
    const currencies = ['USD', 'EUR', 'GBP'];
    const testAccounts = [];

    for (const user of testUsers) {
      // Create 2 accounts for each user
      for (let i = 0; i < 2; i++) {
        testAccounts.push({
          accountId: uuidv4(),
          userId: user.userId,
          accountType: accountTypes[Math.floor(Math.random() * accountTypes.length)],
          balance: Math.floor(Math.random() * 10000),
          currency: currencies[Math.floor(Math.random() * currencies.length)],
          isActive: true
        });
      }
    }

    await Account.insertMany(testAccounts);
    console.log('Test accounts created successfully');
    return testAccounts;
  } catch (error) {
    console.error('Error seeding test accounts:', error);
    return [];
  }
}

// Seed test transactions
async function seedTestTransactions(testAccounts) {
  try {
    const existingTransactions = await Transaction.countDocuments();
    if (existingTransactions >= 50) {
      console.log('Test transactions already exist');
      return;
    }

    const transactionTypes = ['deposit', 'withdrawal', 'transfer', 'investment'];
    const statuses = ['completed', 'pending', 'failed'];
    const testTransactions = [];

    for (const account of testAccounts) {
      // Create 5 transactions for each account
      for (let i = 0; i < 5; i++) {
        const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const amount = Math.floor(Math.random() * 1000) + 1;
        
        testTransactions.push({
          transactionId: uuidv4(),
          accountId: account.accountId,
          type,
          amount,
          currency: account.currency,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          description: `Test ${type} transaction`,
          metadata: {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            deviceId: `device-${Math.floor(Math.random() * 1000)}`
          },
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date in the last 30 days
        });
      }
    }

    await Transaction.insertMany(testTransactions);
    console.log('Test transactions created successfully');
  } catch (error) {
    console.error('Error seeding test transactions:', error);
  }
}

// Run migration and seeding
async function runMigration() {
  try {
    console.log('Starting data migration and seeding...');
    
    await seedAdminUser();
    const testUsers = await seedTestUsers();
    const testAccounts = await seedTestAccounts(testUsers);
    await seedTestTransactions(testAccounts);
    
    console.log('Data migration and seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

runMigration(); 