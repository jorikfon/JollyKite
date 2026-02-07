import initSqlJs from 'sql.js';
import fs from 'fs';

/**
 * DatabaseManager - manages the working database for real-time wind data
 * Stores detailed measurements with 1-minute granularity
 */
export class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.SQL = null;
  }

  async initialize() {
    this.SQL = await initSqlJs();

    // Load existing database or create new one
    try {
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(buffer);
      } else {
        this.db = new this.SQL.Database();
      }
    } catch (error) {
      this.db = new this.SQL.Database();
    }

    // Create wind_data table for real-time measurements
    this.db.run(`
      CREATE TABLE IF NOT EXISTS wind_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        wind_speed_knots REAL NOT NULL,
        wind_gust_knots REAL,
        max_gust_knots REAL,
        wind_direction INTEGER NOT NULL,
        wind_direction_avg INTEGER,
        temperature REAL,
        humidity REAL,
        pressure REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for timestamp queries
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_wind_data_timestamp
      ON wind_data(timestamp DESC)
    `);

    this.saveToFile();

    // Log current record count for debugging
    const countResult = this.db.exec('SELECT COUNT(*) as count FROM wind_data');
    const recordCount = countResult[0]?.values[0]?.[0] || 0;
    console.log(`✓ Working database initialized (${recordCount} existing records)`);
  }

  saveToFile() {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  /**
   * Insert new wind measurement
   */
  insertWindData(data) {
    this.db.run(
      `INSERT INTO wind_data (
        timestamp, wind_speed_knots, wind_gust_knots, max_gust_knots,
        wind_direction, wind_direction_avg, temperature, humidity, pressure
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.timestamp,
        data.windSpeedKnots,
        data.windGustKnots,
        data.maxGustKnots,
        data.windDir,
        data.windDirAvg,
        data.temperature,
        data.humidity,
        data.pressure
      ]
    );
    this.saveToFile();
  }

  /**
   * Get latest wind measurement
   */
  getLatestData() {
    const result = this.db.exec(`
      SELECT * FROM wind_data
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    if (result.length === 0 || result[0].values.length === 0) return null;

    return this._rowToObject(result[0].columns, result[0].values[0]);
  }

  /**
   * Get wind data for the last N hours
   */
  getDataByHours(hours = 24) {
    const result = this.db.exec(`
      SELECT * FROM wind_data
      WHERE timestamp >= datetime('now', '-${hours} hours')
      ORDER BY timestamp DESC
    `);

    if (result.length === 0) return [];

    return result[0].values.map(row => this._rowToObject(result[0].columns, row));
  }

  /**
   * Get last N measurements (for notification stability check)
   */
  getLastMeasurements(count = 4) {
    const result = this.db.exec(`
      SELECT * FROM wind_data
      ORDER BY timestamp DESC
      LIMIT ${count}
    `);

    if (result.length === 0) return [];

    // Return in chronological order (oldest first)
    return result[0].values
      .map(row => this._rowToObject(result[0].columns, row))
      .reverse();
  }

  /**
   * Get aggregated hourly data for current day (Bangkok timezone)
   */
  getHourlyAggregateToday(startHour = 6, endHour = 19) {
    // Get today's date in Bangkok timezone
    const bangkokDate = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = bangkokDate.split('/');
    const todayBangkok = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Get all data from today (in Bangkok timezone, we need UTC timestamps from yesterday and today)
    // Bangkok is UTC+7, so Bangkok 00:00 = UTC 17:00 previous day
    const bangkokMidnight = new Date(todayBangkok + 'T00:00:00+07:00');
    const bangkokMidnightUTC = bangkokMidnight.toISOString();

    const result = this.db.exec(`
      SELECT
        timestamp,
        wind_speed_knots,
        wind_gust_knots,
        wind_direction
      FROM wind_data
      WHERE timestamp >= '${bangkokMidnightUTC}'
      ORDER BY timestamp ASC
    `);

    if (result.length === 0) return [];

    // Group by hour in Bangkok timezone
    const hourlyData = {};
    result[0].values.forEach(row => {
      const timestamp = row[0];
      const speed = row[1];
      const gust = row[2];
      const direction = row[3];

      // Convert UTC timestamp to Bangkok hour
      const date = new Date(timestamp);
      const bangkokHour = parseInt(date.toLocaleString('en-US', {
        timeZone: 'Asia/Bangkok',
        hour: 'numeric',
        hour12: false
      }));

      // Only include hours in range
      if (bangkokHour < startHour || bangkokHour > endHour) {
        return;
      }

      const hourKey = bangkokHour.toString().padStart(2, '0');

      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          speeds: [],
          gusts: [],
          directions: []
        };
      }

      hourlyData[hourKey].speeds.push(speed);
      if (gust !== null) hourlyData[hourKey].gusts.push(gust);
      hourlyData[hourKey].directions.push(direction);
    });

    // Calculate aggregates
    const aggregates = Object.keys(hourlyData).sort().map(hour => {
      const data = hourlyData[hour];
      return {
        hour: hour,
        avg_speed: data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length,
        max_gust: data.gusts.length > 0 ? Math.max(...data.gusts) : null,
        avg_direction: data.directions.reduce((a, b) => a + b, 0) / data.directions.length,
        measurements: data.speeds.length
      };
    });

    return aggregates;
  }

  /**
   * Get aggregated data in N-minute intervals for current day (Bangkok timezone)
   * Used for smooth gradient visualization
   */
  getIntervalAggregateToday(startHour = 6, endHour = 20, intervalMinutes = 5) {
    // Get today's date in Bangkok timezone
    const bangkokDate = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = bangkokDate.split('/');
    const todayBangkok = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Get all data from today
    const bangkokMidnight = new Date(todayBangkok + 'T00:00:00+07:00');
    const bangkokMidnightUTC = bangkokMidnight.toISOString();

    const result = this.db.exec(`
      SELECT
        timestamp,
        wind_speed_knots,
        wind_gust_knots,
        wind_direction
      FROM wind_data
      WHERE timestamp >= '${bangkokMidnightUTC}'
      ORDER BY timestamp ASC
    `);

    if (result.length === 0) return [];

    // Group by interval in Bangkok timezone
    const intervalData = {};
    result[0].values.forEach(row => {
      const timestamp = row[0];
      const speed = row[1];
      const gust = row[2];
      const direction = row[3];

      // Convert UTC timestamp to Bangkok time
      const date = new Date(timestamp);
      const bangkokHour = parseInt(date.toLocaleString('en-US', {
        timeZone: 'Asia/Bangkok',
        hour: 'numeric',
        hour12: false
      }));
      const bangkokMinute = parseInt(date.toLocaleString('en-US', {
        timeZone: 'Asia/Bangkok',
        minute: 'numeric'
      }));

      // Only include hours in range
      if (bangkokHour < startHour || bangkokHour > endHour) {
        return;
      }

      // Round down to nearest interval
      const intervalMinute = Math.floor(bangkokMinute / intervalMinutes) * intervalMinutes;
      const intervalKey = `${bangkokHour.toString().padStart(2, '0')}:${intervalMinute.toString().padStart(2, '0')}`;

      if (!intervalData[intervalKey]) {
        intervalData[intervalKey] = {
          hour: bangkokHour,
          minute: intervalMinute,
          speeds: [],
          gusts: [],
          directions: []
        };
      }

      intervalData[intervalKey].speeds.push(speed);
      if (gust !== null) intervalData[intervalKey].gusts.push(gust);
      intervalData[intervalKey].directions.push(direction);
    });

    // Calculate aggregates
    const aggregates = Object.keys(intervalData).sort().map(key => {
      const data = intervalData[key];
      return {
        hour: data.hour,
        minute: data.minute,
        time: key,
        avg_speed: data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length,
        max_gust: data.gusts.length > 0 ? Math.max(...data.gusts) : null,
        avg_direction: data.directions.reduce((a, b) => a + b, 0) / data.directions.length,
        measurements: data.speeds.length
      };
    });

    return aggregates;
  }

  /**
   * Get wind statistics for the last N hours
   */
  getStatistics(hours = 24) {
    const result = this.db.exec(`
      SELECT
        COUNT(*) as count,
        AVG(wind_speed_knots) as avg_speed,
        MIN(wind_speed_knots) as min_speed,
        MAX(wind_speed_knots) as max_speed,
        MAX(wind_gust_knots) as max_gust,
        AVG(wind_direction) as avg_direction
      FROM wind_data
      WHERE timestamp >= datetime('now', '-${hours} hours')
    `);

    if (result.length === 0 || result[0].values.length === 0) return null;

    return this._rowToObject(result[0].columns, result[0].values[0]);
  }

  /**
   * Calculate wind trend (increasing/decreasing)
   * Compares last 30 minutes vs previous 30 minutes (with 5-min interval = 6 records each)
   */
  calculateTrend() {
    // Get average speed for last 30 minutes (6 records with 5-min interval)
    const currentResult = this.db.exec(`
      SELECT AVG(wind_speed_knots) as avg_speed, COUNT(*) as count
      FROM (
        SELECT wind_speed_knots
        FROM wind_data
        ORDER BY timestamp DESC
        LIMIT 6
      )
    `);

    // Get average speed for 30-60 minutes ago (entries 7-12)
    const previousResult = this.db.exec(`
      SELECT AVG(wind_speed_knots) as avg_speed, COUNT(*) as count
      FROM (
        SELECT wind_speed_knots
        FROM wind_data
        ORDER BY timestamp DESC
        LIMIT 6 OFFSET 6
      )
    `);

    if (currentResult.length === 0 || previousResult.length === 0 ||
        currentResult[0].values.length === 0 || previousResult[0].values.length === 0) {
      console.log(`[Trend] No data: currentResult=${currentResult.length}, previousResult=${previousResult.length}`);
      return {
        trend: 'insufficient_data',
        text: 'Недостаточно данных',
        icon: '⏳',
        color: '#808080',
        change: 0,
        percentChange: 0,
        ...this.calculateDirectionStability()
      };
    }

    const currentSpeed = currentResult[0].values[0][0];
    const currentCount = currentResult[0].values[0][1];
    const previousSpeed = previousResult[0].values[0][0];
    const previousCount = previousResult[0].values[0][1];

    console.log(`[Trend] Current: ${currentSpeed} knots (${currentCount} records), Previous: ${previousSpeed} knots (${previousCount} records)`);

    // Need at least 3 measurements in each period (with 5-min interval = 15 minutes of data)
    if (currentCount < 3 || previousCount < 3) {
      console.log(`[Trend] Insufficient data: current=${currentCount}, previous=${previousCount}`);
      return {
        trend: 'insufficient_data',
        text: 'Недостаточно данных',
        icon: '⏳',
        color: '#808080',
        change: 0,
        percentChange: 0,
        ...this.calculateDirectionStability()
      };
    }

    if (currentSpeed === null || previousSpeed === null || previousSpeed === 0) {
      return {
        trend: 'insufficient_data',
        text: 'Недостаточно данных',
        icon: '⏳',
        color: '#808080',
        change: 0,
        percentChange: 0,
        ...this.calculateDirectionStability()
      };
    }

    const change = currentSpeed - previousSpeed;
    const percentChange = (change / previousSpeed) * 100;

    // Определение тренда
    let trend, text, icon, color;

    if (Math.abs(percentChange) < 5) {
      trend = 'stable';
      text = 'Стабильно';
      icon = '➡️';
      color = '#FFD700';
    } else if (change > 0) {
      if (percentChange > 15) {
        trend = 'increasing_strong';
        text = 'Усиление';
        icon = '⬆️';
        color = '#32CD32';
      } else {
        trend = 'increasing';
        text = 'Небольшое усиление';
        icon = '↗️';
        color = '#90EE90';
      }
    } else {
      if (percentChange < -15) {
        trend = 'decreasing_strong';
        text = 'Ослабление';
        icon = '⬇️';
        color = '#FF6347';
      } else {
        trend = 'decreasing';
        text = 'Небольшое ослабление';
        icon = '↘️';
        color = '#FFA07A';
      }
    }

    // Расчёт стабильности направления ветра
    const directionData = this.calculateDirectionStability();

    return {
      trend,
      text,
      icon,
      color,
      change: parseFloat(change.toFixed(2)),
      percentChange: parseFloat(percentChange.toFixed(1)),
      currentSpeed: parseFloat(currentSpeed.toFixed(1)),
      previousSpeed: parseFloat(previousSpeed.toFixed(1)),
      ...directionData
    };
  }

  /**
   * Calculate wind direction stability using circular standard deviation
   * Uses last 6 records (~30 min) of wind_direction data
   */
  calculateDirectionStability() {
    const dirResult = this.db.exec(`
      SELECT wind_direction FROM (
        SELECT wind_direction FROM wind_data
        WHERE wind_direction IS NOT NULL
        ORDER BY timestamp DESC
        LIMIT 6
      )
    `);

    if (dirResult.length === 0 || dirResult[0].values.length < 3) {
      return {
        directionTrend: 'insufficient_data',
        directionSpread: 0,
        directionIcon: '',
        directionText: ''
      };
    }

    const directions = dirResult[0].values.map(v => v[0]);

    // Circular mean and spread using sin/cos
    let sumSin = 0, sumCos = 0;
    for (const dir of directions) {
      const rad = (dir * Math.PI) / 180;
      sumSin += Math.sin(rad);
      sumCos += Math.cos(rad);
    }
    const meanSin = sumSin / directions.length;
    const meanCos = sumCos / directions.length;
    const R = Math.sqrt(meanSin * meanSin + meanCos * meanCos); // 0..1
    const spread = Math.round(Math.acos(Math.min(R, 1)) * (180 / Math.PI)); // degrees

    let directionTrend, directionIcon, directionText;

    if (spread < 15) {
      directionTrend = 'stable';
      directionIcon = '🧭';
      directionText = 'Направление стабильное';
    } else if (spread < 30) {
      directionTrend = 'variable';
      directionIcon = '↔️';
      directionText = 'Направление переменное';
    } else {
      directionTrend = 'changing';
      directionIcon = '🔄';
      directionText = 'Направление меняется';
    }

    console.log(`[DirTrend] Spread: ${spread}°, R: ${R.toFixed(3)}, Trend: ${directionTrend}`);

    return {
      directionTrend,
      directionSpread: spread,
      directionIcon,
      directionText
    };
  }

  /**
   * Clean up old data (keep last N days)
   */
  cleanupOldData(daysToKeep = 7) {
    const result = this.db.exec(`
      SELECT COUNT(*) as count FROM wind_data
      WHERE timestamp < datetime('now', '-${daysToKeep} days')
    `);

    const count = result[0]?.values[0]?.[0] || 0;

    this.db.run(`
      DELETE FROM wind_data
      WHERE timestamp < datetime('now', '-${daysToKeep} days')
    `);

    this.saveToFile();
    console.log(`✓ Cleaned up ${count} old records`);
    return count;
  }

  /**
   * Get data for archiving (last complete hour)
   */
  getDataForArchiving() {
    const result = this.db.exec(`
      SELECT * FROM wind_data
      WHERE timestamp >= datetime('now', '-1 hour', 'start of hour')
        AND timestamp < datetime('now', 'start of hour')
      ORDER BY timestamp ASC
    `);

    if (result.length === 0) return [];

    return result[0].values.map(row => this._rowToObject(result[0].columns, row));
  }

  _rowToObject(columns, values) {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = values[i];
    });
    return obj;
  }

  close() {
    if (this.db) {
      this.saveToFile();
      this.db.close();
      console.log('✓ Working database closed');
    }
  }
}
