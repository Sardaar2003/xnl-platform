const mongoose = require("mongoose");
const amqp = require("amqplib");
const AWS = require("aws-sdk");
const { exec } = require("child_process");

require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const RABBITMQ_URI = process.env.RABBITMQ_URI || "amqp://localhost";
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const GITHUB_SSH_KEY_PATH = process.env.GITHUB_SSH_KEY_PATH || "~/.ssh/id_rsa";

async function checkMongoDB() {
  try {
    console.log("🔍 Checking MongoDB connection...");
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB is connected!");
    await mongoose.connection.close();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

async function checkRabbitMQ() {
  try {
    console.log("🔍 Checking RabbitMQ connection...");
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    console.log("✅ RabbitMQ is connected!");
    await channel.close();
    await connection.close();
  } catch (err) {
    console.error("❌ RabbitMQ connection failed:", err.message);
    process.exit(1);
  }
}

async function checkAWS() {
  try {
    console.log("🔍 Checking AWS credentials...");

    AWS.config.update({
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_KEY,
      region: "us-east-1", // Change this to your preferred AWS region
    });

    const s3 = new AWS.S3();
    await s3.listBuckets().promise(); // Test API call
    console.log("✅ AWS credentials are valid!");
  } catch (err) {
    console.error("❌ AWS connection failed:", err.message);
    process.exit(1);
  }
}

// async function checkGitHubSSH() {
//   try {
//     console.log("🔍 Checking GitHub SSH access...");
//     exec(`ssh -T singhmantej536@gmail.com -i ${GITHUB_SSH_KEY_PATH}`, (error, stdout) => {
//       if (error) {
//         console.error("❌ GitHub SSH connection failed:", error.message);
//         process.exit(1);
//       }
//       if (stdout.includes("successfully authenticated")) {
//         console.log("✅ GitHub SSH connection is working!");
//       } else {
//         console.error("❌ GitHub SSH authentication failed!");
//         process.exit(1);
//       }
//     });
//   } catch (err) {
//     console.error("❌ GitHub SSH check failed:", err.message);
//     process.exit(1);
//   }
// }

(async () => {
  await checkMongoDB();
  await checkRabbitMQ();
  await checkAWS();
//   await checkGitHubSSH();
  console.log("✅ All dependencies are running fine!");
})();
