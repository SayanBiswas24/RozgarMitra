const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

let server;

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Synchronize courses from dataset into MongoDB
    try {
      const { seedCourses } = require('./seeders/seedCourses');
      await seedCourses();
    } catch (syncErr) {
      console.warn('[Server] Non-fatal: Course synchronization deferred:', syncErr.message);
    }

    // 3. Start Express HTTP Server
    server = app.listen(env.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Rojgar Mitra Backend Server Started`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Port:        ${env.PORT}`);
      console.log(`🛡️  Auth API:    http://localhost:${env.PORT}/api/auth`);
      console.log(`🩺 Health API:  http://localhost:${env.PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful Shutdown Handlers
async function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP connections closed.');
      await disconnectDB();
      console.log('[MongoDB] Database connection closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at Promise]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  process.exit(1);
});

startServer();
