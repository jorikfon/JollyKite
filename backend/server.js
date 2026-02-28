import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import pgPool from './src/PostgresPool.js';
import { WindDataCollector } from './src/WindDataCollector.js';
import { DatabaseManager } from './src/DatabaseManager.js';
import { ArchiveManager } from './src/ArchiveManager.js';
import { ApiRouter } from './src/ApiRouter.js';
import { NotificationManager } from './src/NotificationManager.js';
import { ForecastCollector } from './src/ForecastCollector.js';
import { CalibrationManager } from './src/CalibrationManager.js';
import { ForecastModelManager } from './src/ForecastModelManager.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const config = {
  stations: [
    {
      id: 'pak_nam_pran',
      name: 'Pak Nam Pran Beach',
      slug: 'e63ff0d2119b8c024b5aad24cc59a504',
      type: 'ambient',
      url: 'https://lightning.ambientweather.net/devices?public.slug=e63ff0d2119b8c024b5aad24cc59a504',
      lat: 12.3466, lon: 99.9982,
      elevation: 5,
      isPrimary: true
    },
    {
      id: 'pvf2_thap_tai',
      name: 'PVF2 Thap Tai',
      slug: 'b3b6f7cf28a0062332615508b42e3b1f',
      type: 'ambient',
      url: 'https://lightning.ambientweather.net/devices?public.slug=b3b6f7cf28a0062332615508b42e3b1f',
      lat: 12.4698, lon: 99.944,
      elevation: 63,
      isPrimary: false
    },
    {
      id: 'hua_hin',
      name: 'WS-2902D Hua Hin',
      slug: '4ee225c9a4702440b0f1066444b72b09',
      type: 'ambient',
      url: 'https://lightning.ambientweather.net/devices?public.slug=4ee225c9a4702440b0f1066444b72b09',
      lat: 12.556, lon: 99.948,
      elevation: 18,
      isPrimary: false
    },
    {
      id: 'surfspot_wc',
      name: 'Surfspot (Weathercloud)',
      type: 'weathercloud',
      deviceId: '9393576058',
      url: 'https://app.weathercloud.net/device/values/9393576058',
      lat: 12.5536, lon: 99.9639,
      elevation: 0,
      isPrimary: false
    }
  ],
  openMeteoApi: process.env.OPEN_METEO_API || 'https://api.open-meteo.com/v1/forecast',
  dataCollectionInterval: parseInt(process.env.DATA_COLLECTION_INTERVAL) || 60000, // 1 minute
  archiveInterval: parseInt(process.env.ARCHIVE_INTERVAL) || 3600000, // 1 hour
  spotLocation: [12.346596280786017, 99.99817902532192],
  timezone: 'Asia/Bangkok'
};

// Initialize managers (pgPool passed to DB-backed managers)
const dbManager = new DatabaseManager(pgPool);
const archiveManager = new ArchiveManager(pgPool);
const notificationManager = new NotificationManager('./data/subscriptions.json');
const windCollector = new WindDataCollector(config, dbManager, archiveManager);
const forecastCollector = new ForecastCollector(config);
const calibrationManager = new CalibrationManager('./data/calibration.json');
const forecastModelManager = new ForecastModelManager(pgPool, forecastCollector, archiveManager, dbManager);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static('../frontend'));

// API Routes
const apiRouter = new ApiRouter(dbManager, archiveManager, windCollector, notificationManager, forecastCollector, calibrationManager, forecastModelManager, config.stations);
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

    // Initialize PostgreSQL connection pool
    await pgPool.initialize();

    // Initialize database tables
    await dbManager.initialize();
    await archiveManager.initialize();
    await forecastModelManager.initialize();
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
        const latestData = await dbManager.getLatestData();
        const trend = await dbManager.calculateTrend();

        // Broadcast to connected SSE clients
        if (latestData) {
          const formattedData = apiRouter.formatWindData ? apiRouter.formatWindData(latestData) : latestData;
          apiRouter.broadcastWindUpdate(formattedData, trend);
        }

        // Check if we should send push notifications
        // Get last 3 measurements (15 minutes) for stability check
        const recentMeasurements = await dbManager.getLastMeasurements(3);

        if (recentMeasurements && recentMeasurements.length >= 3) {
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
        await dbManager.cleanupOldData(7); // Keep 7 days of raw data
        notificationManager.resetDailyLog(); // Reset notification log
        console.log(`✓ Old data cleaned up at ${new Date().toISOString()}`);
      } catch (error) {
        console.error('✗ Error cleaning up data:', error.message);
      }
    });
    console.log('✓ Cleanup scheduler started (daily at 00:05)');

    // Schedule forecast snapshot saving (every 3 hours, 5:00-20:00 Bangkok time = UTC-7 → 22:00-13:00 UTC)
    cron.schedule('0 */3 * * *', async () => {
      try {
        const currentHour = new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          hour: 'numeric',
          hour12: false
        });
        const hour = parseInt(currentHour);
        if (hour >= 5 && hour <= 20) {
          await forecastModelManager.saveForcastSnapshots();
        }
      } catch (error) {
        console.error('✗ Error saving forecast snapshots:', error.message);
      }
    });
    console.log('✓ Forecast snapshot scheduler started (every 3 hours)');

    // Schedule daily accuracy evaluation (20:00 Bangkok = 13:00 UTC)
    cron.schedule('0 13 * * *', async () => {
      try {
        await forecastModelManager.evaluateAccuracy();
      } catch (error) {
        console.error('✗ Error evaluating forecast accuracy:', error.message);
      }
    });
    console.log('✓ Forecast accuracy evaluation scheduler started (daily at 20:00 Bangkok)');

    // Schedule weekly snapshot cleanup (Sunday 01:00 Bangkok = Saturday 18:00 UTC)
    cron.schedule('0 18 * * 6', async () => {
      try {
        await forecastModelManager.cleanupOldSnapshots(14);
      } catch (error) {
        console.error('✗ Error cleaning up forecast snapshots:', error.message);
      }
    });
    console.log('✓ Forecast snapshot cleanup scheduler started (weekly)');

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
async function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  await pgPool.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the application
initialize();
