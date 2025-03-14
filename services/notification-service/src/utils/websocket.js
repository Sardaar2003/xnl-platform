const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const redis = require('./redis');

let wss;

// Initialize WebSocket server
const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', async (ws, req) => {
    try {
      // Extract token from URL query parameters
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(4001, 'Authentication token is required');
        return;
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { userId } = decoded;
      
      if (!userId) {
        ws.close(4002, 'Invalid authentication token');
        return;
      }
      
      // Store connection in memory with userId
      ws.userId = userId;
      
      // Add connection to Redis for tracking
      await redis.sadd(`websocket:connections:${userId}`, req.headers['x-forwarded-for'] || req.connection.remoteAddress);
      
      console.log(`WebSocket connection established for user ${userId}`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to notification service',
        timestamp: new Date().toISOString()
      }));
      
      // Handle messages from client
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          // Handle ping/pong for keeping connection alive
          if (data.type === 'ping') {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
      
      // Handle connection close
      ws.on('close', async () => {
        try {
          await redis.srem(`websocket:connections:${userId}`, req.headers['x-forwarded-for'] || req.connection.remoteAddress);
          console.log(`WebSocket connection closed for user ${userId}`);
        } catch (error) {
          console.error('Error handling WebSocket close:', error);
        }
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(4003, 'Authentication failed');
    }
  });
  
  console.log('WebSocket server initialized');
  return wss;
};

// Send notification to specific user
const sendNotificationToUser = async (userId, notification) => {
  try {
    if (!wss) {
      console.error('WebSocket server not initialized');
      return false;
    }
    
    let clientCount = 0;
    
    wss.clients.forEach((client) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          data: notification,
          timestamp: new Date().toISOString()
        }));
        clientCount++;
      }
    });
    
    console.log(`Sent notification to ${clientCount} WebSocket clients for user ${userId}`);
    
    // Store notification in Redis for retrieval when user connects
    if (clientCount === 0) {
      await redis.lpush(`notifications:undelivered:${userId}`, JSON.stringify(notification));
      await redis.ltrim(`notifications:undelivered:${userId}`, 0, 99); // Keep last 100 notifications
    }
    
    return true;
  } catch (error) {
    console.error('Error sending notification via WebSocket:', error);
    return false;
  }
};

// Send notification to multiple users
const sendNotificationToUsers = async (userIds, notification) => {
  try {
    const results = await Promise.all(userIds.map(userId => sendNotificationToUser(userId, notification)));
    return results.every(result => result);
  } catch (error) {
    console.error('Error sending notification to multiple users:', error);
    return false;
  }
};

// Send notification to all connected clients
const broadcastNotification = async (notification) => {
  try {
    if (!wss) {
      console.error('WebSocket server not initialized');
      return false;
    }
    
    let clientCount = 0;
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'broadcast',
          data: notification,
          timestamp: new Date().toISOString()
        }));
        clientCount++;
      }
    });
    
    console.log(`Broadcast notification to ${clientCount} WebSocket clients`);
    return true;
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return false;
  }
};

// Get undelivered notifications for user
const getUndeliveredNotifications = async (userId) => {
  try {
    const notifications = await redis.lrange(`notifications:undelivered:${userId}`, 0, -1);
    return notifications.map(notification => JSON.parse(notification));
  } catch (error) {
    console.error('Error getting undelivered notifications:', error);
    return [];
  }
};

// Mark notifications as delivered
const markNotificationsAsDelivered = async (userId) => {
  try {
    await redis.del(`notifications:undelivered:${userId}`);
    return true;
  } catch (error) {
    console.error('Error marking notifications as delivered:', error);
    return false;
  }
};

module.exports = {
  initializeWebSocket,
  sendNotificationToUser,
  sendNotificationToUsers,
  broadcastNotification,
  getUndeliveredNotifications,
  markNotificationsAsDelivered
}; 