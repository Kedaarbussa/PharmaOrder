const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../config/db');
const authRoutes = require('../routes/authRoutes');
const orderRoutes = require('../routes/orderRoutes');
const cronRoutes = require('../routes/cronRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Database connection middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (error) {
    console.warn('MongoDB connection warning:', error.message);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cron', cronRoutes);

// Health Check API with DB Status
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  return res.status(200).json({
    status: 'ok',
    dbConnected: isDbConnected,
    mode: isDbConnected ? 'MongoDB Cloud Database (Persistent)' : 'In-Memory Fallback (Temporary)',
    app: 'PharmaOrder API',
    timestamp: new Date().toISOString(),
  });
});

// Root Route fallback to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Fallback 404 for API routes
app.use('/api/*', (req, res) => {
  return res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

// Express Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
  });
});

module.exports = app;
