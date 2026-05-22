/**
 * MonthlyRideableStats — number of "rideable days" per month for the user's
 * selected sport AND rider weight.
 *
 * A day is rideable when, during working hours (6:00–19:00 Bangkok), there
 * were ≥ minHours hourly readings with:
 *   • direction not offshore (SW–NW excluded), AND
 *   • a kite size in the sport's quiver that is within ±35% of optimal for
 *     the rider's weight at that wind speed.
 *
 * The effective wind range is computed by the backend from the sport's
 * configuration and the rider weight.
 *
 * Visual: simple "Месяц | bar | Nдн" rows.
 */
class MonthlyRideableStats {
  constructor(i18n = null, settingsManager = null) {
    this.i18n = i18n;
    this.settingsManager = settingsManager;
    this.container = null;
    this.apiUrl = '/api';
    this._weightDebounce = null;
    // Monotonic id used to discard out-of-order responses when sport/weight
    // change quickly (slow network, slider scrubbing, etc).
    this._requestSeq = 0;
    this._inflightAbort = null;
    // Months the user has expanded — persisted across re-renders so toggling
    // sport/weight doesn't collapse open panels.
    this._expandedMonths = new Set();
    // Cached daily breakdowns keyed by `${month}|${sport}|${weight}`.
    this._daysCache = new Map();
  }

  init() {
    this.container = document.getElementById('monthlyRideableStats');
    if (!this.container) {
      console.error('MonthlyRideableStats container not found');
      return false;
    }

    if (this.settingsManager) {
      // Re-render when sport changes (immediate)
      this.settingsManager.on('change:boardType', () => this.display());
      // Re-render when rider weight changes (debounced — slider fires often)
      this.settingsManager.on('change:riderWeight', () => {
        clearTimeout(this._weightDebounce);
        this._weightDebounce = setTimeout(() => this.display(), 350);
      });
    }
    return true;
  }

