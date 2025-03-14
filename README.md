﻿# XNL Fintech Platform

A microservices-based fintech platform with user management, account services, transaction processing, and notifications.

## Architecture

The platform is built using a microservices architecture with the following components:

- **User Service**: Handles user registration, authentication, and profile management
- **Account Service**: Manages financial accounts and balances
- **Transaction Service**: Processes financial transactions
- **Notification Service**: Sends notifications to users
- **API Gateway**: Routes requests to appropriate services

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Message Brokering**: RabbitMQ
- **Frontend**: React.js with Material-UI
- **Authentication**: JSON Web Tokens (JWT)

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- RabbitMQ

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/xnl-fintech-platform.git
   cd xnl-fintech-platform
   ```

2. Install dependencies for all services:
   ```
   npm run install-all
   ```

3. Set up environment variables:
   Create a `.env` file in each service directory with the required variables.

4. Start the services:
   ```
   npm run start-all
   ```

## Services

### User Service (Port 3001)

Handles user management, authentication, and authorization.

**Endpoints:**
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- POST /api/auth/logout - Logout user
- GET /api/users/me - Get current user profile

### Account Service (Port 3002)

Manages user accounts and balances.

**Endpoints:**
- GET /api/accounts - Get user accounts
- POST /api/accounts - Create a new account
- GET /api/accounts/:id - Get account details

### Transaction Service (Port 3003)

Processes financial transactions.

**Endpoints:**
- POST /api/transactions - Create a new transaction
- GET /api/transactions - Get user transactions
- GET /api/transactions/:id - Get transaction details

### Notification Service (Port 3004)

Sends notifications to users.

**Endpoints:**
- GET /api/notifications - Get user notifications
- PATCH /api/notifications/:id/read - Mark notification as read

### API Gateway (Port 3006)

Routes requests to the appropriate service.

\
