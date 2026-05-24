import ForecastManager from './ForecastManager.js';

/**
 * ForecastLongPage — 10-day Open-Meteo forecast rendered on the /#/forecast route.
 * Reuses ForecastManager for chart rendering, fetches a longer horizon and
 * shows the active model name above the chart.
 */
class ForecastLongPage {
    constructor(i18n, days = 10) {
        this.i18n = i18n || window.i18n;
        this.days = days;
        this.manager = new ForecastManager(i18n, 'forecastLongPage');
        this.initialized = false;
        this.lastRenderedAt = 0;
    }

    init() {
        if (this.initialized) return true;
        const ok = this.manager.init();
        if (ok) this.initialized = true;
        return ok;
    }

    async display() {
        if (!this.initialized && !this.init()) return;

        // Cache for 5 minutes to avoid re-fetching on route switches
        if (Date.now() - this.lastRenderedAt < 5 * 60 * 1000) return;

        try {
            this.manager.showLoading();
            const [forecastData, modelInfo] = await Promise.all([
                this._fetchForecast(),
                this._fetchActiveModel().catch(() => null)
            ]);
            this._renderModelInfo(modelInfo);
            this.manager.displayForecast(forecastData);
            this.lastRenderedAt = Date.now();
        } catch (error) {
            console.error('ForecastLongPage error:', error);
            this.manager.showError(error);
        }
    }

    async _fetchForecast() {
        const response = await fetch(`/api/wind/forecast?days=${this.days}`);
        if (!response.ok) throw new Error(`Forecast API ${response.status}`);
        const data = await response.json();
        return data.map(hour => ({ ...hour, date: new Date(hour.date) }));
    }

    async _fetchActiveModel() {
        const response = await fetch('/api/wind/forecast/models');
        if (!response.ok) return null;
        return response.json();
    }

    _renderModelInfo(modelInfo) {
        const el = document.getElementById('forecastModelInfo');
        if (!el) return;
        if (!modelInfo) {
            el.textContent = '';
            return;
        }
        const best = modelInfo.bestModel || modelInfo.best;
        const activeId = best || (modelInfo.models?.[0]?.id);
        const activeModel = modelInfo.models?.find(m => m.id === activeId);
        const label = this.i18n?.t('forecast.usingModel') || 'Модель';
        const name = activeModel?.name || activeId || '—';
        el.textContent = `${label}: ${name}`;
    }
}

export default ForecastLongPage;