  t(key, fallback) {
    if (this.i18n) {
      const v = this.i18n.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  getSportIcon(sport) {
    return sport === 'wingfoil' ? '🪽' : '🪁';
  }

  getBarGradient(sport) {
    if (sport === 'wingfoil')  return 'linear-gradient(90deg, #4ECDC4 0%, #44A08D 100%)';
    if (sport === 'hydrofoil') return 'linear-gradient(90deg, #667EEA 0%, #764BA2 100%)';
    return 'linear-gradient(90deg, #FDBB2D 0%, #F5576C 100%)'; // twintip
  }

  getSportName(sport) {
    const keys = { twintip: 'menu.twintip', hydrofoil: 'menu.hydrofoil', wingfoil: 'menu.wingfoil' };
    const fallbacks = { twintip: 'Twintip', hydrofoil: 'Kite Foil', wingfoil: 'Wing Foil' };
    return this.t(keys[sport] || keys.twintip, fallbacks[sport] || sport);
  }

  formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-').map(n => parseInt(n, 10));
    const date = new Date(Date.UTC(year, month - 1, 1));
    const locale = this.i18n ? this.i18n.getFullLocale() : 'ru-RU';
    const name = date.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' }).replace('.', '');
    const shortYear = String(year).slice(-2);
    return `${name} ${shortYear}`;
  }

  async fetchStats(sport, weight, signal) {
    const url = `${this.apiUrl}/archive/monthly-rideable`
      + `?sport=${encodeURIComponent(sport)}`
      + `&weight=${encodeURIComponent(weight)}`
      + `&months=12`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return response.json();
  }

  showLoading() {
    if (!this.container) return;
    const loadingText = this.t('trends.loading', 'Loading...');
    this.container.innerHTML = `
      <div class="text-center py-6">
        <div class="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
        <p class="text-white/80 text-sm">${loadingText}</p>
      </div>
    `;
  }

  showNoData() {
    if (!this.container) return;
    const text = this.t('history.monthly.noData', 'Нет архивных данных');
    this.container.innerHTML = `<div class="text-center py-6"><p class="text-white/70">${text}</p></div>`;
  }

  showError(error) {
    if (!this.container) return;
    const prefix = this.t('history.loadingError', 'Ошибка загрузки');
    this.container.innerHTML = `<div class="text-center py-6"><p class="text-red-400">${prefix}: ${error.message}</p></div>`;
  }

  async display() {
    if (!this.container) return;

    const sport = (this.settingsManager && this.settingsManager.getSetting('boardType')) || 'twintip';
    const weight = (this.settingsManager && this.settingsManager.getSetting('riderWeight')) || 75;

    // Cancel any in-flight request and claim a fresh sequence id. We compare
    // this id after `await fetchStats` and discard the response if a newer
    // call has been issued in the meantime — prevents stale data from
    // overwriting the UI when the user scrubs sport/weight quickly.
    const seq = ++this._requestSeq;
    if (this._inflightAbort) {
      try { this._inflightAbort.abort(); } catch (_) { /* ignore */ }
    }
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    this._inflightAbort = controller;

    this.showLoading();

    let payload;
    try {
      payload = await this.fetchStats(sport, weight, controller ? controller.signal : undefined);
    } catch (error) {
      // Aborted requests are expected when the user changes settings quickly.
      if (error && (error.name === 'AbortError' || error.code === 20)) return;
      // If a newer request has already started, don't overwrite its UI state.
      if (seq !== this._requestSeq) return;
      console.error('MonthlyRideableStats: fetch failed', error);
      this.showError(error);
      return;
    }

    // Late response: a newer request superseded this one — drop silently.
    if (seq !== this._requestSeq) return;

    if (!payload || !Array.isArray(payload.months) || payload.months.length === 0) {
      this.showNoData();
      return;
    }

    // Drop fully-empty months at the start (before the station was online)
    let startIdx = 0;
    while (startIdx < payload.months.length && payload.months[startIdx].totalDays === 0) startIdx += 1;
    // Newest months on top — payload arrives in chronological order.
    const monthsToShow = payload.months.slice(startIdx).reverse();
    if (monthsToShow.length === 0) {
      this.showNoData();
      return;
    }

    const maxRideable = Math.max(1, ...monthsToShow.map(m => m.rideableDays));

    const sportName = this.getSportName(sport);
    const sportIcon = this.getSportIcon(sport);
    const barGradient = this.getBarGradient(sport);
    const daysLabel = this.t('history.monthly.daysShort', 'дн');
    const kgLabel = this.t('history.monthly.kg', 'кг');
    const rangeLabel = this.t('history.monthly.range', 'твой ветер');

    const rows = monthsToShow.map((m) => {
      const widthPct = (m.rideableDays / maxRideable) * 100;
      const monthLabel = this.formatMonthLabel(m.month);
      const isEmpty = m.rideableDays === 0;
      const minWidthRule = m.rideableDays > 0 ? 'min-width: 18px;' : '';
      const isExpanded = this._expandedMonths.has(m.month);
      const chevron = isExpanded ? '▾' : '▸';
      const detailHtml = isExpanded
        ? `<div class="monthly-detail" data-month="${m.month}" style="padding: 6px 0 12px 16px;">${this._renderDetailContents(m.month, sport, weight, barGradient)}</div>`
        : '';

      return `
        <div class="monthly-row" data-month="${m.month}"
             style="display: grid; grid-template-columns: 16px 64px 1fr 56px; align-items: center; gap: 8px; padding: 5px 0; cursor: pointer;">
          <div style="font-size: 0.7rem; color: rgba(255,255,255,0.55); text-align: center; user-select: none;">${chevron}</div>
          <div style="font-size: 0.85rem; color: rgba(255,255,255,0.85); text-align: right; white-space: nowrap;">
            ${monthLabel}
          </div>
          <div style="position: relative; height: 18px; background: rgba(255,255,255,0.08); border-radius: 9px; overflow: hidden;">
            <div style="
                position: absolute; top: 0; left: 0; bottom: 0;
                width: ${widthPct}%; ${minWidthRule}
                background: ${barGradient};
                border-radius: 9px;
                box-shadow: 0 0 8px rgba(255,255,255,0.15);
                transition: width 0.6s ease-out;
                opacity: ${isEmpty ? 0.25 : 1};
              "></div>
          </div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #fff; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap;">
            ${m.rideableDays}<span style="font-size: 0.7rem; font-weight: 500; opacity: 0.65; margin-left: 2px;">${daysLabel}</span>
          </div>
        </div>
        ${detailHtml}
      `;
    }).join('');

    this.container.innerHTML = `
      <div style="padding: 0 16px;">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 0.95rem; color: rgba(255,255,255,0.95);">
            ${sportIcon} <strong>${sportName}</strong> · ${payload.weight} ${kgLabel}
          </div>
          <div style="font-size: 0.7rem; color: rgba(255,255,255,0.55); margin-top: 2px;">
            ${rangeLabel}: ${payload.minWind}–${payload.maxWind} kn
          </div>
        </div>
        <div data-monthly-list>${rows}</div>
      </div>
    `;

    this._attachRowHandlers(sport, weight, barGradient);

    // Kick off background fetches for already-expanded months that have no
    // cached data yet (after sport/weight change).
    for (const monthKey of this._expandedMonths) {
      const cacheKey = this._cacheKey(monthKey, sport, weight);
      if (!this._daysCache.has(cacheKey)) {
        this._loadAndRenderDetail(monthKey, sport, weight, barGradient);
      }
    }
  }

  _cacheKey(monthKey, sport, weight) {
    return `${monthKey}|${sport}|${weight}`;
  }

  _attachRowHandlers(sport, weight, barGradient) {
    const list = this.container.querySelector('[data-monthly-list]');
    if (!list) return;
    list.querySelectorAll('.monthly-row[data-month]').forEach(row => {
      row.addEventListener('click', () => {
        const monthKey = row.dataset.month;
        if (this._expandedMonths.has(monthKey)) {
          this._expandedMonths.delete(monthKey);
        } else {
          this._expandedMonths.add(monthKey);
        }
        // Re-render — uses cached payload for collapsed/expanded states without
        // re-fetching the monthly summary.
        this._renderRowsOnly(sport, weight, barGradient);
      });
    });
  }

  // Refresh just the row list using the most recently rendered monthly
  // payload, preserving the surrounding header.
  _renderRowsOnly(sport, weight, barGradient) {
    // Easiest path: re-call display(). Cheap, abort-safe.
    this.display();
  }

  _renderDetailContents(monthKey, sport, weight, barGradient) {
    const cacheKey = this._cacheKey(monthKey, sport, weight);
    const cached = this._daysCache.get(cacheKey);
    if (!cached) {
      return `<div style="font-size: 0.8rem; color: rgba(255,255,255,0.55); padding: 8px 0;">${this.t('trends.loading', 'Loading...')}</div>`;
    }
    if (cached.error) {
      return `<div style="font-size: 0.8rem; color: #f87171; padding: 8px 0;">${cached.error}</div>`;
    }
    return this._renderDays(cached.payload, barGradient);
  }

  async _loadAndRenderDetail(monthKey, sport, weight, barGradient) {
    const cacheKey = this._cacheKey(monthKey, sport, weight);
    try {
      const url = `${this.apiUrl}/archive/days?month=${encodeURIComponent(monthKey)}`
        + `&sport=${encodeURIComponent(sport)}`
        + `&weight=${encodeURIComponent(weight)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API ${response.status}`);
      const payload = await response.json();
      this._daysCache.set(cacheKey, { payload });
    } catch (error) {
      this._daysCache.set(cacheKey, { error: error.message });
    }
    // If still expanded, refresh the detail container in-place.
    if (!this._expandedMonths.has(monthKey)) return;
    const node = this.container.querySelector(`.monthly-detail[data-month="${monthKey}"]`);
    if (node) {
      node.innerHTML = this._renderDetailContents(monthKey, sport, weight, barGradient);
    }
  }

