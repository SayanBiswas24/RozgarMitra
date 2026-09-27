const express = require('express');
const helmet = require('helmet');
const corsMiddleware = require('./config/cors');
const { globalLimiter } = require('./middleware/rateLimitMiddleware');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');
const apiRoutes = require('./routes/index');

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Let frontend handle CSP or configure per app
    crossOriginEmbedderPolicy: false
  })
);

// Secure CORS
app.use(corsMiddleware);

// Request body parsers with size limit protection against DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global Rate Limiting
app.use('/api', globalLimiter);

// API Routes
app.use('/api', apiRoutes);

// Root route / health check
app.get('/', (req, res) => {
  res.json({
    name: 'Rojgar Mitra API',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'OPERATIONAL'
  });
});

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
