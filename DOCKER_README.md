# Docker Configuration for XNL Fintech Platform

## Working Directory

The project is configured to run in Docker containers with the working directory set to `/XNL_SOLUTIONS_PROJECT`. This is important to note when working with Docker volumes and paths inside the containers.

## Docker Commands

```bash
# Start all services in Docker
npm run docker:up

# Stop all services
npm run docker:down

# View logs from all services
npm run docker:logs
```

## Service Ports

- API Gateway: 3000
- User Service: 3001
- Account Service: 3002
- Transaction Service: 3003
- Notification Service: 3004
- MongoDB: 27017
- RabbitMQ: 5672 (AMQP), 15672 (Management UI)

## Health Check

You can check the health of all services using the health check script:

```bash
npm run health-check
```

This will verify that all services are running properly and display their uptime.

## Docker Compose Configuration

The `docker-compose.yml` file defines all the services and their configurations. Each service is configured with:

- The correct working directory (`/XNL_SOLUTIONS_PROJECT`)
- Volume mappings for code changes
- Environment variables from the `.env` file
- Port mappings for accessing the services

## Dockerfiles

Each service has its own Dockerfile that:

1. Uses Node.js 16 Alpine as the base image
2. Sets the working directory to `/XNL_SOLUTIONS_PROJECT` or a subdirectory
3. Installs dependencies
4. Copies the application code
5. Exposes the service port
6. Starts the service

## Troubleshooting

If you encounter issues with Docker:

1. Check if all containers are running:

   ```bash
   docker ps
   ```

2. Check container logs:

   ```bash
   docker logs <container_name>
   ```

3. Ensure the `.env` file has the correct configuration

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Rebuild the containers if needed:
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```
