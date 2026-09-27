const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connect to MongoDB database
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true // Ensure indexes are created
    });

    if (env.NODE_ENV !== 'test') {
      console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    }

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB Error]', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      if (env.NODE_ENV !== 'test') {
        console.warn('[MongoDB] Connection lost. Attempting reconnection...');
      }
    });

    return conn;
  } catch (err) {
    console.error(`[MongoDB Connection Failed] ${err.message}`);
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw err;
  }
}

/**
 * Disconnect from MongoDB (useful for clean test teardown)
 */
async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = {
  connectDB,
  disconnectDB
};
