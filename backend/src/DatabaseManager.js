/**
 * DatabaseManager - manages the working database for real-time wind data
 * Stores detailed measurements with 1-minute granularity
 * Uses PostgreSQL via shared pool
 */
export class DatabaseManager {
  constructor(pgPool) {
    this.pool = pgPool;
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS wind_data (
        id               SERIAL PRIMARY KEY,
        timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        station_id       TEXT NOT NULL DEFAULT 'pak_nam_pran',
        wind_speed_knots DOUBLE PRECISION NOT NULL,
        wind_gust_knots  DOUBLE PRECISION,
        max_gust_knots   DOUBLE PRECISION,
        wind_direction   INTEGER NOT NULL,
        wind_direction_avg INTEGER,
        temperature      DOUBLE PRECISION,
        humidity         DOUBLE PRECISION,
        pressure         DOUBLE PRECISION,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wind_data_timestamp
      ON wind_data(timestamp DESC)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wind_station_ts
      ON wind_data(station_id, timestamp DESC)
    `);

    const { rows } = await this.pool.query('SELECT COUNT(*) as count FROM wind_data');
    const recordCount = rows[0]?.count || 0;
    console.log(`✓ Working database initialized (${recordCount} existing records)`);
  }

  /**
   * Insert new wind measurement
   */
  async insertWindData(data, stationId = 'pak_nam_pran') {
    await this.pool.query(
      `INSERT INTO wind_data (
        timestamp, station_id, wind_speed_knots, wind_gust_knots, max_gust_knots,
        wind_direction, wind_direction_avg, temperature, humidity, pressure
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.timestamp,
        stationId,
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
  }

  /**
   * Get latest wind measurement
   */
  async getLatestData(stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT * FROM wind_data
       WHERE station_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [stationId]
    );
    return rows[0] || null;
  }

  /**
   * Get latest wind measurement from each station
   */
  async getLatestDataAllStations() {
    const { rows } = await this.pool.query(`
      SELECT DISTINCT ON (station_id) *
      FROM wind_data
      ORDER BY station_id, timestamp DESC
    `);
    return rows;
  }

  /**
   * Get wind data for the last N hours
   */
  async getDataByHours(hours = 24, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT * FROM wind_data
       WHERE station_id = $1 AND timestamp >= NOW() - $2::interval
       ORDER BY timestamp DESC`,
      [stationId, `${hours} hours`]
    );
    return rows;
  }

  /**
   * Get last N measurements (for notification stability check)
   */
  async getLastMeasurements(count = 4, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT * FROM wind_data
       WHERE station_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [stationId, count]
    );
    // Return in chronological order (oldest first)
    return rows.reverse();
  }

  /**
   * Get aggregated hourly data for current day (Bangkok timezone)
   */
  async getHourlyAggregateToday(startHour = 6, endHour = 19, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT
        EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Bangkok')::int AS hour,
        AVG(wind_speed_knots) AS avg_speed,
        MAX(wind_gust_knots) AS max_gust,
        AVG(wind_direction) AS avg_direction,
        COUNT(*) AS measurements
      FROM wind_data
      WHERE station_id = $1
        AND (timestamp AT TIME ZONE 'Asia/Bangkok')::date = (NOW() AT TIME ZONE 'Asia/Bangkok')::date
        AND EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Bangkok') >= $2
        AND EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Bangkok') <= $3
      GROUP BY hour
      ORDER BY hour ASC`,
      [stationId, startHour, endHour]
    );

    return rows.map(r => ({
      hour: r.hour.toString().padStart(2, '0'),
      avg_speed: parseFloat(r.avg_speed),
      max_gust: r.max_gust !== null ? parseFloat(r.max_gust) : null,
      avg_direction: parseFloat(r.avg_direction),
      measurements: parseInt(r.measurements)
    }));
  }

