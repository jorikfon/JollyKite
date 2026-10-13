// Live wind updates of the real PWA App (frontend/js/App.js): SSE + GET polling gated by
// tab visibility, route and Bangkok working hours; stale/duplicate readings; single-flight GET.
//
// The browser ES modules run in a vm context. Real: App, WindDataManager, WindStreamManager,
// NavController, WindStatistics, HistoryManager, SettingsManager, config, utils.
// Faked only at the boundaries: DOM, fetch, EventSource, localStorage, timers, and the
// render-only components App drives (map, arrow, charts, i18n).
//
// Run: node --experimental-vm-modules --test backend/tests/frontend-wind.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const JS_DIR = new URL('../../frontend/js/', import.meta.url);
const POLL_MS = 30_000; // config.intervals.autoUpdate
const bkk = (hms) => Date.parse(`2026-10-13T${hms}+07:00`);

// Shape of ApiRouter.formatWindData()
const reading = (hms, overrides = {}) => ({
    timestamp: new Date(bkk(hms)).toISOString(),
    windSpeedKnots: 12.4,
    windGustKnots: 15.1,
    maxGustKnots: 19.8,
    windDir: 90,
    windDirAvg: 88,
    temperature: 30.2,
    humidity: 70.5,
    pressure: 1009.5,
    ...overrides,
});

// Shape of DatabaseManager.calculateTrend()
const TREND = {
    trend: 'stable', text: 'Стабильный', icon: '➡️', color: '#4169E1',
    change: 0.2, percentChange: 1.6, currentSpeed: 12.5, previousSpeed: 12.3,
    directionTrend: 'stable', directionSpread: 6, directionIcon: '🧭', directionText: 'Направление стабильное',
};

const flush = async () => {
    for (let i = 0; i < 20; i++) await new Promise((resolve) => setImmediate(resolve));
};

