import express from 'express';

/**
 * ApiRouter - defines all API endpoints for frontend
 */
export class ApiRouter {
  constructor(dbManager, archiveManager, windCollector, notificationManager, forecastCollector) {
    this.dbManager = dbManager;
    this.archiveManager = archiveManager;
    this.windCollector = windCollector;
    this.notificationManager = notificationManager;
    this.forecastCollector = forecastCollector;
    this.router = express.Router();
    this.sseClients = []; // Connected SSE clients
    this.setupRoutes();
  }

  /**
   * Broadcast new wind data to all connected SSE clients
   */
  broadcastWindUpdate(windData, trend) {
    const message = JSON.stringify({
      type: 'wind_update',
      data: windData,
      trend: trend,
      timestamp: new Date().toISOString()
    });

    this.sseClients = this.sseClients.filter(client => {
      try {
        client.write(`data: ${message}\n\n`);
        return true;
      } catch (error) {
        return false; // Remove dead clients
      }
    });

    if (this.sseClients.length > 0) {
      console.log(`📡 Broadcast to ${this.sseClients.length} client(s)`);
    }
  }

  setupRoutes() {
    // Version endpoint for cache invalidation
    this.router.get('/version', (req, res) => {
      res.json({
        version: '2.2.1',
        timestamp: new Date().toISOString(),
        serviceWorkerVersion: 'jollykite-v2.2.1'
      });
    });

    // Server-Sent Events endpoint for real-time updates
    this.router.get('/wind/stream', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Send initial data
      const currentData = this.dbManager.getLatestData();
      const trend = this.dbManager.calculateTrend();

      if (currentData) {
        const message = JSON.stringify({
          type: 'wind_update',
          data: this.formatWindData(currentData),
          trend: trend,
          timestamp: new Date().toISOString()
        });
        res.write(`data: ${message}\n\n`);
      }

      // Add client to broadcast list
      this.sseClients.push(res);
      console.log(`📡 SSE client connected (total: ${this.sseClients.length})`);

      // Keep-alive heartbeat (send comment every 30 seconds to keep connection alive)
      const heartbeatInterval = setInterval(() => {
        try {
          res.write(': heartbeat\n\n');
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30 seconds

      // Remove client on disconnect
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        this.sseClients = this.sseClients.filter(client => client !== res);
        console.log(`📡 SSE client disconnected (total: ${this.sseClients.length})`);
      });
    });

    // Get current wind data
    this.router.get('/wind/current', (req, res) => {
      try {
        const data = this.dbManager.getLatestData();
        if (!data) {
          return res.status(404).json({ error: 'No wind data available' });
        }
        res.json(this.formatWindData(data));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get wind history for last 7 days (grouped by day, 6:00-19:00 only)
    // IMPORTANT: This must be before the generic /wind/history/:hours? route
    this.router.get('/wind/history/week', (req, res) => {
      try {
        const days = parseInt(req.query.days) || 7;
        const data = this.dbManager.getDataByHours(days * 24);

        // Group data by day
        const groupedByDay = {};

        data.forEach(record => {
          // Get Bangkok time hour for filtering
          const timestamp = new Date(record.timestamp);
          const bangkokHour = parseInt(timestamp.toLocaleString('en-US', {
            timeZone: 'Asia/Bangkok',
            hour: 'numeric',
            hour12: false
          }));

          // Only include data from 6:00 to 19:00 Bangkok time
          if (bangkokHour < 6 || bangkokHour >= 19) {
            return;
          }

          // Get Bangkok date for grouping (en-CA format gives YYYY-MM-DD)
          const dateKey = timestamp.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

          if (!groupedByDay[dateKey]) {
            groupedByDay[dateKey] = {
              date: dateKey,
              data: []
            };
          }

          groupedByDay[dateKey].data.push({
            time: record.timestamp,
            avg_speed: parseFloat(record.wind_speed_knots) || 0,
            max_gust: parseFloat(record.wind_gust_knots || record.wind_speed_knots) || 0,
            direction: parseInt(record.wind_direction) || 0
          });
        });

        // Convert to array and sort by date (newest first)
        const result = Object.values(groupedByDay)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, days);

        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get wind history for last N hours
    this.router.get('/wind/history/:hours?', (req, res) => {
      try {
        const hours = parseInt(req.params.hours) || 24;
        const data = this.dbManager.getDataByHours(hours);
        res.json(data.map(d => this.formatWindData(d)));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get today's aggregate for gradient display
    // Supports both hourly (default) and custom interval (e.g., 5-minute) aggregation
    this.router.get('/wind/today/gradient', (req, res) => {
      try {
        const startHour = parseInt(req.query.start) || 6;
        const endHour = parseInt(req.query.end) || 20;
        const interval = parseInt(req.query.interval);

        // If interval is specified, use interval-based aggregation
        if (interval && interval > 0) {
          const data = this.dbManager.getIntervalAggregateToday(startHour, endHour, interval);
          res.json(data);
        } else {
          // Default to hourly aggregation
          const data = this.dbManager.getHourlyAggregateToday(startHour, endHour);
          res.json(data);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get wind statistics
    this.router.get('/wind/statistics/:hours?', (req, res) => {
      try {
        const hours = parseInt(req.params.hours) || 24;
        const stats = this.dbManager.getStatistics(hours);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get wind trend (increasing/decreasing/stable)
    this.router.get('/wind/trend', (req, res) => {
      try {
        const trend = this.dbManager.calculateTrend();
        res.json(trend);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get wind forecast from Open-Meteo
    this.router.get('/wind/forecast', async (req, res) => {
      try {
        if (!this.forecastCollector) {
          return res.status(503).json({ error: 'Forecast service not available' });
        }

        const forecast = await this.forecastCollector.fetchWindForecast();
        res.json(forecast);
      } catch (error) {
        console.error('Forecast API error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get combined history + extrapolated forecast for today's full timeline
    this.router.get('/wind/today/full', async (req, res) => {
      try {
        const startHour = parseInt(req.query.start) || 6;
        const endHour = parseInt(req.query.end) || 19;
        const interval = parseInt(req.query.interval) || 5;

        // Get today's actual wind data (history)
        const historyData = this.dbManager.getIntervalAggregateToday(startHour, endHour, interval);

        if (!historyData || historyData.length === 0) {
          return res.json({
            history: [],
            forecast: [],
            correctionFactor: 1.0,
            currentTime: null
          });
        }

        // Get current time in Bangkok timezone
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const currentHour = bangkokTime.getHours();
        const currentMinute = bangkokTime.getMinutes();

        // Get forecast for today
        if (!this.forecastCollector) {
          return res.json({
            history: historyData,
            forecast: [],
            correctionFactor: 1.0,
            currentTime: { hour: currentHour, minute: currentMinute }
          });
        }

        const fullForecast = await this.forecastCollector.fetchWindForecast();

        // Filter forecast for today only
        const todayForecast = fullForecast.filter(f => {
          const forecastDate = new Date(f.date);
          return forecastDate.toDateString() === bangkokTime.toDateString();
        });

        // Convert history data to format compatible with correction factor calculation
        const historyForComparison = historyData.map(h => ({
          time: `${bangkokTime.toDateString()} ${h.hour}:${h.minute || 0}:00`,
          avg_speed: h.avg_speed
        }));

        // Calculate correction factor based on history vs forecast comparison
        const correctionFactor = this.forecastCollector.calculateCorrectionFactor(
          historyForComparison,
          todayForecast
        );

        // Filter forecast to only include future hours
        const futureForecast = todayForecast.filter(f => {
          const forecastDate = new Date(f.date);
          const forecastHour = forecastDate.getHours();
          return forecastHour > currentHour ||
                 (forecastHour === currentHour && forecastDate.getMinutes() > currentMinute);
        });

        // Apply correction factor to future forecast
        const correctedForecast = this.forecastCollector.applyCorrection(futureForecast, correctionFactor);

        res.json({
          history: historyData,
          forecast: correctedForecast,
          correctionFactor: parseFloat(correctionFactor.toFixed(2)),
          currentTime: { hour: currentHour, minute: currentMinute }
        });
      } catch (error) {
        console.error('Error generating full timeline:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Debug: Get database statistics
    this.router.get('/debug/db-stats', (req, res) => {
      try {
        const stats = this.dbManager.getStatistics(24);

        // Get total count
        const countResult = this.dbManager.db.exec('SELECT COUNT(*) as count FROM wind_data');
        const totalCount = countResult.length > 0 ? countResult[0].values[0][0] : 0;

        // Get recent timestamps
        const timestampResult = this.dbManager.db.exec('SELECT timestamp FROM wind_data ORDER BY timestamp DESC LIMIT 12');
        const recentTimestamps = timestampResult.length > 0
          ? timestampResult[0].values.map(row => row[0])
          : [];

        res.json({
          totalRecords: totalCount,
          statistics: stats,
          recent12Timestamps: recentTimestamps
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get archived data for last N days
    this.router.get('/archive/days/:days?', (req, res) => {
      try {
        const days = parseInt(req.params.days) || 30;
        const data = this.archiveManager.getArchivedDataByDays(days);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get archived data for specific day (for history gradient)
    this.router.get('/archive/day/:date', (req, res) => {
      try {
        const date = req.params.date; // Format: YYYY-MM-DD
        const startHour = parseInt(req.query.start) || 6;
        const endHour = parseInt(req.query.end) || 19;
        const data = this.archiveManager.getArchivedDataForDay(date, startHour, endHour);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get archive statistics
    this.router.get('/archive/statistics/:days?', (req, res) => {
      try {
        const days = parseInt(req.params.days) || 30;
        const stats = this.archiveManager.getArchiveStatistics(days);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get wind patterns by hour of day
    this.router.get('/archive/patterns/:days?', (req, res) => {
      try {
        const days = parseInt(req.params.days) || 30;
        const patterns = this.archiveManager.getWindPatternByHour(days);
        res.json(patterns);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Force data collection (for testing)
    this.router.post('/wind/collect', async (req, res) => {
      try {
        const data = await this.windCollector.collectWindData();
        res.json({ success: true, data: this.formatWindData(data) });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Force hourly archiving (for testing)
    this.router.post('/archive/hourly', async (req, res) => {
      try {
        const data = await this.windCollector.archiveHourlyData();
        if (!data) {
          return res.json({ success: false, message: 'No data to archive' });
        }
        res.json({ success: true, data });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Subscribe to push notifications
    this.router.post('/notifications/subscribe', (req, res) => {
      try {
        const subscription = req.body;
        if (!subscription || !subscription.endpoint) {
          return res.status(400).json({ error: 'Invalid subscription' });
        }

        const added = this.notificationManager.addSubscription(subscription);
        res.json({ success: true, added });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Unsubscribe from push notifications
    this.router.post('/notifications/unsubscribe', (req, res) => {
      try {
        const { endpoint } = req.body;
        if (!endpoint) {
          return res.status(400).json({ error: 'Endpoint required' });
        }

        const removed = this.notificationManager.removeSubscription(endpoint);
        res.json({ success: true, removed });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get notification statistics
    this.router.get('/notifications/stats', (req, res) => {
      try {
        const stats = this.notificationManager.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Format wind data for API response
   */
  formatWindData(data) {
    if (!data) return null;

    return {
      timestamp: data.timestamp,
      windSpeedKnots: parseFloat(data.wind_speed_knots?.toFixed(1) || 0),
      windGustKnots: data.wind_gust_knots ? parseFloat(data.wind_gust_knots.toFixed(1)) : null,
      maxGustKnots: data.max_gust_knots ? parseFloat(data.max_gust_knots.toFixed(1)) : null,
      windDir: parseInt(data.wind_direction || 0),
      windDirAvg: data.wind_direction_avg ? parseInt(data.wind_direction_avg) : null,
      temperature: data.temperature ? parseFloat(data.temperature.toFixed(1)) : null,
      humidity: data.humidity ? parseFloat(data.humidity.toFixed(1)) : null,
      pressure: data.pressure ? parseFloat(data.pressure.toFixed(2)) : null
    };
  }

  /**
   * Calculate wind safety level based on direction and speed
   */
  calculateSafety(direction, speedKnots) {
    const isOffshore = direction >= 225 && direction <= 315; // SW-NW
    const isOnshore = direction >= 45 && direction <= 135;   // NE-SE

    let level = 'medium';

    if (isOffshore) {
      level = 'danger';
    } else if (speedKnots < 5) {
      level = 'low';
    } else if (speedKnots >= 15 && speedKnots <= 25 && isOnshore) {
      level = 'high';
    } else if (speedKnots >= 12 && speedKnots <= 20) {
      level = 'good';
    } else if (speedKnots > 30) {
      level = 'danger';
    }

    return {
      level,
      isOffshore,
      isOnshore,
      text: this.getSafetyText(level),
      color: this.getSafetyColor(level)
    };
  }

  /**
   * Get safety level text
   */
  getSafetyText(level) {
    const texts = {
      low: 'Слабый ветер',
      medium: 'Умеренно',
      good: 'Хорошие условия',
      high: 'Отличные условия!',
      danger: 'Опасно!'
    };
    return texts[level] || 'Неизвестно';
  }

  /**
   * Get safety level color
   */
  getSafetyColor(level) {
    const colors = {
      low: '#87CEEB',
      medium: '#FFA500',
      good: '#FFD700',
      high: '#00FF00',
      danger: '#FF4500'
    };
    return colors[level] || '#808080';
  }

  getRouter() {
    return this.router;
  }
}
