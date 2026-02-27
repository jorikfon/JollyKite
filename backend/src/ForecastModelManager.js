import initSqlJs from 'sql.js';
import fs from 'fs';

/**
 * ForecastModelManager - orchestrates multi-model forecast,
 * stores snapshots, evaluates accuracy, selects best model
 */
export class ForecastModelManager {
  constructor(dbPath, forecastCollector, archiveManager, dbManager) {
    this.dbPath = dbPath;
    this.forecastCollector = forecastCollector;
    this.archiveManager = archiveManager;
    this.dbManager = dbManager;
    this.db = null;
    this.SQL = null;

    this.models = [
      { id: 'best_match',   name: 'GFS Seamless',  baseUrl: 'https://api.open-meteo.com/v1/forecast' },
      { id: 'ecmwf_ifs025', name: 'ECMWF IFS',     baseUrl: 'https://api.open-meteo.com/v1/ecmwf' },
      { id: 'meteofrance',  name: 'Météo-France',   baseUrl: 'https://api.open-meteo.com/v1/meteofrance' },
      { id: 'gfs_global',   name: 'GFS',            baseUrl: 'https://api.open-meteo.com/v1/gfs' },
      { id: 'gem_global',   name: 'GEM',            baseUrl: 'https://api.open-meteo.com/v1/gem' },
    ];
  }

  async initialize() {
    this.SQL = await initSqlJs();

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

    this.db.run(`
      CREATE TABLE IF NOT EXISTS forecast_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_time DATETIME NOT NULL,
        model_id TEXT NOT NULL,
        target_date TEXT NOT NULL,
        target_hour INTEGER NOT NULL,
        speed REAL NOT NULL,
        gust REAL NOT NULL,
        direction INTEGER NOT NULL
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_snap_lookup
      ON forecast_snapshots(model_id, target_date, target_hour)
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS model_accuracy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id TEXT NOT NULL,
        eval_date TEXT NOT NULL,
        target_hour INTEGER NOT NULL,
        actual_speed REAL,
        actual_direction INTEGER,
        forecast_speed REAL,
        forecast_direction INTEGER,
        speed_error REAL,
        direction_error REAL,
        UNIQUE(model_id, eval_date, target_hour)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS model_scores (
        model_id TEXT PRIMARY KEY,
        rmse_speed REAL,
        mae_speed REAL,
        rmse_direction REAL,
        mae_direction REAL,
        correlation_speed REAL,
        correction_factor REAL DEFAULT 1.0,
        eval_count INTEGER DEFAULT 0,
        score REAL DEFAULT 0.0,
        last_updated DATETIME
      )
    `);

    // Initialize model_scores rows if missing
    for (const model of this.models) {
      this.db.run(
        `INSERT OR IGNORE INTO model_scores (model_id, last_updated) VALUES (?, datetime('now'))`,
        [model.id]
      );
    }

    this.saveToFile();
    console.log('✓ ForecastModelManager initialized');
  }