function createBrowser() {
    // --- network: fetch -------------------------------------------------------------
    const calls = [];
    const held = new Map(); // path -> bodies for the next requests, resolved by the test
    const hung = new Set(); // paths that never answer (until aborted)
    const server = { current: null, calls, hung };
    const routes = {
        '/api/wind/current': () => server.current,
        '/api/wind/trend': () => TREND,
        '/api/wind/forecast': () => [],
        '/version.json': () => ({ version: 'test' }),
    };
    server.hold = (path) => {
        let respond;
        const body = new Promise((resolve) => { respond = resolve; });
        if (!held.has(path)) held.set(path, []);
        held.get(path).push(body);
        return respond;
    };

    function fetch(url, { signal } = {}) {
        const path = new URL(url, 'https://pnp.miko.ru').pathname;
        calls.push(path);
        const body = hung.has(path)
            ? new Promise(() => {})
            : held.get(path)?.shift() ?? Promise.resolve((routes[path] ?? (() => ({})))());
        return new Promise((resolve, reject) => {
            signal?.addEventListener('abort', () => reject(signal.reason));
            body.then((json) => resolve(new Response(JSON.stringify(json), {
                headers: { 'content-type': 'application/json' },
            })));
        });
    }

    // mock.timers does not drive AbortSignal.timeout; same contract on the mocked setTimeout
    const AbortSignalWithMockedTimers = {
        timeout(ms) {
            const controller = new AbortController();
            setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms);
            return controller.signal;
        },
    };

    // --- network: EventSource (like ApiRouter /wind/stream: opens, then sends the latest reading)
    const sources = [];
    class EventSource {
        constructor(url) {
            this.url = url;
            this.closed = false;
            sources.push(this);
            setImmediate(() => {
                if (this.closed) return;
                this.onopen?.();
                if (server.current) this.send(server.current);
            });
        }
        send(data) {
            this.onmessage?.({
                data: JSON.stringify({ type: 'wind_update', data, trend: TREND, timestamp: new Date().toISOString() }),
            });
        }
        close() {
            this.closed = true;
        }
    }

    // --- DOM ----------------------------------------------------------------------------
    const elements = new Map();
    const element = () => ({
        textContent: '', innerHTML: '', title: '', disabled: false, style: {}, dataset: {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        addEventListener() {}, setAttribute() {}, focus() {},
        querySelectorAll: () => [], contains: () => false,
    });
    const document = Object.assign(new EventTarget(), {
        hidden: false,
        title: '',
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, element());
            return elements.get(id);
        },
        querySelectorAll: () => [],
    });
    const location = { hostname: 'pnp.miko.ru', port: '', hash: '' };
    const window = Object.assign(new EventTarget(), { location, scrollTo() {} });
    const store = new Map();
    const localStorage = {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(key, String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => store.clear(),
    };
    const console = { log() {}, info() {}, warn() {}, error() {} };

    const context = vm.createContext({
        window, document, location, localStorage, fetch, EventSource, console,
        setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
        setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval,
        Date: globalThis.Date, AbortController, AbortSignal: AbortSignalWithMockedTimers, DOMException,
        Event, CustomEvent, Blob, URL, alert() {},
    });

    // --- render-only components (data loaders keep their network call) -------------------
    const noop = () => {};
    const loads = (url) => async () => { await (await fetch(url)).json(); };
    const stub = (methods) => class { constructor() { Object.assign(this, methods()); } };
    const stubs = {
        'i18n/I18nManager.js': { default: stub(() => ({
            loadTranslations: async () => {}, detectBrowserLanguage: () => 'ru', setLocale: noop,
            translatePage: noop, t: (key) => key, getFullLocale: () => 'ru-RU',
        })) },
        'settings/MenuController.js': { default: stub(() => ({ init: () => true, open: noop })) },
        'MapController.js': { default: stub(() => ({ initMap: noop, destroy: noop })) },
        'WindArrowController.js': { default: stub(() => ({ updateWind: noop, clear: noop })) },
        'ForecastManager.js': { default: stub(() => ({
            init: () => true, setupSimulation: noop, showLoading: noop, displayForecast: noop, showError: noop, clear: noop,
        })) },
        'NotificationManager.js': { default: stub(() => ({ updateUI: noop })) },
        'KiteSizeSlider.js': { default: stub(() => ({
            init: () => true, updateRecommendations: noop, onSettingsChange: noop, calculator: null,
        })) },
        'TodayWindTimeline.js': { default: stub(() => ({
            init: () => true, displayTimeline: loads('/api/wind/today/full?interval=5'), showError: noop,
        })) },
        'WeekWindHistory.js': { default: stub(() => ({
            init: () => true, displayHistory: loads('/api/wind/history/week'), showError: noop,
        })) },
        'MonthlyRideableStats.js': { default: stub(() => ({ init: () => true, display: loads('/api/archive/monthly-rideable') })) },
        'ForecastLongPage.js': { default: stub(() => ({ init: () => true, display: async () => {} })) },
        'ForecastAccuracy.js': { default: stub(() => ({ init: () => true, display: async () => {} })) },
        'MaterialRipple.js': { rippleManager: { init: noop } },
    };

    return { context, stubs, server, sources, document, window, location };
}

async function loadApp(context, stubs) {
    const modules = new Map(); // one instance per URL, so config.js etc. are shared
    const load = (url) => {
        if (!modules.has(url)) {
            const exported = stubs[url.slice(JS_DIR.href.length)];
            modules.set(url, exported
                ? Promise.resolve(new vm.SyntheticModule(Object.keys(exported), function () {
                    for (const [name, value] of Object.entries(exported)) this.setExport(name, value);
                }, { context, identifier: url }))
                : readFile(new URL(url), 'utf8').then((source) => new vm.SourceTextModule(source, { context, identifier: url })));
        }
        return modules.get(url);
    };
    const root = await load(new URL('App.js', JS_DIR).href);
    await root.link((specifier, parent) => load(new URL(specifier, parent.identifier).href));
    await root.evaluate();
    return root.namespace.default;
}

