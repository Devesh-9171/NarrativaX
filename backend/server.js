const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('./config');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const Book = require('./models/Book');
const Chapter = require('./models/Chapter');
const ShortStory = require('./models/ShortStory');
const Payment = require('./models/Payment');

const app = express();
let isDatabaseConnected = mongoose.connection.readyState === 1;
let databaseError = null;

function logStartupWarning(message) {
  console.warn(`[startup] ${message}`);
}

function validateStartupConfig() {
  if (config.missingRequiredEnv.length > 0) {
    throw new Error(
      `Missing required environment variables: ${config.missingRequiredEnv.join(', ')}. ` +
        'Set these in your Render service before starting the backend.'
    );
  }

  if (!config.hasConfiguredCorsOrigins) {
    logStartupWarning(
      'CLIENT_URL is not set. CORS will allow all origins until CLIENT_URL is configured.'
    );
  }
}


function corsOriginHandler(origin, callback) {
  if (!origin || !config.hasConfiguredCorsOrigins) {
    return callback(null, true);
  }

  if (config.allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`CORS blocked for origin: ${origin}`));
}

function buildHealthPayload() {
  return {
    success: isDatabaseConnected,
    service: 'narrativax-backend',
    environment: config.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    database: {
      connected: isDatabaseConnected,
      readyState: mongoose.connection.readyState,
      error: databaseError ? databaseError.message : null
    }
  };
}

async function syncDatabaseIndexes() {
  await Promise.all([Book.syncIndexes(), Chapter.syncIndexes(), ShortStory.syncIndexes(), Payment.syncIndexes()]);
}

async function connectDatabaseWithRetry() {
  try {
    await connectDB(config.mongoUri);
    await syncDatabaseIndexes();
    isDatabaseConnected = true;
    databaseError = null;
  } catch (error) {
    isDatabaseConnected = false;
    databaseError = error;
    console.error(`MongoDB connection failed. Retrying in ${config.dbConnectRetryMs}ms.`, error);
    setTimeout(connectDatabaseWithRetry, config.dbConnectRetryMs);
  }
}

function setupProcessHandlers(server) {
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
        }
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection', error);
  });
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception', error);
    process.exit(1);
  });
}

validateStartupConfig();

mongoose.connection.on('connected', () => {
  isDatabaseConnected = true;
  databaseError = null;
});

mongoose.connection.on('disconnected', () => {
  isDatabaseConnected = false;
});

mongoose.connection.on('error', (error) => {
  isDatabaseConnected = false;
  databaseError = error;
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'NarrativaX backend is running' });
});

app.get('/api', (_req, res) => {
  res.json({ success: true, message: 'NarrativaX API is available' });
});

app.get('/api/health', (_req, res) => {
  const payload = buildHealthPayload();
  res.status(payload.database.connected ? 200 : 503).json(payload);
});

app.get('/healthz', (_req, res) => {
  const payload = buildHealthPayload();
  res.status(200).json(payload);
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/sitemap', require('./routes/sitemapRoutes'));
app.use('/api/chapters', require('./routes/chapterRoutes'));
app.use('/api/short-stories', require('./routes/shortStoryRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
  connectDatabaseWithRetry();
});
server.requestTimeout = 120000;
server.headersTimeout = 125000;
server.keepAliveTimeout = 65000;

setupProcessHandlers(server);

module.exports = app;