  saveToFile() {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
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

          this.db.run(
            `INSERT INTO forecast_snapshots (snapshot_time, model_id, target_date, target_hour, speed, gust, direction)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

    this.saveToFile();
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

    for (const model of this.models) {
      let totalEvaluated = 0;

      // Evaluate last 14 days
      for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
        const evalDate = new Date(bangkokNow);
        evalDate.setDate(evalDate.getDate() - daysAgo);
        const dateStr = evalDate.toLocaleDateString('en-CA');

        // Get actual archived data for this day
        const actualData = this.archiveManager.getArchivedDataForDay(dateStr, 6, 19);
        if (!actualData || actualData.length === 0) continue;

        for (const actual of actualData) {
          const hourTimestamp = new Date(actual.hour_timestamp);
          const targetHour = parseInt(
            hourTimestamp.toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false })
          );

          // Find the closest snapshot taken BEFORE this hour
          const snapshotResult = this.db.exec(
            `SELECT speed, direction FROM forecast_snapshots
             WHERE model_id = ? AND target_date = ? AND target_hour = ?
               AND snapshot_time < ?
             ORDER BY snapshot_time DESC LIMIT 1`,
            [model.id, dateStr, targetHour, hourTimestamp.toISOString()]
          );

          if (snapshotResult.length === 0 || snapshotResult[0].values.length === 0) continue;

          const [forecastSpeed, forecastDirection] = snapshotResult[0].values[0];
          const actualSpeed = actual.avg_wind_speed;
          const actualDirection = actual.avg_wind_direction;

          const speedError = Math.abs(forecastSpeed - actualSpeed);
          const dirDiff = Math.abs(forecastDirection - actualDirection);
          const directionError = Math.min(dirDiff, 360 - dirDiff);

          this.db.run(
            `INSERT OR REPLACE INTO model_accuracy
             (model_id, eval_date, target_hour, actual_speed, actual_direction,
              forecast_speed, forecast_direction, speed_error, direction_error)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [model.id, dateStr, targetHour, actualSpeed, actualDirection,
             forecastSpeed, forecastDirection, speedError, directionError]
          );
          totalEvaluated++;
        }
      }

      console.log(`  📊 ${model.name}: ${totalEvaluated} hours evaluated`);
    }

    // Recalculate aggregate scores
    this._recalculateScores();
    this.saveToFile();
    console.log('📊 Accuracy evaluation complete');
  }

  /**
   * Recalculate aggregate model scores from model_accuracy data
   */
  _recalculateScores() {
    const modelStats = {};

    for (const model of this.models) {
      const result = this.db.exec(
        `SELECT actual_speed, forecast_speed, actual_direction, forecast_direction,
                speed_error, direction_error
         FROM model_accuracy WHERE model_id = ?`,
        [model.id]
      );

      if (result.length === 0 || result[0].values.length === 0) continue;

      const rows = result[0].values;
      const speedErrors = rows.map(r => r[4]);
      const dirErrors = rows.map(r => r[5]);
      const actualSpeeds = rows.map(r => r[0]);
      const forecastSpeeds = rows.map(r => r[1]);

      const n = rows.length;
      const rmseSpeed = Math.sqrt(speedErrors.reduce((s, e) => s + e * e, 0) / n);
      const maeSpeed = speedErrors.reduce((s, e) => s + e, 0) / n;
      const rmseDirection = Math.sqrt(dirErrors.reduce((s, e) => s + e * e, 0) / n);
      const maeDirection = dirErrors.reduce((s, e) => s + e, 0) / n;

      // Pearson correlation
      const correlation = this._pearsonCorrelation(actualSpeeds, forecastSpeeds);

      // Correction factor: mean(actual/forecast) where ratio in [0.5, 2.0]
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

      this.db.run(
        `UPDATE model_scores SET
           rmse_speed = ?, mae_speed = ?, rmse_direction = ?, mae_direction = ?,
           correlation_speed = ?, correction_factor = ?, eval_count = ?,
           score = ?, last_updated = datetime('now')
         WHERE model_id = ?`,
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
  getBestModel() {
    const result = this.db.exec(
      `SELECT model_id FROM model_scores
       WHERE eval_count >= 10
       ORDER BY score ASC LIMIT 1`
    );

    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0];
    }

    return 'best_match'; // default fallback
  }

  /**
   * Get correction factor for a specific model
   */
  getCorrectionFactor(modelId) {
    const result = this.db.exec(
      `SELECT correction_factor FROM model_scores WHERE model_id = ?`,
      [modelId]
    );

    if (result.length > 0 && result[0].values.length > 0) {
      const factor = result[0].values[0][0];
      return factor || 1.0;
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
  getModelAccuracyMetrics() {
    const result = this.db.exec(
      `SELECT model_id, rmse_speed, mae_speed, rmse_direction, mae_direction,
              correlation_speed, correction_factor, eval_count, score, last_updated
       FROM model_scores ORDER BY score ASC`
    );

    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const cols = result[0].columns;
      const obj = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }

  /**
   * Clean up old snapshots and accuracy data
   */
  cleanupOldSnapshots(daysToKeep = 14) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    const cutoffStr = cutoff.toISOString();

    const snapResult = this.db.exec(
      `SELECT COUNT(*) FROM forecast_snapshots WHERE snapshot_time < ?`, [cutoffStr]
    );
    const snapCount = snapResult[0]?.values[0]?.[0] || 0;

    this.db.run(`DELETE FROM forecast_snapshots WHERE snapshot_time < ?`, [cutoffStr]);

    const cutoffDate = cutoff.toLocaleDateString('en-CA');
    const accResult = this.db.exec(
      `SELECT COUNT(*) FROM model_accuracy WHERE eval_date < ?`, [cutoffDate]
    );
    const accCount = accResult[0]?.values[0]?.[0] || 0;

    this.db.run(`DELETE FROM model_accuracy WHERE eval_date < ?`, [cutoffDate]);

    this.saveToFile();

    if (snapCount > 0 || accCount > 0) {
      console.log(`✓ Cleaned up ${snapCount} snapshots and ${accCount} accuracy records`);
    }

    return { snapshots: snapCount, accuracy: accCount };
  }

  close() {
    if (this.db) {
      this.saveToFile();
      this.db.close();
      console.log('✓ ForecastModelManager database closed');
    }
  }
}
