FROM node:18

WORKDIR /XNL_SOLUTIONS_PROJECT/services/notification-service

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the port the app runs on
EXPOSE 3004

# Command to run the application
CMD ["node", "src/index.js"] 