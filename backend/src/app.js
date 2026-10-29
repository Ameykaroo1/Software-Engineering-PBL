const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const { csrfProtection } = require('./middleware/csrf');

// Route imports
const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Allowed Origins Configuration
function getAllowedOrigins() {
  const defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];
  if (process.env.FRONTEND_URL) {
    defaultOrigins.push(process.env.FRONTEND_URL);
  }
  if (process.env.ALLOWED_ORIGINS) {
    const custom = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    defaultOrigins.push(...custom);
  }
  return [...new Set(defaultOrigins.filter(Boolean))];
}

// Strict CORS: Only explicitly allowed origins permitted
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser agents (e.g. server-to-server or test runners without origin header)
      if (!origin) {
        return callback(null, true);
      }
      const allowed = getAllowedOrigins();
      if (allowed.includes(origin)) {
        return callback(null, true);
      }
      // Reject any unexpected origin
      return callback(new Error(`CORS blocked: Origin '${origin}' is not authorized.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'x-test-auth']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// CSRF Protection for state-changing requests using cookie authentication
app.use(csrfProtection);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'MediCore Hospital Resource Allocation API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/audit-logs', auditRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route '${req.method} ${req.originalUrl}' not found.`
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