  _renderDays(payload, barGradient) {
    if (!payload || !Array.isArray(payload.days) || payload.days.length === 0) {
      return `<div style="font-size: 0.8rem; color: rgba(255,255,255,0.55); padding: 8px 0;">${this.t('history.monthly.noData', 'Нет архивных данных')}</div>`;
    }

    const WORK_START = 6;
    const WORK_END = 19; // exclusive
    const HOURS = [];
    for (let h = WORK_START; h < WORK_END; h++) HOURS.push(h);
    const SPEED_CAP = 30; // kn — bar height cap
    const daysLabel = this.t('history.monthly.daysShort', 'дн');
    const hoursLabel = this.t('history.monthly.hoursShort', 'ч');

    // Newest day first
    const days = [...payload.days].reverse();

    const dayRows = days.map(d => {
      const hourMap = new Map(d.hours.map(h => [h.hour, h]));
      const bars = HOURS.map(h => {
        const entry = hourMap.get(h);
        if (!entry || entry.avgWind === null) {
          return `<div title="${h}:00 — no data" style="flex: 1; height: 22px; background: rgba(255,255,255,0.04); border-radius: 2px;"></div>`;
        }
        const heightPct = Math.min(100, (entry.avgWind / SPEED_CAP) * 100);
        const color = entry.rideable
          ? barGradient
          : 'rgba(255,255,255,0.18)';
        const dirTxt = entry.dir !== null ? `, ${entry.dir}°` : '';
        const gustTxt = entry.maxGust !== null && entry.maxGust > entry.avgWind
          ? ` (gust ${entry.maxGust})` : '';
        return `<div title="${h}:00 — ${entry.avgWind} kn${gustTxt}${dirTxt}"
                     style="flex: 1; height: 22px; background: rgba(255,255,255,0.04); border-radius: 2px; position: relative; overflow: hidden;">
                  <div style="position: absolute; left: 0; right: 0; bottom: 0; height: ${heightPct}%; background: ${color}; opacity: ${entry.rideable ? 1 : 0.6}; border-radius: 2px;"></div>
                </div>`;
      }).join('');

      const dateLabel = this._formatDayLabel(d.date);

      return `
        <div style="display: grid; grid-template-columns: 56px 1fr 36px; align-items: center; gap: 8px; padding: 3px 0;">
          <div style="font-size: 0.7rem; color: rgba(255,255,255,0.75); text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${dateLabel}
          </div>
          <div style="display: flex; gap: 2px; align-items: flex-end;">${bars}</div>
          <div style="font-size: 0.7rem; color: rgba(255,255,255,0.65); text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap;">
            ${d.rideableHours}${hoursLabel}
          </div>
        </div>
      `;
    }).join('');

    const hourAxis = HOURS.map(h => (h % 3 === 0)
      ? `<div style="flex: 1; text-align: center;">${h}</div>`
      : `<div style="flex: 1;"></div>`
    ).join('');

    return `
      <div>
        <div style="display: grid; grid-template-columns: 56px 1fr 36px; gap: 8px; padding-bottom: 4px;">
          <div></div>
          <div style="display: flex; font-size: 0.6rem; color: rgba(255,255,255,0.4);">${hourAxis}</div>
          <div></div>
        </div>
        ${dayRows}
      </div>
    `;
  }

  _formatDayLabel(dateKey) {
    const [year, month, day] = dateKey.split('-').map(n => parseInt(n, 10));
    const date = new Date(Date.UTC(year, month - 1, day));
    const locale = this.i18n ? this.i18n.getFullLocale() : 'ru-RU';
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '');
  }
}

export default MonthlyRideableStats;
