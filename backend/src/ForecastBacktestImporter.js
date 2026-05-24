import { fetch } from 'undici';

/**
 * ForecastBacktestImporter — pulls historical model forecasts from the public
 * historical-forecast-api.open-meteo.com endpoint (forecasts that the models
 * actually produced at the time, ~2 years back) and joins them against
 * `hourly_archive` actuals to compute per-model error metrics.
 *
 * Storage: forecast_backtest(model_id, target_date, target_hour Bangkok,
 * forecast_*, actual_*, *_error). Unique on (model_id, target_date, target_hour).
 */

const HIST_URL = 'https://historical-forecast-api.open-meteo.com/v1/forecast';
const LAT = 12.3466;
const LON = 99.9982;
const TZ = 'Asia/Bangkok';
const WORK_START = 6;
const WORK_END = 19;    // inclusive: hours 6..19
const CHUNK_DAYS = 90;  // request size per API call

export class ForecastBacktestImporter {
  constructor(pgPool, models, dispatcher = null) {
    this.pool = pgPool;
    this.models = models || [];
    this.dispatcher = dispatcher;
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS forecast_backtest (
        id SERIAL PRIMARY KEY,
        model_id           TEXT NOT NULL,
        target_date        DATE NOT NULL,
        target_hour        INTEGER NOT NULL,
        forecast_speed     DOUBLE PRECISION NOT NULL,
        forecast_direction INTEGER NOT NULL,
        forecast_gust      DOUBLE PRECISION,
        actual_speed       DOUBLE PRECISION,
        actual_direction   INTEGER,
        speed_error        DOUBLE PRECISION,
        direction_error    DOUBLE PRECISION,
        UNIQUE(model_id, target_date, target_hour)
      )
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_model_date
      ON forecast_backtest(model_id, target_date)
    `);
    console.log('✓ ForecastBacktestImporter initialized');
  }

  _addDays(d, n) {
    const r = new Date(d);
    r.setUTCDate(r.getUTCDate() + n);
    return r;
  }

  _iso(d) {
    return d.toISOString().slice(0, 10);
  }

  async _fetchChunk(modelId, fromIso, toIso) {
    const url = `${HIST_URL}?latitude=${LAT}&longitude=${LON}`
      + `&start_date=${fromIso}&end_date=${toIso}`
      + `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m`
      + `&timezone=${encodeURIComponent(TZ)}`
      + `&wind_speed_unit=kn`
      + `&models=${encodeURIComponent(modelId)}`;

    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://jollykite.com/'
      }
    };
    if (this.dispatcher) opts.dispatcher = this.dispatcher;

    const res = await fetch(url, opts);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from historical-forecast-api: ${await res.text().catch(() => '')}`);
    }
    return res.json();
  }

  /**
   * Insert forecast rows for one model and date range; populate actuals/errors
   * via JOIN after the inserts.
   */
  async importModel(modelId, fromMs, toMs) {
    const startedAt = Date.now();
    let inserted = 0;
    let chunks = 0;

    let cursor = new Date(fromMs);
    const end = new Date(toMs);
    while (cursor < end) {
      const chunkEnd = new Date(Math.min(this._addDays(cursor, CHUNK_DAYS).getTime() - 1, end.getTime()));
      const fromIso = this._iso(cursor);
      const toIso = this._iso(chunkEnd);

      const json = await this._fetchChunk(modelId, fromIso, toIso);
      chunks++;

      const hourly = json?.hourly;
      if (!hourly?.time?.length) {
        cursor = this._addDays(chunkEnd, 1);
        continue;
      }

      const times = hourly.time;
      const speeds = hourly.wind_speed_10m || [];
      const dirs = hourly.wind_direction_10m || [];
      const gusts = hourly.wind_gusts_10m || [];

      const rows = [];
      for (let i = 0; i < times.length; i++) {
        // time is local Bangkok ISO without zone, e.g. "2025-01-15T06:00"
        const t = times[i];
        const date = t.slice(0, 10);
        const hour = parseInt(t.slice(11, 13), 10);
        if (hour < WORK_START || hour > WORK_END) continue;

        const speed = speeds[i];
        const direction = dirs[i];
        const gust = gusts[i];
        if (speed == null || direction == null) continue;

        rows.push([modelId, date, hour, speed, Math.round(direction), gust ?? null]);
      }

      if (rows.length > 0) {
        // Bulk insert using UNNEST
        const ms = rows.map(r => r[0]);
        const dates = rows.map(r => r[1]);
        const hours = rows.map(r => r[2]);
        const fs = rows.map(r => r[3]);
        const fd = rows.map(r => r[4]);
        const fg = rows.map(r => r[5]);

        const result = await this.pool.query(
          `INSERT INTO forecast_backtest
             (model_id, target_date, target_hour, forecast_speed, forecast_direction, forecast_gust)
           SELECT * FROM UNNEST(
             $1::text[], $2::date[], $3::int[], $4::float8[], $5::int[], $6::float8[]
           )
           ON CONFLICT (model_id, target_date, target_hour) DO UPDATE SET
             forecast_speed = EXCLUDED.forecast_speed,
             forecast_direction = EXCLUDED.forecast_direction,
             forecast_gust = EXCLUDED.forecast_gust`,
          [ms, dates, hours, fs, fd, fg]
        );
        inserted += result.rowCount || rows.length;
      }

      cursor = this._addDays(chunkEnd, 1);
    }

    // Join with actuals + compute errors for the freshly-imported range.
    const fromIso = this._iso(new Date(fromMs));
    const toIso = this._iso(new Date(toMs));
    const updated = await this.pool.query(
      `UPDATE forecast_backtest fb
         SET actual_speed = a.actual_speed,
             actual_direction = a.actual_direction,
             speed_error = ABS(fb.forecast_speed - a.actual_speed),
             direction_error = LEAST(
               ABS(fb.forecast_direction - a.actual_direction),
               360 - ABS(fb.forecast_direction - a.actual_direction)
             )
       FROM (
         SELECT
           (hour_timestamp AT TIME ZONE 'Asia/Bangkok')::date AS d,
           EXTRACT(HOUR FROM hour_timestamp AT TIME ZONE 'Asia/Bangkok')::int AS h,
           avg_wind_speed AS actual_speed,
           avg_wind_direction::int AS actual_direction
         FROM hourly_archive
         WHERE station_id = 'pak_nam_pran'
           AND (hour_timestamp AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $2::date
       ) a
       WHERE fb.model_id = $3
         AND fb.target_date = a.d
         AND fb.target_hour = a.h`,
      [fromIso, toIso, modelId]
    );

    return {
      modelId,
      chunks,
      inserted,
      joined: updated.rowCount || 0,
      durationMs: Date.now() - startedAt
    };
  }

  async importAll(fromMs, toMs, modelIds = null) {
    const targets = modelIds && modelIds.length
      ? this.models.filter(m => modelIds.includes(m.id))
      : this.models;

    const results = [];
    for (const model of targets) {
      try {
        const r = await this.importModel(model.id, fromMs, toMs);
        console.log(
          `✓ Backtest ${model.id}: ${r.inserted} forecasts, ${r.joined} joined, `
          + `${r.chunks} chunks (${(r.durationMs / 1000).toFixed(1)}s)`
        );
        results.push(r);
      } catch (e) {
        console.error(`✗ Backtest failed for ${model.id}:`, e.message);
        results.push({ modelId: model.id, error: e.message });
      }
    }
    return results;
  }

  /**
   * Aggregate metrics per model: count, RMSE, MAE, bias (forecast-actual mean).
   * Joined rows only (where we have actual data).
   */
  async getSummary() {
    const { rows } = await this.pool.query(
      `SELECT
         model_id,
         COUNT(*) FILTER (WHERE actual_speed IS NOT NULL) AS eval_count,
         MIN(target_date) FILTER (WHERE actual_speed IS NOT NULL) AS since_date,
         MAX(target_date) FILTER (WHERE actual_speed IS NOT NULL) AS until_date,
         SQRT(AVG(speed_error * speed_error)) FILTER (WHERE actual_speed IS NOT NULL) AS rmse_speed,
         AVG(speed_error) FILTER (WHERE actual_speed IS NOT NULL) AS mae_speed,
         AVG(forecast_speed - actual_speed) FILTER (WHERE actual_speed IS NOT NULL) AS bias_speed,
         AVG(direction_error) FILTER (WHERE actual_speed IS NOT NULL) AS mae_direction
       FROM forecast_backtest
       GROUP BY model_id
       ORDER BY rmse_speed ASC NULLS LAST`
    );
    return rows;
  }

  /**
   * Per-month bias / MAE per model — useful to spot seasonal drift.
   */
  async getByMonth() {
    const { rows } = await this.pool.query(
      `SELECT
         model_id,
         EXTRACT(MONTH FROM target_date)::int AS month,
         COUNT(*) FILTER (WHERE actual_speed IS NOT NULL) AS eval_count,
         AVG(speed_error) FILTER (WHERE actual_speed IS NOT NULL) AS mae_speed,
         AVG(forecast_speed - actual_speed) FILTER (WHERE actual_speed IS NOT NULL) AS bias_speed
       FROM forecast_backtest
       GROUP BY model_id, EXTRACT(MONTH FROM target_date)
       ORDER BY model_id, month`
    );
    return rows;
  }
}
