import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { setImmediate as nextTurn } from 'node:timers/promises';
import test from 'node:test';
import express from 'express';
import { WindDataCollector } from '../src/WindDataCollector.js';
import { ApiRouter } from '../src/ApiRouter.js';

// Логи серверного кода (в том числе из after-хуков) ломают IPC тест-раннера
// на Node.js 20: 'Unable to deserialize cloned data'. Диагностику дают assertion'ы.
for (const level of ['log', 'info', 'warn']) {
  console[level] = () => {};
}

const nativeFetch = globalThis.fetch;
const daytime = Date.parse('2026-10-13T05:00:00Z'); // Полдень в Bangkok.

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}

function fixture(t, { now = daytime, age = 60000, empty = false, pending = false, failure = false, sensorTimestamp = null } = {}) {
  let clock = now;
  t.mock.method(Date, 'now', () => clock);
  const stations = [
    { id: 'pak_nam_pran', isPrimary: true, type: 'ambient', url: 'https://station.test/primary' },
    { id: 'neighbor', isPrimary: false, type: 'ambient', url: 'https://station.test/neighbor' }
  ];
  const rows = new Map();
  const requests = [];
  const gate = deferred();
  const makeRow = (data, stationId) => ({
    station_id: stationId, timestamp: new Date(data.timestamp),
    wind_speed_knots: data.windSpeedKnots, wind_gust_knots: data.windGustKnots,
    max_gust_knots: data.maxGustKnots, wind_direction: data.windDir,
    wind_direction_avg: data.windDirAvg, temperature: data.temperature,
    humidity: data.humidity, pressure: data.pressure
  });
  if (!empty) {
    rows.set(`pak_nam_pran:${now - age}`, makeRow({
      timestamp: new Date(now - age).toISOString(), windSpeedKnots: 8,
      windGustKnots: 10, maxGustKnots: 12, windDir: 90, windDirAvg: 90,
      temperature: 80, humidity: 65, pressure: 29.8
    }, 'pak_nam_pran'));
  }
  const db = {
    async insertWindData(data, stationId) {
      const key = `${stationId}:${new Date(data.timestamp).getTime()}`;
      if (rows.has(key)) return false;
      rows.set(key, makeRow(data, stationId));
      return true;
    },
    async getLatestData(stationId = 'pak_nam_pran') {
      return [...rows.values()].filter(row => row.station_id === stationId)
        .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
    },
    async calculateTrend() { return { trend: 'stable', change: 0 }; }
  };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    if (pending && url === stations[0].url) await gate.promise;
    if (failure) return new Response('', { status: 503 });
    return Response.json({ data: [{ lastData: {
      dateutc: sensorTimestamp ?? clock, windspeedmph: 20, windgustmph: 25, maxdailygust: 30,
      winddir: 95, winddir_avg10m: 90, tempf: 85, humidity: 70, baromrelin: 29.8
    } }] });
  });
  const collector = new WindDataCollector({ stations, timezone: 'Asia/Bangkok' }, db, {});
  return { collector, db, rows, requests, gate, advance(ms) { clock += ms; } };
}

async function serve(t, f) {
  const router = new ApiRouter(f.db, {}, f.collector, {}, {}, { applyOffset: dir => dir }, {}, []);
  const app = express();
  app.use('/api', router.getRouter());
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    const closed = once(server, 'close');
    server.closeAllConnections();
    server.close();
    await closed;
  });
  return { url: `http://127.0.0.1:${server.address().port}/api`, router };
}

async function stream(t, url) {
  const messages = [];
  const req = http.get(`${url}/wind/stream`);
  t.after(() => req.destroy());
  const [res] = await once(req, 'response');
  let buffer = '';
  res.setEncoding('utf8');
  res.on('data', chunk => {
    buffer += chunk;
    const frames = buffer.split('\n\n');
    buffer = frames.pop();
    for (const frame of frames) {
      if (frame.startsWith('data: ')) messages.push(JSON.parse(frame.slice(6)));
    }
  });
  return messages;
}

async function settle() {
  for (let i = 0; i < 10; i++) await nextTurn();
}

// Нарушение single-flight приводит к нескольким запросам одной станции при перекрытии cron/клиентов.
test('параллельные сборы опрашивают каждую станцию только один раз', async t => {
  const f = fixture(t, { pending: true });
  const collections = Array.from({ length: 20 }, () => f.collector.collectWindData());
  await settle();
  f.gate.resolve();
  await Promise.all(collections);
  assert.equal(f.requests.filter(r => r.url.endsWith('/primary')).length, 1);
  assert.equal(f.requests.filter(r => r.url.endsWith('/neighbor')).length, 1);
  assert.equal(f.rows.size, 3);
});

// Удаление фонового refresh оставляет старую БД; ожидание Ambient блокирует HTTP-ответ.
test('старый GET отвечает сразу, обновляет только главную станцию и рассылает двум SSE-клиентам', async t => {
  const f = fixture(t, { pending: true });
  const { url } = await serve(t, f);
  const first = await stream(t, url);
  const second = await stream(t, url);
  const replies = await Promise.all(Array.from({ length: 12 }, () => nativeFetch(`${url}/wind/current`)));
  const data = await Promise.all(replies.map(r => r.json()));
  assert.ok(data.every(d => d.windSpeedKnots === 8));
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].url, 'https://station.test/primary');
  f.gate.resolve();
  // Ожидаем реальный HTTP/SSE, не только завершение замоканного fetch.
  for (let i = 0; i < 100 && (!first.some(m => m.data.windSpeedKnots === 17.4) || !second.some(m => m.data.windSpeedKnots === 17.4)); i++) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(first.filter(m => m.data.windSpeedKnots === 17.4).length, 1);
  assert.equal(second.filter(m => m.data.windSpeedKnots === 17.4).length, 1);
  assert.equal(new Date((await f.db.getLatestData()).timestamp).getTime(), daytime);
  assert.equal(f.requests.length, 1);
});

