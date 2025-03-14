# XNL Account Service

This service manages user accounts within the XNL Fintech Platform.

## Features

- Create different types of accounts (SAVINGS, CHECKING, INVESTMENT, CREDIT)
- Retrieve account information
- Update account details
- Close accounts

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3002
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/xnl-account-service
   LOG_LEVEL=info
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=1d
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

### Create Account
- **URL**: `/api/accounts`
- **Method**: `POST`
- **Auth required**: Yes
- **Body**:
  ```json
  {
    "userId": "user123",
    "accountType": "SAVINGS",
    "name": "My Savings Account",
    "currency": "USD",
    "description": "Personal savings account"
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "status": "success",
    "data": {
      "_id": "account123",
      "userId": "user123",
      "accountType": "SAVINGS",
      "name": "My Savings Account",
      "currency": "USD",
      "description": "Personal savings account",
      "balance": 0,
      "status": "ACTIVE",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-01T12:00:00.000Z"
    }
  }
  ```

### Get User Accounts
- **URL**: `/api/accounts/user/:userId`
- **Method**: `GET`
- **Auth required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "results": 2,
    "data": [
      {
        "_id": "account123",
        "userId": "user123",
        "accountType": "SAVINGS",
        "name": "My Savings Account",
        "currency": "USD",
        "description": "Personal savings account",
        "balance": 0,
        "status": "ACTIVE",
        "createdAt": "2023-06-01T12:00:00.000Z",
        "updatedAt": "2023-06-01T12:00:00.000Z"
      },
      {
        "_id": "account456",
        "userId": "user123",
        "accountType": "CHECKING",
        "name": "My Checking Account",
        "currency": "USD",
        "description": "Personal checking account",
        "balance": 100,
        "status": "ACTIVE",
        "createdAt": "2023-06-01T12:00:00.000Z",
        "updatedAt": "2023-06-01T12:00:00.000Z"
      }
    ]
  }
  ```

### Get Account by ID
- **URL**: `/api/accounts/:id`
- **Method**: `GET`
- **Auth required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "_id": "account123",
      "userId": "user123",
      "accountType": "SAVINGS",
      "name": "My Savings Account",
      "currency": "USD",
      "description": "Personal savings account",
      "balance": 0,
      "status": "ACTIVE",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-01T12:00:00.000Z"
    }
  }
  ```

### Update Account
- **URL**: `/api/accounts/:id`
- **Method**: `PATCH`
- **Auth required**: Yes
- **Body**:
  ```json
  {
    "name": "Updated Account Name",
    "description": "Updated account description"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "_id": "account123",
      "userId": "user123",
      "accountType": "SAVINGS",
      "name": "Updated Account Name",
      "currency": "USD",
      "description": "Updated account description",
      "balance": 0,
      "status": "ACTIVE",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-02T12:00:00.000Z"
    }
  }
  ```

### Close Account
- **URL**: `/api/accounts/:id`
- **Method**: `DELETE`
- **Auth required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "_id": "account123",
      "userId": "user123",
      "accountType": "SAVINGS",
      "name": "My Savings Account",
      "currency": "USD",
      "description": "Personal savings account",
      "balance": 0,
      "status": "CLOSED",
      "closedAt": "2023-06-02T12:00:00.000Z",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-02T12:00:00.000Z"
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

## Event Publishing

The Account Service publishes events to RabbitMQ for the following actions:

### Account Created
- **Exchange**: `account.exchange`
- **Routing Key**: `account.created`
- **Payload**:
  ```json
  {
    "event": "account.created",
    "data": {
      "_id": "account123",
      "userId": "user123",
      "accountType": "SAVINGS",
      "name": "My Savings Account",
      "currency": "USD",
      "description": "Personal savings account",
      "balance": 0,
      "status": "ACTIVE",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-01T12:00:00.000Z"
    }
  }
  ```

### Account Updated
- **Exchange**: `account.exchange`
- **Routing Key**: `account.updated`
- **Payload**:
  ```json
  {
    "event": "account.updated",
    "data": {
      "_id": "account123",
      "userId": "user123",
      "accountType": "SAVINGS",
      "name": "Updated Account Name",
      "currency": "USD",
      "description": "Updated account description",
      "balance": 0,
      "status": "ACTIVE",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-02T12:00:00.000Z"
    }
  }
  ```

### Account Closed
- **Exchange**: `account.exchange`
- **Routing Key**: `account.closed`
- **Payload**:
  ```json
  {
    "event": "account.closed",
    "data": {
      "_id": "account123",
      "userId": "user123",
      "accountType": "SAVINGS",
      "name": "My Savings Account",
      "currency": "USD",
      "description": "Personal savings account",
      "balance": 0,
      "status": "CLOSED",
      "closedAt": "2023-06-02T12:00:00.000Z",
      "createdAt": "2023-06-01T12:00:00.000Z",
      "updatedAt": "2023-06-02T12:00:00.000Z"
    }
  }
  ```

### Account Balance Updated
- **Exchange**: `account.exchange`
- **Routing Key**: `account.balance.updated`
- **Payload**:
  ```json
  {
    "event": "account.balance.updated",
    "data": {
      "accountId": "account123",
      "userId": "user123",
      "operation": "CREDIT", // or "DEBIT"
      "amount": 100.50,
      "balance": 500.75,
      "currency": "USD",
      "description": "Deposit from ATM"
    }
  }
  ```

### Account Low Balance
- **Exchange**: `account.exchange`
- **Routing Key**: `account.low_balance`
- **Payload**:
  ```json
  {
    "event": "account.low_balance",
    "data": {
      "accountId": "account123",
      "userId": "user123",
      "balance": 75.25,
      "currency": "USD",
      "threshold": 100
    }
  }
  ```

## Event Consumption

The Account Service consumes events from other services to maintain data consistency and react to system-wide changes:

### Transaction Events
- **Transaction Completed**: Updates account status or metadata if needed
- **Transaction Failed**: Handles any necessary account adjustments
- **Transaction Cancelled**: Updates account status if needed

### User Events
- **User Created**: Optionally creates default accounts for new users
- **User Deleted**: Closes all accounts for the deleted user

## RabbitMQ Integration

The Account Service uses RabbitMQ for event-driven communication with other services. Events are published when accounts are created, updated, closed, or when balance changes occur, allowing other services to react accordingly.

### Setup Requirements
- RabbitMQ server running (default: localhost:5672)
- Connection string configured in `.env` file

### Exchanges and Queues
- **Exchange**: `account.exchange` (type: topic)
- **Queues**: 
  - `account.queue`: For account-specific events
  - `transaction.service.queue`: For events consumed by the Transaction Service
  - `notification.service.queue`: For events consumed by the Notification Service 