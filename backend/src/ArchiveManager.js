import initSqlJs from 'sql.js';
import fs from 'fs';

/**
 * ArchiveManager - manages the archive database for historical wind data
 * Stores hourly aggregated data for long-term storage and statistics
 */
export class ArchiveManager {
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

    // Create hourly_archive table for aggregated data
    this.db.run(`
      CREATE TABLE IF NOT EXISTS hourly_archive (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hour_timestamp DATETIME NOT NULL UNIQUE,
        avg_wind_speed REAL NOT NULL,
        min_wind_speed REAL NOT NULL,
        max_wind_speed REAL NOT NULL,
        avg_wind_gust REAL,
        max_wind_gust REAL,
        avg_wind_direction INTEGER NOT NULL,
        dominant_wind_direction INTEGER,
        avg_temperature REAL,
        avg_humidity REAL,
        avg_pressure REAL,
        measurement_count INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for timestamp queries
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_hourly_archive_timestamp
      ON hourly_archive(hour_timestamp DESC)
    `);

    this.saveToFile();
    console.log('✓ Archive database initialized');
  }

  saveToFile() {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  /**
   * Archive hourly aggregated data
   */
  archiveHourlyData(hourTimestamp, aggregatedData) {
    this.db.run(
      `INSERT OR REPLACE INTO hourly_archive (
        hour_timestamp, avg_wind_speed, min_wind_speed, max_wind_speed,
        avg_wind_gust, max_wind_gust, avg_wind_direction, dominant_wind_direction,
        avg_temperature, avg_humidity, avg_pressure, measurement_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hourTimestamp,
        aggregatedData.avgWindSpeed,
        aggregatedData.minWindSpeed,
        aggregatedData.maxWindSpeed,
        aggregatedData.avgWindGust,
        aggregatedData.maxWindGust,
        aggregatedData.avgWindDirection,
        aggregatedData.dominantWindDirection,
        aggregatedData.avgTemperature,
        aggregatedData.avgHumidity,
        aggregatedData.avgPressure,
        aggregatedData.measurementCount
      ]
    );
    this.saveToFile();
  }

  /**
   * Get archived data for last N days
   */
  getArchivedDataByDays(days = 30) {
    const result = this.db.exec(`
      SELECT * FROM hourly_archive
      WHERE hour_timestamp >= datetime('now', '-${days} days')
      ORDER BY hour_timestamp DESC
    `);

    if (result.length === 0) return [];

    return result[0].values.map(row => this._rowToObject(result[0].columns, row));
  }

  /**
   * Get archived data for specific date range
   */
  getArchivedDataByDateRange(startDate, endDate) {
    const result = this.db.exec(
      `SELECT * FROM hourly_archive
       WHERE hour_timestamp >= ?
         AND hour_timestamp <= ?
       ORDER BY hour_timestamp ASC`,
      [startDate, endDate]
    );

    if (result.length === 0) return [];

    return result[0].values.map(row => this._rowToObject(result[0].columns, row));
  }

  /**
   * Get archived data for specific day (for history gradient display)
   */
  getArchivedDataForDay(date, startHour = 6, endHour = 19) {
    const result = this.db.exec(`
      SELECT * FROM hourly_archive
      WHERE date(hour_timestamp) = date('${date}')
        AND CAST(strftime('%H', hour_timestamp) AS INTEGER) >= ${startHour}
        AND CAST(strftime('%H', hour_timestamp) AS INTEGER) <= ${endHour}
      ORDER BY hour_timestamp ASC
    `);

    if (result.length === 0) return [];

    return result[0].values.map(row => this._rowToObject(result[0].columns, row));
  }

  /**
   * Get statistics for archived data
   */
  getArchiveStatistics(days = 30) {
    const result = this.db.exec(`
      SELECT
        COUNT(*) as hours_recorded,
        AVG(avg_wind_speed) as overall_avg_speed,
        MAX(max_wind_speed) as overall_max_speed,
        MAX(max_wind_gust) as overall_max_gust,
        SUM(measurement_count) as total_measurements
      FROM hourly_archive
      WHERE hour_timestamp >= datetime('now', '-${days} days')
    `);

    if (result.length === 0 || result[0].values.length === 0) return null;

    return this._rowToObject(result[0].columns, result[0].values[0]);
  }

  /**
   * Get wind statistics by hour of day (for pattern analysis)
   */
  getWindPatternByHour(days = 30) {
    const result = this.db.exec(`
      SELECT
        strftime('%H', hour_timestamp) as hour,
        AVG(avg_wind_speed) as avg_speed,
        MAX(max_wind_speed) as max_speed,
        COUNT(*) as days_recorded
      FROM hourly_archive
      WHERE hour_timestamp >= datetime('now', '-${days} days')
      GROUP BY strftime('%H', hour_timestamp)
      ORDER BY hour ASC
    `);

    if (result.length === 0) return [];

    return result[0].values.map(row => this._rowToObject(result[0].columns, row));
  }

  /**
   * Clean up very old archive data (optional, keep unlimited by default)
   */
  cleanupOldArchive(daysToKeep = 365) {
    const result = this.db.exec(`
      SELECT COUNT(*) as count FROM hourly_archive
      WHERE hour_timestamp < datetime('now', '-${daysToKeep} days')
    `);

    const count = result[0]?.values[0]?.[0] || 0;

    if (count > 0) {
      this.db.run(`
        DELETE FROM hourly_archive
        WHERE hour_timestamp < datetime('now', '-${daysToKeep} days')
      `);
      this.saveToFile();
      console.log(`✓ Cleaned up ${count} old archive records`);
    }

    return count;
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
      console.log('✓ Archive database closed');
    }
  }
}
