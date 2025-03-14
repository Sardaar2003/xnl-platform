# Notification Service

The Notification Service is responsible for managing and delivering notifications to users across the XNL Fintech Platform.

## Features

- Create, retrieve, and manage notifications
- Template-based notification content
- Support for multiple notification types (IN_APP, EMAIL, SMS, PUSH)
- Message queue integration for event-based notifications
- Notification status tracking (UNREAD, READ, ARCHIVED)

## Architecture

The Notification Service follows a microservice architecture and communicates with other services through RabbitMQ message queues. It listens for events from other services and creates notifications based on those events.

## API Endpoints

### Notifications

- `POST /api/notifications` - Create a new notification
- `GET /api/notifications/user/:userId` - Get all notifications for a user
- `GET /api/notifications/:id` - Get notification by ID
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/:id/archive` - Mark notification as archived
- `PATCH /api/notifications/user/:userId/read` - Mark all notifications as read for a user

### Templates

- `POST /api/templates` - Create a new template
- `GET /api/templates` - Get all templates
- `GET /api/templates/:id` - Get template by ID
- `GET /api/templates/name/:name` - Get template by name
- `PATCH /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/render/:name` - Render template with variables

## Event Handling

The service listens for the following events:

- User events: user.created, user.updated, user.password_reset, user.login
- Transaction events: transaction.created, transaction.updated, transaction.failed
- Account events: account.created, account.updated, account.closed, account.low_balance
- Notification events: notification.send, notification.bulk_send

## Setup and Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables (see `.env.example`)

3. Start the service:
   ```
   npm start
   ```

4. For development:
   ```
   npm run dev
   ```

## Dependencies

- Express.js - Web framework
- Mongoose - MongoDB ODM
- RabbitMQ (amqplib) - Message queue
- Winston - Logging
- Express Validator - Request validation 