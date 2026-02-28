/**
 * ForecastModelManager - orchestrates multi-model forecast,
 * stores snapshots, evaluates accuracy, selects best model
 * Uses PostgreSQL via shared pool
 */
export class ForecastModelManager {
  constructor(pgPool, forecastCollector, archiveManager, dbManager) {
    this.pool = pgPool;
    this.forecastCollector = forecastCollector;
    this.archiveManager = archiveManager;
    this.dbManager = dbManager;

    this.models = [
      { id: 'best_match',   name: 'GFS Seamless',  baseUrl: 'https://api.open-meteo.com/v1/forecast' },
      { id: 'ecmwf_ifs025', name: 'ECMWF IFS',     baseUrl: 'https://api.open-meteo.com/v1/ecmwf' },
      { id: 'meteofrance',  name: 'Météo-France',   baseUrl: 'https://api.open-meteo.com/v1/meteofrance' },
      { id: 'gfs_global',   name: 'GFS',            baseUrl: 'https://api.open-meteo.com/v1/gfs' },
      { id: 'gem_global',   name: 'GEM',            baseUrl: 'https://api.open-meteo.com/v1/gem' },
    ];
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS forecast_snapshots (
        id            SERIAL PRIMARY KEY,
        snapshot_time TIMESTAMPTZ NOT NULL,
        model_id      TEXT NOT NULL,
        target_date   DATE NOT NULL,
        target_hour   INTEGER NOT NULL,
        speed         DOUBLE PRECISION NOT NULL,
        gust          DOUBLE PRECISION NOT NULL,
        direction     INTEGER NOT NULL
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_snap_lookup
      ON forecast_snapshots(model_id, target_date, target_hour)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_snap_time
      ON forecast_snapshots(snapshot_time)
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS model_accuracy (
        id                 SERIAL PRIMARY KEY,
        model_id           TEXT NOT NULL,
        eval_date          DATE NOT NULL,
        target_hour        INTEGER NOT NULL,
        actual_speed       DOUBLE PRECISION,
        actual_direction   INTEGER,
        forecast_speed     DOUBLE PRECISION,
        forecast_direction INTEGER,
        speed_error        DOUBLE PRECISION,
        direction_error    DOUBLE PRECISION,
        UNIQUE(model_id, eval_date, target_hour)
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS model_scores (
        model_id          TEXT PRIMARY KEY,
        rmse_speed        DOUBLE PRECISION,
        mae_speed         DOUBLE PRECISION,
        rmse_direction    DOUBLE PRECISION,
        mae_direction     DOUBLE PRECISION,
        correlation_speed DOUBLE PRECISION,
        correction_factor DOUBLE PRECISION DEFAULT 1.0,
        eval_count        INTEGER DEFAULT 0,
        score             DOUBLE PRECISION DEFAULT 0.0,
        last_updated      TIMESTAMPTZ
      )
    `);

    // Initialize model_scores rows if missing
    for (const model of this.models) {
      await this.pool.query(
        `INSERT INTO model_scores (model_id, last_updated)
         VALUES ($1, NOW())
         ON CONFLICT (model_id) DO NOTHING`,
        [model.id]
      );
    }

    console.log('✓ ForecastModelManager initialized');
  }

  /**
   * Save forecast snapshots for all models (called every 3 hours by cron)
   */
  async saveForcastSnapshots() {
    const snapshotTime = new Date().toISOString();
    console.log(`📸 Saving forecast snapshots for ${this.models.length} models...`);

    const results = await Promise.allSettled(
      this.models.map(async (model) => {
        const forecast = await this.forecastCollector.fetchWindForecast(model.baseUrl);
        return { model, forecast };
      })
    );

    let savedCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { model, forecast } = result.value;
        for (const entry of forecast) {
          const dt = new Date(entry.date);
          const targetDate = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
          const targetHour = dt.getHours();

          await this.pool.query(
            `INSERT INTO forecast_snapshots (snapshot_time, model_id, target_date, target_hour, speed, gust, direction)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [snapshotTime, model.id, targetDate, targetHour, entry.speed, entry.gust, entry.direction]
          );
        }
        savedCount++;
        console.log(`  ✓ ${model.name}: ${forecast.length} hours saved`);
      } else {
        const modelId = this.models[results.indexOf(result)]?.name || 'unknown';
        console.warn(`  ⚠ ${modelId}: ${result.reason?.message || 'failed'}`);
      }
    }

    console.log(`📸 Snapshots saved: ${savedCount}/${this.models.length} models`);
    return savedCount;
  }

  /**
   * Evaluate forecast accuracy against actual archive data (called daily at 20:00)
   */
  async evaluateAccuracy() {
    console.log('📊 Evaluating forecast model accuracy...');

    const now = new Date();
    const bangkokNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));

    const client = await this.pool.getClient();
    try {
      await client.query('BEGIN');

      for (const model of this.models) {
        let totalEvaluated = 0;

        // Evaluate last 14 days
        for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
          const evalDate = new Date(bangkokNow);
          evalDate.setDate(evalDate.getDate() - daysAgo);
          const dateStr = evalDate.toLocaleDateString('en-CA');

          // Get actual archived data for this day
          const actualData = await this.archiveManager.getArchivedDataForDay(dateStr, 6, 19);
          if (!actualData || actualData.length === 0) continue;

          for (const actual of actualData) {
            const hourTimestamp = new Date(actual.hour_timestamp);
            const targetHour = parseInt(
              hourTimestamp.toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false })
            );

            // Find the closest snapshot taken BEFORE this hour
            const snapshotResult = await client.query(
              `SELECT speed, direction FROM forecast_snapshots
               WHERE model_id = $1 AND target_date = $2 AND target_hour = $3
                 AND snapshot_time < $4
               ORDER BY snapshot_time DESC LIMIT 1`,
              [model.id, dateStr, targetHour, hourTimestamp.toISOString()]
            );

            if (snapshotResult.rows.length === 0) continue;

            const { speed: forecastSpeed, direction: forecastDirection } = snapshotResult.rows[0];
            const actualSpeed = actual.avg_wind_speed;
            const actualDirection = actual.avg_wind_direction;

            const speedError = Math.abs(forecastSpeed - actualSpeed);
            const dirDiff = Math.abs(forecastDirection - actualDirection);
            const directionError = Math.min(dirDiff, 360 - dirDiff);

            await client.query(
              `INSERT INTO model_accuracy
               (model_id, eval_date, target_hour, actual_speed, actual_direction,
                forecast_speed, forecast_direction, speed_error, direction_error)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (model_id, eval_date, target_hour) DO UPDATE SET
                 actual_speed = EXCLUDED.actual_speed,
                 actual_direction = EXCLUDED.actual_direction,
                 forecast_speed = EXCLUDED.forecast_speed,
                 forecast_direction = EXCLUDED.forecast_direction,
                 speed_error = EXCLUDED.speed_error,
                 direction_error = EXCLUDED.direction_error`,
              [model.id, dateStr, targetHour, actualSpeed, actualDirection,
               forecastSpeed, forecastDirection, speedError, directionError]
            );
            totalEvaluated++;
          }
        }

        console.log(`  📊 ${model.name}: ${totalEvaluated} hours evaluated`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Recalculate aggregate scores
    await this._recalculateScores();
    console.log('📊 Accuracy evaluation complete');
  }

  /**
   * Recalculate aggregate model scores from model_accuracy data
   */
  async _recalculateScores() {
    const modelStats = {};

    for (const model of this.models) {
      const { rows } = await this.pool.query(
        `SELECT actual_speed, forecast_speed, actual_direction, forecast_direction,
                speed_error, direction_error
         FROM model_accuracy WHERE model_id = $1`,
        [model.id]
      );

      if (rows.length === 0) continue;

      const speedErrors = rows.map(r => parseFloat(r.speed_error));
      const dirErrors = rows.map(r => parseFloat(r.direction_error));
      const actualSpeeds = rows.map(r => parseFloat(r.actual_speed));
      const forecastSpeeds = rows.map(r => parseFloat(r.forecast_speed));

      const n = rows.length;
      const rmseSpeed = Math.sqrt(speedErrors.reduce((s, e) => s + e * e, 0) / n);
      const maeSpeed = speedErrors.reduce((s, e) => s + e, 0) / n;
      const rmseDirection = Math.sqrt(dirErrors.reduce((s, e) => s + e * e, 0) / n);
      const maeDirection = dirErrors.reduce((s, e) => s + e, 0) / n;

      const correlation = this._pearsonCorrelation(actualSpeeds, forecastSpeeds);

      const ratios = [];
      for (let i = 0; i < n; i++) {
        if (forecastSpeeds[i] > 0) {
          const ratio = actualSpeeds[i] / forecastSpeeds[i];
          if (ratio >= 0.5 && ratio <= 2.0) {
            ratios.push(ratio);
          }
        }
      }
      const correctionFactor = ratios.length > 0
        ? ratios.reduce((s, r) => s + r, 0) / ratios.length
        : 1.0;

      modelStats[model.id] = { rmseSpeed, maeSpeed, rmseDirection, maeDirection, correlation, correctionFactor, evalCount: n };
    }

    // Normalize and compute composite score
    const allRmse = Object.values(modelStats).map(s => s.rmseSpeed);
    const allMae = Object.values(modelStats).map(s => s.maeSpeed);
    const maxRmse = Math.max(...allRmse, 1);
    const maxMae = Math.max(...allMae, 1);

    for (const [modelId, stats] of Object.entries(modelStats)) {
      const normRmse = stats.rmseSpeed / maxRmse;
      const normMae = stats.maeSpeed / maxMae;
      const corrPenalty = 1 - (stats.correlation || 0);
      const score = 0.5 * normRmse + 0.3 * normMae + 0.2 * corrPenalty;

      await this.pool.query(
        `UPDATE model_scores SET
           rmse_speed = $1, mae_speed = $2, rmse_direction = $3, mae_direction = $4,
           correlation_speed = $5, correction_factor = $6, eval_count = $7,
           score = $8, last_updated = NOW()
         WHERE model_id = $9`,
        [stats.rmseSpeed, stats.maeSpeed, stats.rmseDirection, stats.maeDirection,
         stats.correlation, stats.correctionFactor, stats.evalCount,
         score, modelId]
      );
    }
  }

  /**
   * Pearson correlation coefficient
   */
  _pearsonCorrelation(x, y) {
    const n = x.length;
    if (n < 2) return 0;

    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;

    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      sumXY += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }

    const denom = Math.sqrt(sumX2 * sumY2);
    return denom === 0 ? 0 : sumXY / denom;
  }

  /**
   * Get the best performing model ID
   */
  async getBestModel() {
    const { rows } = await this.pool.query(
      `SELECT model_id FROM model_scores
       WHERE eval_count >= 10
       ORDER BY score ASC LIMIT 1`
    );

    if (rows.length > 0) {
      return rows[0].model_id;
    }

    return 'best_match'; // default fallback
  }

  /**
   * Get correction factor for a specific model
   */
  async getCorrectionFactor(modelId) {
    const { rows } = await this.pool.query(
      `SELECT correction_factor FROM model_scores WHERE model_id = $1`,
      [modelId]
    );

    if (rows.length > 0) {
      return rows[0].correction_factor || 1.0;
    }

    return 1.0;
  }

  /**
   * Fetch forecasts from all models in parallel
   */
  async fetchAllModelForecasts() {
    const forecasts = {};

    const results = await Promise.allSettled(
      this.models.map(async (model) => {
        const forecast = await this.forecastCollector.fetchWindForecast(model.baseUrl);
        return { id: model.id, forecast };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        forecasts[result.value.id] = result.value.forecast;
      }
    }

    return forecasts;
  }

  /**
   * Get accuracy metrics for all models
   */
  async getModelAccuracyMetrics() {
    const { rows } = await this.pool.query(
      `SELECT model_id, rmse_speed, mae_speed, rmse_direction, mae_direction,
              correlation_speed, correction_factor, eval_count, score, last_updated
       FROM model_scores ORDER BY score ASC`
    );
    return rows;
  }

  /**
   * Clean up old snapshots and accuracy data
   */
  async cleanupOldSnapshots(daysToKeep = 14) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    const cutoffStr = cutoff.toISOString();
    const cutoffDate = cutoff.toLocaleDateString('en-CA');

    const snapResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM forecast_snapshots WHERE snapshot_time < $1`, [cutoffStr]
    );
    const snapCount = parseInt(snapResult.rows[0]?.count || 0);

    await this.pool.query(`DELETE FROM forecast_snapshots WHERE snapshot_time < $1`, [cutoffStr]);

    const accResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM model_accuracy WHERE eval_date < $1`, [cutoffDate]
    );
    const accCount = parseInt(accResult.rows[0]?.count || 0);

    await this.pool.query(`DELETE FROM model_accuracy WHERE eval_date < $1`, [cutoffDate]);

    if (snapCount > 0 || accCount > 0) {
      console.log(`✓ Cleaned up ${snapCount} snapshots and ${accCount} accuracy records`);
    }

    return { snapshots: snapCount, accuracy: accCount };
  }
}
