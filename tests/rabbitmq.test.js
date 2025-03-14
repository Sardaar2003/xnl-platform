const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

describe('RabbitMQ Integration', () => {
  let connection;
  let channel;
  const testExchange = 'test-exchange';
  const testQueue = 'test-queue';
  const testRoutingKey = 'test.event';

  beforeAll(async () => {
    // Connect to RabbitMQ
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Setup test exchange and queue
    await channel.assertExchange(testExchange, 'topic', { durable: true });
    await channel.assertQueue(testQueue, { durable: true });
    await channel.bindQueue(testQueue, testExchange, testRoutingKey);
  });

  afterAll(async () => {
    // Clean up
    await channel.deleteQueue(testQueue);
    await channel.deleteExchange(testExchange);
    await channel.close();
    await connection.close();
  });

  it('should publish and consume messages', async () => {
    // Create a unique message ID for this test
    const messageId = uuidv4();
    const testMessage = {
      id: messageId,
      data: {
        test: 'data',
        timestamp: new Date().toISOString()
      }
    };

    // Set up a promise to resolve when the message is consumed
    const messageReceived = new Promise((resolve) => {
      channel.consume(testQueue, (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          if (content.id === messageId) {
            channel.ack(msg);
            resolve(content);
          }
        }
      });
    });

    // Publish the message
    await channel.publish(
      testExchange,
      testRoutingKey,
      Buffer.from(JSON.stringify(testMessage)),
      {
        persistent: true,
        messageId: messageId,
        contentType: 'application/json'
      }
    );

    // Wait for the message to be consumed
    const receivedMessage = await messageReceived;
    expect(receivedMessage).toEqual(testMessage);
  });

  it('should handle message retries', async () => {
    // Create a unique message ID for this test
    const messageId = uuidv4();
    const testMessage = {
      id: messageId,
      data: {
        test: 'retry-data',
        timestamp: new Date().toISOString()
      }
    };

    // Set up a counter for retries
    let retryCount = 0;
    const maxRetries = 3;

    // Set up a promise to resolve when the message is consumed after retries
    const messageRetried = new Promise((resolve) => {
      channel.consume(testQueue, (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          if (content.id === messageId) {
            retryCount++;
            
            if (retryCount < maxRetries) {
              // Nack the message to trigger a retry
              channel.nack(msg, false, true);
            } else {
              // Acknowledge the message after max retries
              channel.ack(msg);
              resolve({ content, retries: retryCount });
            }
          }
        }
      });
    });

    // Publish the message
    await channel.publish(
      testExchange,
      testRoutingKey,
      Buffer.from(JSON.stringify(testMessage)),
      {
        persistent: true,
        messageId: messageId,
        contentType: 'application/json'
      }
    );

    // Wait for the message to be retried and finally consumed
    const result = await messageRetried;
    expect(result.content).toEqual(testMessage);
    expect(result.retries).toBe(maxRetries);
  });

  it('should handle dead letter queues', async () => {
    // Setup dead letter exchange and queue
    const dlxName = 'test-dlx';
    const dlqName = 'test-dlq';
    
    await channel.assertExchange(dlxName, 'topic', { durable: true });
    await channel.assertQueue(dlqName, { durable: true });
    await channel.bindQueue(dlqName, dlxName, '#');

    // Create a queue with dead letter configuration
    const testQueueWithDLX = 'test-queue-with-dlx';
    await channel.assertQueue(testQueueWithDLX, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': dlxName,
        'x-dead-letter-routing-key': 'dead.letter'
      }
    });
    await channel.bindQueue(testQueueWithDLX, testExchange, 'test.dlx');

    // Create a unique message ID for this test
    const messageId = uuidv4();
    const testMessage = {
      id: messageId,
      data: {
        test: 'dlx-data',
        timestamp: new Date().toISOString()
      }
    };

    // Set up a promise to resolve when the message reaches the DLQ
    const messageDLQed = new Promise((resolve) => {
      channel.consume(dlqName, (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          if (content.id === messageId) {
            channel.ack(msg);
            resolve(content);
          }
        }
      });
    });

    // Set up consumer that rejects all messages
    channel.consume(testQueueWithDLX, (msg) => {
      if (msg) {
        // Reject the message without requeuing
        channel.reject(msg, false);
      }
    });

    // Publish the message
    await channel.publish(
      testExchange,
      'test.dlx',
      Buffer.from(JSON.stringify(testMessage)),
      {
        persistent: true,
        messageId: messageId,
        contentType: 'application/json'
      }
    );

    // Wait for the message to reach the DLQ
    const dlqMessage = await messageDLQed;
    expect(dlqMessage).toEqual(testMessage);

    // Clean up
    await channel.deleteQueue(testQueueWithDLX);
    await channel.deleteQueue(dlqName);
    await channel.deleteExchange(dlxName);
  });
}); 