  /**
   * Get aggregated data in N-minute intervals for current day (Bangkok timezone)
   * Used for smooth gradient visualization
   */
  async getIntervalAggregateToday(startHour = 6, endHour = 20, intervalMinutes = 5, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT
        EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Bangkok')::int AS hour,
        (EXTRACT(MINUTE FROM timestamp AT TIME ZONE 'Asia/Bangkok')::int / $4) * $4 AS minute,
        AVG(wind_speed_knots) AS avg_speed,
        MAX(wind_gust_knots) AS max_gust,
        AVG(wind_direction) AS avg_direction,
        COUNT(*) AS measurements
      FROM wind_data
      WHERE station_id = $1
        AND (timestamp AT TIME ZONE 'Asia/Bangkok')::date = (NOW() AT TIME ZONE 'Asia/Bangkok')::date
        AND EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Bangkok') >= $2
        AND EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Bangkok') <= $3
      GROUP BY hour, minute
      ORDER BY hour ASC, minute ASC`,
      [stationId, startHour, endHour, intervalMinutes]
    );

    return rows.map(r => {
      const h = parseInt(r.hour);
      const m = parseInt(r.minute);
      return {
        hour: h,
        minute: m,
        time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        avg_speed: parseFloat(r.avg_speed),
        max_gust: r.max_gust !== null ? parseFloat(r.max_gust) : null,
        avg_direction: parseFloat(r.avg_direction),
        measurements: parseInt(r.measurements)
      };
    });
  }

  /**
   * Get wind statistics for the last N hours
   */
  async getStatistics(hours = 24, stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT
        COUNT(*) as count,
        AVG(wind_speed_knots) as avg_speed,
        MIN(wind_speed_knots) as min_speed,
        MAX(wind_speed_knots) as max_speed,
        MAX(wind_gust_knots) as max_gust,
        AVG(wind_direction) as avg_direction
      FROM wind_data
      WHERE station_id = $1 AND timestamp >= NOW() - $2::interval`,
      [stationId, `${hours} hours`]
    );
    return rows[0] || null;
  }

  /**
   * Calculate wind trend (increasing/decreasing)
   * Compares last 30 minutes vs previous 30 minutes (with 5-min interval = 6 records each)
   */
  async calculateTrend(stationId = 'pak_nam_pran') {
    // Get average speed for last 30 minutes (6 records with 5-min interval)
    const currentResult = await this.pool.query(
      `SELECT AVG(wind_speed_knots) as avg_speed, COUNT(*) as count
       FROM (
         SELECT wind_speed_knots
         FROM wind_data
         WHERE station_id = $1
         ORDER BY timestamp DESC
         LIMIT 6
       ) sub`,
      [stationId]
    );

    // Get average speed for 30-60 minutes ago (entries 7-12)
    const previousResult = await this.pool.query(
      `SELECT AVG(wind_speed_knots) as avg_speed, COUNT(*) as count
       FROM (
         SELECT wind_speed_knots
         FROM wind_data
         WHERE station_id = $1
         ORDER BY timestamp DESC
         LIMIT 6 OFFSET 6
       ) sub`,
      [stationId]
    );

    const currentRow = currentResult.rows[0];
    const previousRow = previousResult.rows[0];

    if (!currentRow || !previousRow) {
      console.log(`[Trend] No data`);
      return {
        trend: 'insufficient_data',
        text: 'Недостаточно данных',
        icon: '⏳',
        color: '#808080',
        change: 0,
        percentChange: 0,
        ...(await this.calculateDirectionStability(stationId))
      };
    }

    const currentSpeed = parseFloat(currentRow.avg_speed);
    const currentCount = parseInt(currentRow.count);
    const previousSpeed = parseFloat(previousRow.avg_speed);
    const previousCount = parseInt(previousRow.count);

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
        ...(await this.calculateDirectionStability(stationId))
      };
    }

    if (isNaN(currentSpeed) || isNaN(previousSpeed) || previousSpeed === 0) {
      return {
        trend: 'insufficient_data',
        text: 'Недостаточно данных',
        icon: '⏳',
        color: '#808080',
        change: 0,
        percentChange: 0,
        ...(await this.calculateDirectionStability(stationId))
      };
    }

    const change = currentSpeed - previousSpeed;
    const percentChange = (change / previousSpeed) * 100;

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

    const directionData = await this.calculateDirectionStability();

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
  async calculateDirectionStability(stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT wind_direction FROM (
        SELECT wind_direction FROM wind_data
        WHERE station_id = $1 AND wind_direction IS NOT NULL
        ORDER BY timestamp DESC
        LIMIT 6
      ) sub`,
      [stationId]
    );

    if (rows.length < 3) {
      return {
        directionTrend: 'insufficient_data',
        directionSpread: 0,
        directionIcon: '',
        directionText: ''
      };
    }

    const directions = rows.map(v => v.wind_direction);

    // Circular mean and spread using sin/cos
    let sumSin = 0, sumCos = 0;
    for (const dir of directions) {
      const rad = (dir * Math.PI) / 180;
      sumSin += Math.sin(rad);
      sumCos += Math.cos(rad);
    }
    const meanSin = sumSin / directions.length;
    const meanCos = sumCos / directions.length;
    const R = Math.sqrt(meanSin * meanSin + meanCos * meanCos);
    const spread = Math.round(Math.acos(Math.min(R, 1)) * (180 / Math.PI));

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
  async cleanupOldData(daysToKeep = 7) {
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM wind_data
       WHERE timestamp < NOW() - $1::interval`,
      [`${daysToKeep} days`]
    );
    const count = parseInt(countResult.rows[0]?.count || 0);

    await this.pool.query(
      `DELETE FROM wind_data
       WHERE timestamp < NOW() - $1::interval`,
      [`${daysToKeep} days`]
    );

    console.log(`✓ Cleaned up ${count} old records`);
    return count;
  }

  /**
   * Get data for archiving (last complete hour)
   */
  async getDataForArchiving(stationId = 'pak_nam_pran') {
    const { rows } = await this.pool.query(
      `SELECT * FROM wind_data
       WHERE station_id = $1
         AND timestamp >= date_trunc('hour', NOW() - INTERVAL '1 hour')
         AND timestamp < date_trunc('hour', NOW())
       ORDER BY timestamp ASC`,
      [stationId]
    );
    return rows;
  }

  /**
   * Get total record count (for db-stats endpoint)
   */
  async getTotalCount() {
    const { rows } = await this.pool.query('SELECT COUNT(*) as count FROM wind_data');
    return parseInt(rows[0]?.count || 0);
  }

  /**
   * Get recent timestamps (for db-stats endpoint)
   */
  async getRecentTimestamps(limit = 12) {
    const { rows } = await this.pool.query(
      'SELECT timestamp FROM wind_data ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    return rows.map(r => r.timestamp);
  }
}
