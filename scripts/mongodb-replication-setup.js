// MongoDB Replication and Sharding Configuration Script

// Step 1: Initialize the replica set
rs.initiate({
  _id: "xnl-replica-set",
  members: [
    { _id: 0, host: "mongodb-primary:27017", priority: 2 },
    { _id: 1, host: "mongodb-secondary-1:27017", priority: 1 },
    { _id: 2, host: "mongodb-secondary-2:27017", priority: 1 },
    { _id: 3, host: "mongodb-arbiter:27017", arbiterOnly: true }
  ]
});

// Step 2: Enable sharding on the database
sh.enableSharding("xnl_fintech");

// Step 3: Create sharded collections
// Users collection - shard by userId
db.adminCommand({
  shardCollection: "xnl_fintech.users",
  key: { userId: "hashed" }
});

// Accounts collection - shard by accountId
db.adminCommand({
  shardCollection: "xnl_fintech.accounts",
  key: { accountId: "hashed" }
});

// Transactions collection - shard by transactionId
db.adminCommand({
  shardCollection: "xnl_fintech.transactions",
  key: { transactionId: "hashed" }
});

// Step 4: Create indexes for common queries
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.accounts.createIndex({ "userId": 1 });
db.accounts.createIndex({ "accountType": 1 });
db.transactions.createIndex({ "accountId": 1 });
db.transactions.createIndex({ "createdAt": 1 });
db.transactions.createIndex({ "status": 1 });

// Step 5: Configure read preference
db.getMongo().setReadPref("secondaryPreferred");

print("MongoDB replication and sharding configuration completed successfully!"); 