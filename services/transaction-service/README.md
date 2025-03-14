# XNL Transaction Service

This service manages financial transactions within the XNL Fintech Platform.

## Features

- Create different types of transactions (DEPOSIT, WITHDRAWAL, TRANSFER, PAYMENT, REFUND, FEE)
- Retrieve transaction information with filtering and pagination
- Cancel pending transactions
- Process transactions asynchronously
- RabbitMQ integration for event-driven communication with other services

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3003
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/xnl-transaction-service
   LOG_LEVEL=info
   ACCOUNT_SERVICE_URL=http://localhost:3002
   RABBITMQ_URL=amqp://localhost:5672
   ```

3. Start the service:
   ```
   npm start
   ```

   For development with auto-reload:
   ```
   npm run dev
   ```

## API Endpoints

### Create Transaction
- **URL**: `/api/transactions`
- **Method**: `POST`
- **Auth required**: Yes
- **Body**:
  ```json
  {
    "sourceAccountId": "account123",
    "destinationAccountId": "account456",
    "type": "TRANSFER",
    "amount": 100.50,
    "currency": "USD",
    "description": "Monthly transfer"
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "status": "success",
    "data": {
      "_id": "transaction123",
      "transactionId": "TXN1234567890",
      "sourceAccountId": "account123",
      "destinationAccountId": "account456",
      "type": "TRANSFER",
      "amount": 100.50,
      "currency": "USD",
      "description": "Monthly transfer",
      "status": "PENDING",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-01T12:00:00.000Z"
    }
  }
  ```

### Get Transactions
- **URL**: `/api/transactions`
- **Method**: `GET`
- **Auth required**: Yes
- **Query Parameters**:
  - `accountId` - Filter by account ID (source or destination)
  - `type` - Filter by transaction type
  - `status` - Filter by transaction status
  - `startDate` - Filter by start date (ISO 8601 format)
  - `endDate` - Filter by end date (ISO 8601 format)
  - `page` - Page number (default: 1)
  - `limit` - Number of results per page (default: 10, max: 100)
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "results": 2,
    "total": 10,
    "page": 1,
    "pages": 5,
    "data": [
      {
        "_id": "transaction123",
        "transactionId": "TXN1234567890",
        "sourceAccountId": "account123",
        "destinationAccountId": "account456",
        "type": "TRANSFER",
        "amount": 100.50,
        "currency": "USD",
        "description": "Monthly transfer",
        "status": "COMPLETED",
        "createdAt": "2023-06-01T12:00:00.000Z",
        "updatedAt": "2023-06-01T12:01:00.000Z",
        "completedAt": "2023-06-01T12:01:00.000Z"
      },
      {
        "_id": "transaction456",
        "transactionId": "TXN0987654321",
        "sourceAccountId": "account123",
        "destinationAccountId": null,
        "type": "WITHDRAWAL",
        "amount": 50.25,
        "currency": "USD",
        "description": "ATM withdrawal",
        "status": "COMPLETED",
        "createdAt": "2023-06-02T12:00:00.000Z",
        "updatedAt": "2023-06-02T12:01:00.000Z",
        "completedAt": "2023-06-02T12:01:00.000Z"
      }
    ]
  }
  ```

### Get Transaction by ID
- **URL**: `/api/transactions/:id`
- **Method**: `GET`
- **Auth required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "_id": "transaction123",
      "transactionId": "TXN1234567890",
      "sourceAccountId": "account123",
      "destinationAccountId": "account456",
      "type": "TRANSFER",
      "amount": 100.50,
      "currency": "USD",
      "description": "Monthly transfer",
      "status": "COMPLETED",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-01T12:01:00.000Z",
      "completedAt": "2023-06-01T12:01:00.000Z"
    }
  }
  ```

### Get Transaction by Transaction ID
- **URL**: `/api/transactions/txn/:transactionId`
- **Method**: `GET`
- **Auth required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "_id": "transaction123",
      "transactionId": "TXN1234567890",
      "sourceAccountId": "account123",
      "destinationAccountId": "account456",
      "type": "TRANSFER",
      "amount": 100.50,
      "currency": "USD",
      "description": "Monthly transfer",
      "status": "COMPLETED",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-01T12:01:00.000Z",
      "completedAt": "2023-06-01T12:01:00.000Z"
    }
  }
  ```

### Cancel Transaction
- **URL**: `/api/transactions/:id/cancel`
- **Method**: `PATCH`
- **Auth required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "_id": "transaction123",
      "transactionId": "TXN1234567890",
      "sourceAccountId": "account123",
      "destinationAccountId": "account456",
      "type": "TRANSFER",
      "amount": 100.50,
      "currency": "USD",
      "description": "Monthly transfer",
      "status": "CANCELLED",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-01T12:05:00.000Z",
      "cancelledAt": "2023-06-01T12:05:00.000Z"
    }
  }
  ```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error message"
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Event-Driven Architecture

The Transaction Service uses RabbitMQ for event-driven communication with other services. 

### Published Events

- `transaction.completed` - Published when a transaction is successfully completed
  ```json
  {
    "event": "transaction.completed",
    "data": {
      // Transaction object
    }
  }
  ```

- `transaction.failed` - Published when a transaction fails
  ```json
  {
    "event": "transaction.failed",
    "data": {
      // Transaction object with failure reason
    }
  }
  ```

- `transaction.cancelled` - Published when a transaction is cancelled
  ```json
  {
    "event": "transaction.cancelled",
    "data": {
      // Transaction object
    }
  }
  ```

### Consumed Events

The Transaction Service consumes events from other services to maintain data consistency and react to system-wide changes:

#### Account Events
- `account.created` - When a new account is created
  - Updates internal records and potentially triggers welcome transactions
  
- `account.updated` - When account details are updated
  - Updates any cached account information
  
- `account.closed` - When an account is closed
  - Cancels any pending transactions for the closed account
  
- `account.balance.updated` - When an account's balance changes
  - Potentially processes pending transactions that were waiting for sufficient funds

### RabbitMQ Configuration

- **Exchange**: `transaction.exchange` (type: topic)
- **Queues**: 
  - `transaction.queue`: For transaction-specific events
  - `account.service.queue`: For events consumed by the Account Service
  - `notification.service.queue`: For events consumed by the Notification Service

### Integration with Other Services

- **Account Service**: The Transaction Service communicates with the Account Service to validate accounts and update balances.
- **Notification Service**: Events published by the Transaction Service are consumed by the Notification Service to send notifications to users.

## Transaction Types

- `DEPOSIT` - Add funds to an account
- `WITHDRAWAL` - Remove funds from an account
- `TRANSFER` - Move funds between accounts
- `PAYMENT` - Payment to a merchant or service
- `REFUND` - Refund from a merchant or service
- `FEE` - Service fee or charge

## Transaction Status

- `PENDING` - Transaction is being processed
- `COMPLETED` - Transaction has been successfully processed
- `FAILED` - Transaction processing failed
- `CANCELLED` - Transaction was cancelled 