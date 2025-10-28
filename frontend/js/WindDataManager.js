import config from './config.js';
import WindUtils from './utils/WindUtils.js';

class WindDataManager {
    constructor() {
        this.backendApiUrl = config.api.backend || '/api';
        this.spotLocation = config.locations.spot;
        this.updateInterval = null;
    }

    async fetchCurrentWindData() {
        try {
            // Fetch current wind data from backend API
            const response = await fetch(`${this.backendApiUrl}/wind/current`);

            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }

            const data = await response.json();

            // Backend already returns data in the correct format
            // Just convert timestamp string to Date object
            return {
                ...data,
                timestamp: new Date(data.timestamp)
            };
        } catch (error) {
            console.error('Ошибка загрузки данных о ветре:', error);
            throw error;
        }
    }

    async fetchWindForecast() {
        try {
            // Fetch forecast from backend API
            const response = await fetch(`${this.backendApiUrl}/wind/forecast`);

            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }

            const forecastData = await response.json();

            // Backend already returns processed data in the correct format
            // Convert date strings back to Date objects for compatibility
            return forecastData.map(hour => ({
                ...hour,
                date: new Date(hour.date)
            }));
        } catch (error) {
            console.error('Ошибка загрузки прогноза:', error);
            throw error;
        }
    }


    getWindSafety(direction, speed) {
        // Delegate to the centralized WindUtils
        return WindUtils.getWindSafety(direction, speed);
    }

    startAutoUpdate(callback, intervalMs = config.intervals.autoUpdate) {
        this.updateInterval = setInterval(async () => {
            try {
                const data = await this.fetchCurrentWindData();
                callback(data);
            } catch (error) {
                console.error('Ошибка автообновления:', error);
            }
        }, intervalMs);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Fetch wind trend from backend
     * Returns trend data based on last 30 minutes of measurements
     */
    async fetchWindTrend() {
        try {
            const response = await fetch(`${this.backendApiUrl}/wind/trend`);
            if (!response.ok) {
                throw new Error(`Failed to fetch trend: ${response.status}`);
            }
            const trend = await response.json();
            return trend;
        } catch (error) {
            console.error('Ошибка загрузки тренда:', error);
            // Return default "insufficient data" trend on error
            return {
                trend: 'insufficient_data',
                text: 'Недостаточно данных',
                icon: '⏳',
                color: '#808080',
                change: 0,
                percentChange: 0
            };
        }
    }
}

export default WindDataManager;