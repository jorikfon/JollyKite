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
    const monthsToShow = payload.months.slice(startIdx);
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

      return `
        <div class="monthly-row"
             style="display: grid; grid-template-columns: 64px 1fr 56px; align-items: center; gap: 10px; padding: 5px 0;">
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
        <div>${rows}</div>
      </div>
    `;
  }
}

export default MonthlyRideableStats;
