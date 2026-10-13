import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { DatabaseManager } from '../src/DatabaseManager.js';

// Только явно выбранная локальная тестовая БД; никаких соединений с рабочей БД.
const connectionString = process.env.TEST_DATABASE_URL;
if (connectionString && !['127.0.0.1', 'localhost'].includes(new URL(connectionString).hostname)) {
  throw new Error('TEST_DATABASE_URL должен указывать на локальную тестовую БД');
}

async function database(t) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  t.after(() => client.end());
  await client.query(`CREATE TEMP TABLE wind_data (
    timestamp TIMESTAMPTZ NOT NULL, station_id TEXT NOT NULL,
    wind_speed_knots DOUBLE PRECISION NOT NULL, wind_gust_knots DOUBLE PRECISION,
    max_gust_knots DOUBLE PRECISION, wind_direction INTEGER NOT NULL,
    wind_direction_avg INTEGER, temperature DOUBLE PRECISION, humidity DOUBLE PRECISION,
    pressure DOUBLE PRECISION, UNIQUE(station_id, timestamp)
  )`);
  const db = new DatabaseManager(client);
  const now = Date.now();
  t.mock.method(Date, 'now', () => now);
  for (let minutes = 0; minutes < 60; minutes += 5) {
    await db.insertWindData({
      timestamp: new Date(now - minutes * 60000).toISOString(),
      windSpeedKnots: minutes < 30 ? 20 : 10, windGustKnots: 22,
      maxGustKnots: 25, windDir: minutes >= 15 && minutes < 30 ? 270 : 90,
      windDirAvg: 90, temperature: 85, humidity: 65, pressure: 29.8
    });
  }
  // Плотная серия не должна превратить «последние 30 мин» в последние 3 минуты.
  for (let seconds = 30; seconds <= 180; seconds += 30) {
    await db.insertWindData({
      timestamp: new Date(now - seconds * 1000).toISOString(),
      windSpeedKnots: 20, windGustKnots: 22, maxGustKnots: 25,
      windDir: 90, windDirAvg: 90, temperature: 85, humidity: 65, pressure: 29.8
    });
  }
  return db;
}

test('плотный сбор не сжимает выборку для push до последних секунд', { skip: !connectionString }, async t => {
  const db = await database(t);
  const measurements = await db.getLastMeasurements(3);
  assert.equal(measurements.length, 3);
  assert.ok(measurements[2].timestamp - measurements[0].timestamp >= 5 * 60000);
  assert.equal(new Set(measurements.map(m => Math.floor(m.timestamp.getTime() / 300000))).size, 3);
});

test('тренд сравнивает два получасовых окна независимо от частоты сбора', { skip: !connectionString }, async t => {
  const db = await database(t);
  const trend = await db.calculateTrend();
  assert.equal(trend.trend, 'increasing_strong');
  assert.equal(trend.currentSpeed, 20);
  assert.equal(trend.previousSpeed, 10);
  assert.equal(trend.percentChange, 100);
});

test('частые отсчёты не скрывают изменение направления за полчаса', { skip: !connectionString }, async t => {
  const db = await database(t);
  const stability = await db.calculateDirectionStability();
  assert.equal(stability.directionTrend, 'changing');
  assert.ok(stability.directionSpread >= 30);
});
