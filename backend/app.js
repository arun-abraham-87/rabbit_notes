const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// Import routers
console.log('\nImporting routers...');

const notesRouter = require('./routes/notes');
console.log('✓ Notes router imported');

const { router: settingsRouter } = require('./routes/settings');
console.log('✓ Settings router imported');

const tagsRouter = require('./routes/tags');
console.log('✓ Tags router imported');

const journalsRouter = require('./routes/journals');
console.log('✓ Journals router imported');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug route - should be before other routes
app.get('/debug/routes', (req, res) => {
  const routes = [];
  
  // Get routes from the main app
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({ routes });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Root route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Debug route registration
console.log('Registering routes...');

// Mount routers
console.log('\nRegistering API routes...');

app.use('/api/notes', notesRouter);
console.log('✓ Notes router registered at /api/notes');

app.use('/api/settings', settingsRouter);
console.log('✓ Settings router registered at /api/settings');

app.use('/api/tags', tagsRouter);
console.log('✓ Tags router registered at /api/tags');

app.use('/api/journals', journalsRouter);
console.log('✓ Journals router registered at /api/journals');

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    routes: {
      settings: {
        get: '/api/settings',
        post: '/api/settings'
      }
    }
  });
});

// List all registered routes
console.log('\nAvailable routes:');
app._router.stack.forEach(middleware => {
  if (middleware.route) {
    // Routes registered directly on the app
    console.log(`- ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    // Router middleware
    middleware.handle.stack.forEach(handler => {
      if (handler.route) {
        const path = handler.route.path;
        const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
        console.log(`- ${methods} /api${path}`);
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`\nServer running on http://0.0.0.0:${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

module.exports = app; 