async function startApp(t, { at = '10:00:00', current = reading('09:59:40'), before } = {}) {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: bkk(at) });
    const env = createBrowser();
    env.server.current = current;
    before?.(env);
    const App = await loadApp(env.context, env.stubs);
    const app = new App();
    env.ready = app.init();
    await flush();
    // real time lets promises settle between timers; tick in 1 s steps
    const advance = async (ms) => {
        for (let elapsed = 0; elapsed < ms; elapsed += 1000) {
            t.mock.timers.tick(1000);
            await flush();
        }
    };
    return { app, env, advance };
}

const gets = (env) => env.server.calls.filter((path) => path === '/api/wind/current').length;
const text = (env, id) => env.document.getElementById(id).textContent;
const openStreams = (env) => env.sources.filter((source) => !source.closed);
const navigate = (env, hash) => {
    env.location.hash = hash;
    env.window.dispatchEvent(new Event('hashchange'));
};
const setHidden = (env, hidden) => {
    env.document.hidden = hidden;
    env.document.dispatchEvent(new Event('visibilitychange'));
};

test('init renders the current wind from GET /api/wind/current', async (t) => {
    const { env } = await startApp(t);
    assert.equal(await env.ready, true);
    assert.equal(text(env, 'windSpeed'), '12.4');
});

test('SSE and the first wind GET do not wait for history and forecast', async (t) => {
    const { env } = await startApp(t, {
        before: (env) => {
            for (const path of ['/api/wind/today/full', '/api/wind/history/week', '/api/archive/monthly-rideable', '/api/wind/forecast']) {
                env.server.hung.add(path);
            }
        },
    });
    assert.equal(openStreams(env).length, 1);
    assert.equal(gets(env), 1);
    assert.equal(text(env, 'windSpeed'), '12.4');
});

test('polls GET every 30 s while visible on home during working hours', async (t) => {
    const { env, advance } = await startApp(t);
    assert.equal(gets(env), 1);
    await advance(POLL_MS);
    assert.equal(gets(env), 2);
    await advance(POLL_MS);
    assert.equal(gets(env), 3);
});

test('hidden tab stops polling and SSE; showing it again fetches at once and reconnects', async (t) => {
    const { env, advance } = await startApp(t);
    setHidden(env, true);
    await advance(3 * POLL_MS);
    assert.equal(openStreams(env).length, 0);
    assert.equal(gets(env), 1);

    setHidden(env, false);
    assert.equal(gets(env), 2);
    assert.equal(openStreams(env).length, 1);
    await advance(POLL_MS);
    assert.equal(gets(env), 3);
});

test('leaving the home route stops polling and SSE; returning fetches at once', async (t) => {
    const { env, advance } = await startApp(t);
    navigate(env, '#/forecast');
    await advance(3 * POLL_MS);
    assert.equal(openStreams(env).length, 0);
    assert.equal(gets(env), 1);

    navigate(env, '');
    assert.equal(gets(env), 2);
    assert.equal(openStreams(env).length, 1);
});

test('at 19:00 Bangkok the minute check stops polling and SSE', async (t) => {
    const { env, advance } = await startApp(t, { at: '18:59:30', current: reading('18:59:10') });
    assert.equal(openStreams(env).length, 1);
    await advance(60_000); // minute check at 19:00:30
    assert.equal(openStreams(env).length, 0);
    const atClose = gets(env);
    await advance(3 * POLL_MS);
    assert.equal(gets(env), atClose);
});

test('at 06:00 Bangkok the minute check starts SSE and polling with an immediate GET', async (t) => {
    const { env, advance } = await startApp(t, { at: '05:59:30', current: reading('05:59:20') });
    assert.equal(openStreams(env).length, 0);
    const atNight = gets(env);
    await advance(60_000); // minute check at 06:00:30
    assert.equal(openStreams(env).length, 1);
    assert.equal(gets(env), atNight + 1);
    await advance(POLL_MS);
    assert.equal(gets(env), atNight + 2);
});

