# Use official Node.js image
FROM node:16-alpine

# Set working directory
WORKDIR /XNL_SOLUTIONS_PROJECT

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Run health check before starting the app
EXPOSE 3000

CMD ["npm", "start"]
