require('dotenv').config();
const app = require('./app');
const prisma = require('./services/prisma');
const { getJwtSecret } = require('./middleware/auth');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Verify critical security secrets
    getJwtSecret();

    // 2. Verify database connectivity
    await prisma.$connect();
    console.log('✓ Successfully connected to MediCore database via Prisma.');

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🏥 MediCore Hospital Resource Management API`);
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });

    const shutdown = async () => {
      console.log('\nGracefully shutting down MediCore server...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Fatal: Failed to start MediCore backend server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
