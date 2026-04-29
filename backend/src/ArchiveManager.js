/**
 * ArchiveManager - manages the archive database for historical wind data
 * Stores hourly aggregated data for long-term storage and statistics
 * Uses PostgreSQL via shared pool
 */
export class ArchiveManager {
  constructor(pgPool) {
    this.pool = pgPool;
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS hourly_archive (
        id                      SERIAL PRIMARY KEY,
        hour_timestamp          TIMESTAMPTZ NOT NULL,
        station_id              TEXT NOT NULL DEFAULT 'pak_nam_pran',
        avg_wind_speed          DOUBLE PRECISION NOT NULL,
        min_wind_speed          DOUBLE PRECISION NOT NULL,
        max_wind_speed          DOUBLE PRECISION NOT NULL,
        avg_wind_gust           DOUBLE PRECISION,
        max_wind_gust           DOUBLE PRECISION,
        avg_wind_direction      INTEGER NOT NULL,
        dominant_wind_direction  INTEGER,
        avg_temperature         DOUBLE PRECISION,
        avg_humidity            DOUBLE PRECISION,
        avg_pressure            DOUBLE PRECISION,
        measurement_count       INTEGER NOT NULL,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(station_id, hour_timestamp)
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hourly_archive_timestamp
      ON hourly_archive(hour_timestamp DESC)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_archive_station_ts
      ON hourly_archive(station_id, hour_timestamp DESC)
    `);

    console.log('✓ Archive database initialized');
  }

  /**
   * Archive hourly aggregated data
   */
  async archiveHourlyData(hourTimestamp, aggregatedData, stationId = 'pak_nam_pran') {
    await this.pool.query(
      `INSERT INTO hourly_archive (
        hour_timestamp, station_id, avg_wind_speed, min_wind_speed, max_wind_speed,
        avg_wind_gust, max_wind_gust, avg_wind_direction, dominant_wind_direction,
        avg_temperature, avg_humidity, avg_pressure, measurement_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (station_id, hour_timestamp) DO UPDATE SET
        avg_wind_speed = EXCLUDED.avg_wind_speed,
        min_wind_speed = EXCLUDED.min_wind_speed,
        max_wind_speed = EXCLUDED.max_wind_speed,
        avg_wind_gust = EXCLUDED.avg_wind_gust,
        max_wind_gust = EXCLUDED.max_wind_gust,
        avg_wind_direction = EXCLUDED.avg_wind_direction,
        dominant_wind_direction = EXCLUDED.dominant_wind_direction,
        avg_temperature = EXCLUDED.avg_temperature,
        avg_humidity = EXCLUDED.avg_humidity,
        avg_pressure = EXCLUDED.avg_pressure,
        measurement_count = EXCLUDED.measurement_count`,
      [
        hourTimestamp,
        stationId,
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
  }

  /**
   * Get archived data for last N days
   */
  async getArchivedDataByDays(days = 30, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT * FROM hourly_archive
       WHERE station_id = $1 AND hour_timestamp >= NOW() - $2::interval
       ORDER BY hour_timestamp DESC`,
      [stationId, `${days} days`]
    );
    return rows;
  }

  /**
   * Get archived data for specific date range
   */
  async getArchivedDataByDateRange(startDate, endDate, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT * FROM hourly_archive
       WHERE station_id = $1
         AND hour_timestamp >= $2
         AND hour_timestamp <= $3
       ORDER BY hour_timestamp ASC`,
      [stationId, startDate, endDate]
    );
    return rows;
  }

  /**
   * Get archived data for specific day (for history gradient display)
   */
  async getArchivedDataForDay(date, startHour = 6, endHour = 19, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT * FROM hourly_archive
       WHERE station_id = $1
         AND hour_timestamp::date = $2::date
         AND EXTRACT(HOUR FROM hour_timestamp AT TIME ZONE 'Asia/Bangkok') >= $3
         AND EXTRACT(HOUR FROM hour_timestamp AT TIME ZONE 'Asia/Bangkok') <= $4
       ORDER BY hour_timestamp ASC`,
      [stationId, date, startHour, endHour]
    );
    return rows;
  }