test('свежий отсчёт, включая ровно 30 секунд, не запускает опрос', async t => {
  const f = fixture(t, { age: 30000 });
  const { url } = await serve(t, f);
  const response = await nativeFetch(`${url}/wind/current`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).windSpeedKnots, 8);
  await settle();
  assert.equal(f.requests.length, 0);
});

test('ночью старый GET не опрашивает источник', async t => {
  const f = fixture(t, { now: Date.parse('2026-10-13T13:00:00Z') });
  const { url } = await serve(t, f);
  assert.equal((await nativeFetch(`${url}/wind/current`)).status, 200);
  await settle();
  assert.equal(f.requests.length, 0);
});

test('пустая БД запускает обновление даже при первом ответе 404', async t => {
  const f = fixture(t, { empty: true });
  const { url } = await serve(t, f);
  assert.equal((await nativeFetch(`${url}/wind/current`)).status, 404);
  await settle();
  const next = await nativeFetch(`${url}/wind/current`);
  assert.equal(next.status, 200);
  assert.equal((await next.json()).windSpeedKnots, 17.4);
  assert.equal(f.requests.length, 1);
});

test('ошибка источника не меняет возраст данных и подавляет попытки в течение 30 секунд', async t => {
  const f = fixture(t, { failure: true });
  const { url } = await serve(t, f);
  const original = (await f.db.getLatestData()).timestamp.getTime();
  await nativeFetch(`${url}/wind/current`);
  await settle();
  await nativeFetch(`${url}/wind/current`);
  assert.equal(f.requests.length, 1);
  assert.equal((await f.db.getLatestData()).timestamp.getTime(), original);
  f.advance(30000);
  await nativeFetch(`${url}/wind/current`);
  await settle();
  assert.equal(f.requests.length, 2);
  assert.equal((await f.db.getLatestData()).timestamp.getTime(), original);
});

test('зависший источник отменяется, а следующий опрос не остаётся заблокированным', async t => {
  const f = fixture(t);
  t.mock.method(globalThis, 'fetch', nativeFetch);
  const nativeTimeout = AbortSignal.timeout;
  t.mock.method(AbortSignal, 'timeout', () => nativeTimeout(15));
  let requests = 0;
  const server = http.createServer(() => { requests++; });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const station = f.collector.stations[0];
  station.url = `http://127.0.0.1:${server.address().port}/hung`;
  const result = await Promise.race([
    f.collector.collectStation(station),
    new Promise(resolve => setTimeout(() => resolve('не отменён'), 150))
  ]);
  assert.equal(result, null);
  f.advance(30000);
  assert.equal(await f.collector.collectStation(station), null);
  assert.equal(requests, 2);
});

test('SSE сразу открывается даже без данных и не теряет первый новый отсчёт', async t => {
  const f = fixture(t, { empty: true });
  const { url } = await serve(t, f);
  const req = http.get(`${url}/wind/stream`);
  t.after(() => req.destroy());
  const response = once(req, 'response');
  const ready = await Promise.race([
    response.then(() => true),
    new Promise(resolve => setTimeout(() => resolve(false), 150))
  ]);
  assert.equal(ready, true);
  const [res] = await response;
  let body = '';
  res.on('data', chunk => { body += chunk; });
  await nativeFetch(`${url}/wind/current`);
  for (let i = 0; i < 100 && !body.includes('17.4'); i++) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.ok(body.includes('"windSpeedKnots":17.4'));
});

test('ручной сбор отдаёт данные из БД в API-формате', async t => {
  const f = fixture(t);
  const { url } = await serve(t, f);
  const response = await nativeFetch(`${url}/wind/collect`, { method: 'POST' });
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.windSpeedKnots, 17.4);
  assert.equal(body.data.windDir, 95);
  // Cron, ручной сбор и GET делят ограничение одной и той же станции.
  await Promise.all([f.collector.collectWindData(), nativeFetch(`${url}/wind/current`)]);
  assert.equal(f.requests.length, 2);
});

test('повторный старый отсчёт не рассылается как новый и не вызывает шквал опросов', async t => {
  const original = daytime - 60000;
  const f = fixture(t, { sensorTimestamp: original });
  const { url } = await serve(t, f);
  const messages = await stream(t, url);
  await nativeFetch(`${url}/wind/current`);
  await settle();
  f.advance(29999);
  await nativeFetch(`${url}/wind/current`);
  await settle();
  assert.equal(f.requests.length, 1);
  f.advance(1);
  await nativeFetch(`${url}/wind/current`);
  await settle();
  assert.equal(f.requests.length, 2);
  assert.equal(f.rows.size, 1);
  assert.equal(messages.length, 1);
  assert.equal(new Date(messages[0].data.timestamp).getTime(), original);
});