test('a late GET with older data does not overwrite a newer SSE reading', async (t) => {
    const { app, env, advance } = await startApp(t);
    const respond = env.server.hold('/api/wind/current');
    await advance(POLL_MS); // poll GET is in flight
    openStreams(env)[0].send(reading('10:00:25', { windSpeedKnots: 18 }));
    respond(reading('10:00:05', { windSpeedKnots: 9 }));
    await flush();

    assert.equal(text(env, 'windSpeed'), '18.0');
    assert.equal(app.windStatistics.getMeasurementCount(), 2); // 09:59:40 and 10:00:25
    assert.equal(app.getWindHistory().length, 2);
});

test('an SSE message older than the shown reading is ignored', async (t) => {
    const { app, env } = await startApp(t, { current: reading('09:59:50', { windSpeedKnots: 14 }) });
    openStreams(env)[0].send(reading('09:59:20', { windSpeedKnots: 7 }));
    await flush();

    assert.equal(text(env, 'windSpeed'), '14.0');
    assert.equal(app.windStatistics.getMeasurementCount(), 1);
});

test('the same reading from GET and SSE is recorded once, a recalibrated copy is still redrawn', async (t) => {
    const { app, env } = await startApp(t); // GET and the initial SSE message both carry 09:59:40
    assert.equal(app.windStatistics.getMeasurementCount(), 1);
    assert.equal(app.getWindHistory().length, 1);

    env.server.current = reading('09:59:40', { windDir: 120 }); // direction offset changed on the server
    env.window.dispatchEvent(new Event('riderSettingsChanged'));
    await flush();

    assert.equal(text(env, 'windCardinal'), 'wind.directions.SE');
    assert.equal(app.windStatistics.getMeasurementCount(), 1);
    assert.equal(app.getWindHistory().length, 1);
});

test('concurrent wind updates share one pending GET', async (t) => {
    const { app, env } = await startApp(t);
    const respond = env.server.hold('/api/wind/current');
    const first = app.updateWindData();
    const second = app.updateWindData();
    assert.equal(gets(env), 2); // init GET + one shared request

    respond(reading('10:00:10', { windSpeedKnots: 16 }));
    await Promise.all([first, second]);
    assert.equal(text(env, 'windSpeed'), '16.0');

    const third = app.updateWindData(); // a settled request is not reused
    assert.equal(gets(env), 3);
    await third;
});

test('a hung GET times out so the user sees an error and the next poll sends a fresh request', async (t) => {
    const { env, advance } = await startApp(t, { before: (env) => env.server.hung.add('/api/wind/current') });
    assert.equal(gets(env), 1);
    await advance(POLL_MS);
    assert.equal(text(env, 'windTitle'), 'app.error');
    assert.equal(gets(env), 2);
});

test('a failed poll keeps the last reading on screen instead of an error', async (t) => {
    const { env, advance } = await startApp(t);
    env.server.hung.add('/api/wind/current');
    await advance(POLL_MS + 10_000); // poll GET hangs, then times out
    assert.notEqual(text(env, 'windTitle'), 'app.error');
    assert.equal(text(env, 'windSpeed'), '12.4');
});

test('destroy stops timers, SSE and the wind listeners', async (t) => {
    const { app, env, advance } = await startApp(t);
    setHidden(env, true); // a hide/show cycle restarts the stream and the live counter
    setHidden(env, false);
    await flush();

    app.destroy();
    const requests = env.server.calls.length;
    const streams = env.sources.length;
    const countdown = text(env, 'updateCountdown');
    await advance(5 * 60_000);
    setHidden(env, false);
    navigate(env, '#/forecast');
    navigate(env, '');

    assert.equal(openStreams(env).length, 0);
    assert.equal(env.sources.length, streams);
    assert.equal(env.server.calls.length, requests);
    assert.equal(text(env, 'updateCountdown'), countdown);
});
