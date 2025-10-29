import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { WindDataCollector } from './src/WindDataCollector.js';
import { DatabaseManager } from './src/DatabaseManager.js';
import { ArchiveManager } from './src/ArchiveManager.js';
import { ApiRouter } from './src/ApiRouter.js';
import { NotificationManager } from './src/NotificationManager.js';
import { ForecastCollector } from './src/ForecastCollector.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const config = {
  ambientWeatherApi: process.env.AMBIENT_WEATHER_API || 'https://lightning.ambientweather.net/devices?public.slug=e63ff0d2119b8c024b5aad24cc59a504',
  openMeteoApi: process.env.OPEN_METEO_API || 'https://api.open-meteo.com/v1/forecast',
  dataCollectionInterval: parseInt(process.env.DATA_COLLECTION_INTERVAL) || 60000, // 1 minute
  archiveInterval: parseInt(process.env.ARCHIVE_INTERVAL) || 3600000, // 1 hour
  spotLocation: [12.346596280786017, 99.99817902532192],
  timezone: 'Asia/Bangkok'
};

// Initialize managers
const dbManager = new DatabaseManager('./data/wind_data.db');
const archiveManager = new ArchiveManager('./data/wind_archive.db');
const notificationManager = new NotificationManager('./data/subscriptions.json');
const windCollector = new WindDataCollector(config, dbManager, archiveManager);
const forecastCollector = new ForecastCollector(config);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
const apiRouter = new ApiRouter(dbManager, archiveManager, windCollector, notificationManager, forecastCollector);
app.use('/api', apiRouter.getRouter());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Initialize database
async function initialize() {
  try {
    console.log('🚀 Initializing JollyKite Backend...');

    // Initialize databases
    await dbManager.initialize();
    await archiveManager.initialize();
    console.log('✓ Databases initialized');

    // Collect initial data only during working hours (6:00-19:00 Bangkok time)
    const currentHour = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Bangkok',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(currentHour);
    if (hour >= 6 && hour < 19) {
      await windCollector.collectWindData();
      console.log(`✓ Initial wind data collected (Bangkok time: ${hour}:xx)`);
    } else {
      console.log(`⏸ Outside working hours (6:00-19:00 Bangkok time), current hour: ${hour}:xx`);
    }

    // Schedule periodic data collection (every 5 minutes, only 6:00-19:00 Bangkok time)
    cron.schedule('*/5 * * * *', async () => {
      try {
        // Check if within working hours (6:00-19:00 Bangkok time)
        const currentHour = new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          hour: 'numeric',
          hour12: false
        });
        const hour = parseInt(currentHour);

        if (hour < 6 || hour >= 19) {
          // Outside working hours, skip
          return;
        }

        const windData = await windCollector.collectWindData();
        console.log(`✓ Wind data collected at ${new Date().toISOString()} (Bangkok: ${hour}:xx)`);

        // Get latest data and trend for broadcast
        const latestData = dbManager.getLatestData();
        const trend = dbManager.calculateTrend();

        // Broadcast to connected SSE clients
        if (latestData) {
          const formattedData = apiRouter.formatWindData ? apiRouter.formatWindData(latestData) : latestData;
          apiRouter.broadcastWindUpdate(formattedData, trend);
        }

        // Check if we should send push notifications
        // Get last 4 measurements (20 minutes) for stability check
        const recentMeasurements = dbManager.getLastMeasurements(4);

        if (recentMeasurements && recentMeasurements.length >= 4) {
          // Send notifications if conditions are met (stable wind for 20 min)
          const result = await notificationManager.sendNotifications(recentMeasurements);

          if (result.sent > 0) {
            console.log(`📨 Sent ${result.sent} push notifications (stable wind detected)`);
          }
        }
      } catch (error) {
        console.error('✗ Error collecting wind data:', error.message);
      }
    });
    console.log('✓ Data collection scheduler started (every 5 minutes, 6:00-19:00 Bangkok time)');

    // Schedule hourly archiving (every hour at minute 0)
    cron.schedule('0 * * * *', async () => {
      try {
        await windCollector.archiveHourlyData();
        console.log(`✓ Hourly data archived at ${new Date().toISOString()}`);
      } catch (error) {
        console.error('✗ Error archiving data:', error.message);
      }
    });
    console.log('✓ Archive scheduler started (every hour)');

    // Schedule daily cleanup (every day at 00:05)
    cron.schedule('5 0 * * *', async () => {
      try {
        dbManager.cleanupOldData(7); // Keep 7 days of raw data
        notificationManager.resetDailyLog(); // Reset notification log
        console.log(`✓ Old data cleaned up at ${new Date().toISOString()}`);
      } catch (error) {
        console.error('✗ Error cleaning up data:', error.message);
      }
    });
    console.log('✓ Cleanup scheduler started (daily at 00:05)');

    // Start server
    app.listen(PORT, () => {
      console.log(`\n✅ JollyKite Backend is running on port ${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health\n`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize backend:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  dbManager.close();
  archiveManager.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  dbManager.close();
  archiveManager.close();
  process.exit(0);
});

// Start the application
initialize();
