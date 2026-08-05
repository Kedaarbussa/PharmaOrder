const mongoose = require('mongoose');

/**
 * Cached connection object for Vercel serverless functions.
 * Prevents multiple MongoDB connections across lambdas.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('MONGODB_URI environment variable is missing.');
    return null;
  }

  // If already connected, return connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log('MongoDB connected successfully to cloud database');
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      console.error('MongoDB Connection Error:', err.message);
      throw err;
    });
  }

  try {
    await cached.promise;
    cached.conn = mongoose.connection;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to resolve MongoDB connection:', e.message);
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB;
