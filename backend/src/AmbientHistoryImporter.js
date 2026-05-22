import { fetch } from 'undici';

/**
 * AmbientHistoryImporter — fetches historical 5-minute measurements from the
 * public lightning.ambientweather.net/device-data endpoint and writes them to
 * `wind_data`. After insertion, hourly aggregates are recomputed for the
 * affected hours so dashboards see filled history.
 *
 * The endpoint is unauthenticated and works for any public station; only the
 * station's MAC address is required. We resolve slug→MAC via the existing
 * /devices?public.slug= endpoint on demand.
 */

const BASE_URL = 'https://lightning.ambientweather.net';
const PAGE_LIMIT = 2000;        // max records per request
const PAGE_RES_MINUTES = 5;     // 5-minute granularity
const PAGE_SPAN_MS = PAGE_LIMIT * PAGE_RES_MINUTES * 60 * 1000; // ~6.94 days
const REQUEST_DELAY_MS = 1100;  // polite rate limit

export class AmbientHistoryImporter {
  constructor(stations, dbManager, archiveManager, windCollector, dispatcher = null) {
    this.allStations = stations || [];
    this.stations = this.allStations.filter(s => s.type === 'ambient');
    this.dbManager = dbManager;
    this.archiveManager = archiveManager;
    this.windCollector = windCollector; // reused for hourly aggregation
    this.dispatcher = dispatcher;
    this.macCache = new Map();
  }

  _mphToKnots(mph) {
    return (mph || 0) * 0.868976;
  }

  async _fetchJson(url) {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://ambientweather.net/'
      }
    };
    if (this.dispatcher) opts.dispatcher = this.dispatcher;

    const res = await fetch(url, opts);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return res.json();
  }

  async _resolveMac(station) {
    if (station.macAddress) return station.macAddress;
    const cached = this.macCache.get(station.id);
    if (cached) return cached;

    const url = `${BASE_URL}/devices?public.slug=${station.slug}`;
    const json = await this._fetchJson(url);
    const mac = json?.data?.[0]?.macAddress;
    if (!mac) throw new Error(`Cannot resolve MAC for station ${station.id} (slug=${station.slug})`);
    this.macCache.set(station.id, mac);
    return mac;
  }

  async _fetchPage(macAddress, startMs, endMs) {
    const url = `${BASE_URL}/device-data`
      + `?macAddress=${encodeURIComponent(macAddress)}`
      + `&start=${startMs}&end=${endMs}`
      + `&limit=${PAGE_LIMIT}&res=${PAGE_RES_MINUTES}`
      + `&dataKey=graphDataRefined`;
    const json = await this._fetchJson(url);
    return json?.data || [];
  }

  _pointToRecord(point) {
    return {
      timestamp: new Date(point.dateutc).toISOString(),
      windSpeedKnots: this._mphToKnots(point.windspeedmph),
      windGustKnots: point.windgustmph != null ? this._mphToKnots(point.windgustmph) : null,
      maxGustKnots: point.maxdailygust != null ? this._mphToKnots(point.maxdailygust) : null,
      windDir: point.winddir ?? 0,
      windDirAvg: point.winddir_avg10m ?? null,
      temperature: point.tempf ?? null,
      humidity: point.humidity ?? null,
      pressure: point.baromrelin ?? null
    };
  }

  async _recomputeHourlyArchive(stationId, fromMs, toMs) {
    if (!this.archiveManager || !this.windCollector) return 0;

    // Snap to hour boundaries.
    const fromHour = new Date(Math.floor(fromMs / 3600000) * 3600000);
    const toHour = new Date(Math.ceil(toMs / 3600000) * 3600000);
    const rows = await this.dbManager.getDataInRange(
      stationId, fromHour.toISOString(), toHour.toISOString()
    );
    if (rows.length === 0) return 0;

    const buckets = new Map(); // hourIso -> rows[]
    for (const row of rows) {
      const ts = new Date(row.timestamp);
      ts.setMinutes(0, 0, 0);
      const key = ts.toISOString();
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(row);
    }

    let archived = 0;
    for (const [hourIso, hourRows] of buckets) {
      const aggregated = this.windCollector._aggregateHourlyData(hourRows);
      await this.archiveManager.archiveHourlyData(hourIso, aggregated, stationId);
      archived++;
    }
    return archived;
  }

  /**
   * Import a date range for a single station.
   * fromMs / toMs are epoch milliseconds.
   */
  async importStation(stationId, fromMs, toMs) {
    const station = this.stations.find(s => s.id === stationId);
    if (!station) throw new Error(`Unknown ambient station: ${stationId}`);
    const mac = await this._resolveMac(station);

    const startedAt = Date.now();
    let cursor = toMs; // endpoint returns newest first; we walk backwards
    let pages = 0;
    let fetched = 0;
    let inserted = 0;

    while (cursor > fromMs) {
      const pageStart = Math.max(cursor - PAGE_SPAN_MS, fromMs);
      const points = await this._fetchPage(mac, pageStart, cursor);
      pages++;

      if (points.length === 0) break;

      const records = [];
      let oldestInPage = cursor;
      for (const pt of points) {
        if (pt.dateutc < fromMs || pt.dateutc > toMs) continue;
        if (pt.dateutc < oldestInPage) oldestInPage = pt.dateutc;
        records.push(this._pointToRecord(pt));
      }
      fetched += records.length;

      if (records.length > 0) {
        inserted += await this.dbManager.insertWindDataBatch(records, stationId);
      }

      // Advance cursor to just before the oldest point we got.
      if (oldestInPage >= cursor) break; // no progress, avoid loop
      cursor = oldestInPage - 1;

      if (cursor > fromMs) {
        await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
      }
    }

    const archivedHours = await this._recomputeHourlyArchive(stationId, fromMs, toMs);

    return {
      stationId,
      pages,
      fetched,
      inserted,
      archivedHours,
      durationMs: Date.now() - startedAt
    };
  }

  async importAll(fromMs, toMs, stationIds = null) {
    const targets = stationIds && stationIds.length
      ? this.stations.filter(s => stationIds.includes(s.id))
      : this.stations;

    const results = [];
    for (const station of targets) {
      try {
        const r = await this.importStation(station.id, fromMs, toMs);
        console.log(
          `✓ Imported ${station.id}: ${r.inserted}/${r.fetched} new, `
          + `${r.archivedHours} hours archived (${r.pages} pages, ${(r.durationMs / 1000).toFixed(1)}s)`
        );
        results.push(r);
      } catch (e) {
        console.error(`✗ Import failed for ${station.id}:`, e.message);
        results.push({ stationId: station.id, error: e.message });
      }
    }
    return results;
  }

  /**
   * Refresh the last 24 hours for all ambient stations (idempotent — duplicates
   * are skipped via ON CONFLICT).
   */
  async importLastDay(stationIds = null) {
    const now = Date.now();
    return this.importAll(now - 24 * 60 * 60 * 1000, now, stationIds);
  }
}