  /**
   * Get statistics for archived data
   */
  async getArchiveStatistics(days = 30, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT
        COUNT(*) as hours_recorded,
        AVG(avg_wind_speed) as overall_avg_speed,
        MAX(max_wind_speed) as overall_max_speed,
        MAX(max_wind_gust) as overall_max_gust,
        SUM(measurement_count) as total_measurements
      FROM hourly_archive
      WHERE station_id = $1 AND hour_timestamp >= NOW() - $2::interval`,
      [stationId, `${days} days`]
    );
    return rows[0] || null;
  }

  /**
   * Get wind statistics by hour of day (for pattern analysis)
   */
  async getWindPatternByHour(days = 30, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT
        LPAD(EXTRACT(HOUR FROM hour_timestamp AT TIME ZONE 'Asia/Bangkok')::int::text, 2, '0') as hour,
        AVG(avg_wind_speed) as avg_speed,
        MAX(max_wind_speed) as max_speed,
        COUNT(*) as days_recorded
      FROM hourly_archive
      WHERE station_id = $1 AND hour_timestamp >= NOW() - $2::interval
      GROUP BY EXTRACT(HOUR FROM hour_timestamp AT TIME ZONE 'Asia/Bangkok')
      ORDER BY hour ASC`,
      [stationId, `${days} days`]
    );
    return rows;
  }

  /**
   * Get hourly rows for the last N months in Bangkok time.
   * Returns minimal columns for rideable-day computation.
   */
  async getHourlyRowsForMonths(months = 12, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT
         hour_timestamp,
         avg_wind_speed,
         max_wind_speed
       FROM hourly_archive
       WHERE station_id = $1
         AND hour_timestamp >= NOW() - $2::interval
       ORDER BY hour_timestamp ASC`,
      [stationId, `${months} months`]
    );
    return rows;
  }

  /**
   * Compute monthly statistics on "rideable days" for a given sport.
   *
   * A day is considered rideable if during working hours (6:00–19:00 Bangkok)
   * it had at least `minHours` hours with avg_wind_speed within
   * [minWind, maxWind] (knots).
   *
   * Direction is intentionally NOT checked here — station calibration is
   * unreliable for some sensors and offshore-vs-onshore can be misleading
   * for historical aggregates.
   *
   * @param {Object} opts
   * @param {number} opts.months       - number of past months to scan (default 12)
   * @param {number} opts.minWind      - min wind speed in knots
   * @param {number} opts.maxWind      - max wind speed in knots
   * @param {number} [opts.minHours=2] - min hours of suitable wind in a day
   * @param {string} [opts.stationId='pak_nam_pran']
   * @returns {Promise<Array>} months in chronological order, each with
   *   { month: 'YYYY-MM', rideableDays, totalDays, totalRideableHours, bestDay }
   */
  async getMonthlyRideableStats({
    months = 12,
    minWind,
    maxWind,
    minHours = 2,
    workStartHour = 6,
    workEndHour = 19,
    stationId = 'pak_nam_pran'
  }) {
    const rows = await this.getHourlyRowsForMonths(months, stationId);

    // Bucket by Bangkok-local date
    const bangkokFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const bangkokHourFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      hour: 'numeric',
      hour12: false
    });

    const days = new Map(); // dateKey -> { rideableHours, anyHours }

    for (const row of rows) {
      const ts = new Date(row.hour_timestamp);
      const hour = parseInt(bangkokHourFmt.format(ts), 10);
      // Working hours 6:00–19:00 inclusive of 18:xx, so hour 6..18
      if (hour < workStartHour || hour >= workEndHour) continue;

      const dateKey = bangkokFmt.format(ts); // YYYY-MM-DD
      let entry = days.get(dateKey);
      if (!entry) {
        entry = { rideableHours: 0, anyHours: 0 };
        days.set(dateKey, entry);
      }
      entry.anyHours += 1;

      const speed = parseFloat(row.avg_wind_speed);
      if (!isFinite(speed)) continue;
      if (speed < minWind || speed > maxWind) continue;

      entry.rideableHours += 1;
    }

    // Bucket days by month (YYYY-MM)
    const monthsMap = new Map();
    for (const [dateKey, info] of days.entries()) {
      const monthKey = dateKey.slice(0, 7);
      let m = monthsMap.get(monthKey);
      if (!m) {
        m = {
          month: monthKey,
          totalDays: 0,
          rideableDays: 0,
          totalRideableHours: 0,
          bestDay: null
        };
        monthsMap.set(monthKey, m);
      }
      m.totalDays += 1;
      m.totalRideableHours += info.rideableHours;
      if (info.rideableHours >= minHours) {
        m.rideableDays += 1;
      }
      if (!m.bestDay || info.rideableHours > m.bestDay.hours) {
        m.bestDay = { date: dateKey, hours: info.rideableHours };
      }
    }

    // Build chronological list of last N months, including empty months
    const result = [];
    const now = new Date();
    const bkkParts = bangkokFmt.format(now).split('-'); // YYYY, MM, DD
    let year = parseInt(bkkParts[0], 10);
    let month = parseInt(bkkParts[1], 10); // 1..12

    for (let i = 0; i < months; i++) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const m = monthsMap.get(key);
      result.push(m || {
        month: key,
        totalDays: 0,
        rideableDays: 0,
        totalRideableHours: 0,
        bestDay: null
      });
      month -= 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }

    // Reverse so oldest first
    result.reverse();
    return result;
  }

  /**
   * Clean up very old archive data (optional, keep unlimited by default)
   */
  async cleanupOldArchive(daysToKeep = 365) {
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM hourly_archive
       WHERE hour_timestamp < NOW() - $1::interval`,
      [`${daysToKeep} days`]
    );
    const count = parseInt(countResult.rows[0]?.count || 0);

    if (count > 0) {
      await this.pool.query(
        `DELETE FROM hourly_archive
         WHERE hour_timestamp < NOW() - $1::interval`,
        [`${daysToKeep} days`]
      );
      console.log(`✓ Cleaned up ${count} old archive records`);
    }

    return count;
  }
}
