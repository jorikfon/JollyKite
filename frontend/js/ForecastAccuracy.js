/**
 * ForecastAccuracy — renders a per-model accuracy table for the /#/history page.
 * Pulls /api/wind/forecast/backtest/summary and shows RMSE/MAE/bias per model.
 * Offers a "Run backtest" button when no data is available yet.
 */
class ForecastAccuracy {
    constructor(i18n) {
        this.i18n = i18n || window.i18n;
        this.container = null;
        this._lastRenderedAt = 0;
    }

    t(key, fallback) {
        return (this.i18n && this.i18n.t(key)) || fallback || key;
    }

    init() {
        this.container = document.getElementById('forecastAccuracy');
        return !!this.container;
    }

    async display() {
        if (!this.container && !this.init()) return;
        if (Date.now() - this._lastRenderedAt < 60 * 1000) return; // 1-min in-memory cache

        try {
            this._showLoading();
            const response = await fetch('/api/wind/forecast/backtest/summary');
            if (!response.ok) throw new Error(`API ${response.status}`);
            const data = await response.json();
            this._render(data.models || []);
            this._lastRenderedAt = Date.now();
        } catch (error) {
            console.error('ForecastAccuracy error:', error);
            this._showError(error);
        }
    }

    _showLoading() {
        this.container.innerHTML = `
            <div class="text-center py-4">
                <div class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
                <p class="text-white/70 text-xs">${this.t('trends.loading', 'Loading...')}</p>
            </div>
        `;
    }

    _showError(error) {
        this.container.innerHTML = `
            <div class="text-center py-4">
                <p class="text-red-400 text-sm">${this.t('history.loadingError', 'Loading error')}: ${error.message}</p>
            </div>
        `;
    }

    _render(models) {
        const currentUnit = window.settings?.getSetting('windSpeedUnit') || 'knots';
        const unitSymbol = window.unitConverter?.getUnitSymbol(currentUnit) || 'kn';
        const conv = (knots) => window.unitConverter
            ? window.unitConverter.convert(knots, 'knots', currentUnit)
            : knots;
        const fmt = (v) => v == null ? '—' : conv(parseFloat(v)).toFixed(1);
        const fmtBias = (v) => {
            if (v == null) return '—';
            const c = conv(parseFloat(v));
            const sign = c > 0 ? '+' : '';
            return `${sign}${c.toFixed(1)}`;
        };
        const fmtDeg = (v) => v == null ? '—' : `${Math.round(parseFloat(v))}°`;

        const evaluated = models.filter(m => parseInt(m.eval_count, 10) > 0);
        if (evaluated.length === 0) {
            this.container.innerHTML = `
                <div style="text-align: center; padding: 16px;">
                    <p class="text-white/70 text-sm" style="margin-bottom: 12px;">
                        ${this.t('history.accuracy.noData', 'Бэктест ещё не запускался')}
                    </p>
                    <button id="runBacktestBtn"
                        style="padding: 10px 20px; border-radius: 12px; border: none;
                               background: linear-gradient(90deg, #4ECDC4, #44A08D);
                               color: #fff; font-weight: 600; cursor: pointer;">
                        ${this.t('history.accuracy.run', 'Запустить бэктест (2 года)')}
                    </button>
                </div>
            `;
            const btn = document.getElementById('runBacktestBtn');
            if (btn) btn.addEventListener('click', () => this._runBacktest(btn));
            return;
        }

        // Sort by RMSE ascending (lower = better)
        const sorted = [...evaluated].sort((a, b) => {
            const ra = parseFloat(a.rmse_speed) || Infinity;
            const rb = parseFloat(b.rmse_speed) || Infinity;
            return ra - rb;
        });
        const best = sorted[0]?.model_id;

        const rows = sorted.map(m => {
            const isBest = m.model_id === best;
            const period = (m.since_date && m.until_date)
                ? `${this._formatDate(m.since_date)} → ${this._formatDate(m.until_date)}`
                : '—';
            return `
                <div style="display: grid; grid-template-columns: 1fr auto auto auto auto;
                            gap: 10px; align-items: center; padding: 8px 12px;
                            background: ${isBest ? 'rgba(78,205,196,0.12)' : 'rgba(255,255,255,0.04)'};
                            border-radius: 10px; margin-bottom: 6px;
                            border-left: 3px solid ${isBest ? '#4ECDC4' : 'transparent'};">
                    <div>
                        <div style="font-size: 0.9rem; font-weight: 600; color: #fff;">
                            ${isBest ? '⭐ ' : ''}${m.name}
                        </div>
                        <div style="font-size: 0.65rem; color: rgba(255,255,255,0.5); margin-top: 1px;">
                            ${period} · ${parseInt(m.eval_count, 10).toLocaleString()} ${this.t('history.accuracy.evalShort', 'оц.')}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 60px;">
                        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums;">
                            ${fmt(m.rmse_speed)}
                        </div>
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">
                            RMSE ${unitSymbol}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 60px;">
                        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums;">
                            ${fmt(m.mae_speed)}
                        </div>
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">
                            MAE ${unitSymbol}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 60px;">
                        <div style="font-size: 0.85rem; font-weight: 700;
                                    color: ${parseFloat(m.bias_speed) > 0 ? '#FFB347' : '#7DD3FC'};
                                    font-variant-numeric: tabular-nums;">
                            ${fmtBias(m.bias_speed)}
                        </div>
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">
                            ${this.t('history.accuracy.bias', 'Bias')} ${unitSymbol}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 50px;">
                        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums;">
                            ${fmtDeg(m.mae_direction)}
                        </div>
                        <div style="font-size: 0.6rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">
                            ${this.t('history.accuracy.dir', 'dir')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const refreshLabel = this.t('history.accuracy.refresh', 'Обновить бэктест');
        const explainer = this.t('history.accuracy.hint',
            'RMSE/MAE — средняя ошибка модели по скорости; Bias > 0 — модель переоценивает; dir — средняя ошибка направления.');

        this.container.innerHTML = `
            <div style="padding: 0 4px;">
                ${rows}
                <div style="display: flex; justify-content: space-between; align-items: center;
                            margin-top: 10px; padding: 0 4px; flex-wrap: wrap; gap: 8px;">
                    <p class="text-white/50" style="font-size: 0.65rem; margin: 0; max-width: 70%;">
                        ${explainer}
                    </p>
                    <button id="runBacktestBtn"
                        style="padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);
                               background: rgba(255,255,255,0.05); color: #fff; font-size: 0.75rem; cursor: pointer;">
                        ${refreshLabel}
                    </button>
                </div>
            </div>
        `;
        const btn = document.getElementById('runBacktestBtn');
        if (btn) btn.addEventListener('click', () => this._runBacktest(btn));
    }

    async _runBacktest(button) {
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = this.t('history.accuracy.running', 'Запущено… (5–15 мин)');
        try {
            await fetch('/api/wind/forecast/backtest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 730 })
            });
        } catch (_) { /* request likely times out at nginx; backend keeps running */ }
        button.textContent = originalText + ' ⏳';
        // Poll summary every 60s; the server keeps processing after the 504.
        const poll = async () => {
            this._lastRenderedAt = 0;
            await this.display();
        };
        setTimeout(poll, 60_000);
        setTimeout(poll, 180_000);
        setTimeout(poll, 360_000);
    }

    _formatDate(d) {
        if (!d) return '';
        const s = typeof d === 'string' ? d : new Date(d).toISOString();
        return s.slice(0, 10);
    }
}

export default ForecastAccuracy;
