import config from './config.js';
import WindUtils from './utils/WindUtils.js';

class WindDataManager {
    constructor() {
        this.apiUrl = config.api.ambientWeather;
        this.forecastApiUrl = config.api.openMeteo;
        this.spotLocation = config.locations.spot;
        this.updateInterval = null;
    }

    async fetchCurrentWindData() {
        try {
            const response = await fetch(this.apiUrl);
            const result = await response.json();
            
            if (result.data && result.data.length > 0) {
                const device = result.data[0];
                const lastData = device.lastData;
                
                return {
                    windSpeedKnots: WindUtils.mphToKnots(lastData.windspeedmph || 0),
                    windGustKnots: WindUtils.mphToKnots(lastData.windgustmph || 0),
                    maxGustKnots: WindUtils.mphToKnots(lastData.maxdailygust || 0),
                    windDir: lastData.winddir || 0,
                    windDirAvg: lastData.winddir_avg10m || 0,
                    temperature: lastData.tempf || 0,
                    humidity: lastData.humidity || 0,
                    pressure: lastData.baromrelin || 0,
                    timestamp: new Date(lastData.dateutc)
                };
            }
            throw new Error('Нет данных от устройства');
        } catch (error) {
            console.error('Ошибка загрузки данных о ветре:', error);
            throw error;
        }
    }

    async fetchWindForecast() {
        const [lat, lon] = this.spotLocation;
        const { timezone, daysToShow } = config.forecast;

        try {
            const url = `${this.forecastApiUrl}?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=${timezone}&forecast_days=${daysToShow}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.hourly) {
                return this.processForecastData(data);
            }
            throw new Error('Ошибка получения прогноза');
        } catch (error) {
            console.error('Ошибка загрузки прогноза:', error);
            throw error;
        }
    }

    processForecastData(data) {
        const hourly = data.hourly;
        const hoursToShow = [];
        const { startHour, endHour, hourInterval, daysToShow } = config.forecast;

        for (let day = 0; day < daysToShow; day++) {
            for (let hour = startHour; hour <= endHour; hour += hourInterval) {
                const hourIndex = day * 24 + hour;
                if (hourIndex < hourly.time.length) {
                    const datetime = new Date(hourly.time[hourIndex]);
                    const windSpeed = WindUtils.kmhToKnots(hourly.wind_speed_10m[hourIndex]);
                    const windDir = hourly.wind_direction_10m[hourIndex];
                    const windGust = WindUtils.kmhToKnots(hourly.wind_gusts_10m[hourIndex]);

                    hoursToShow.push({
                        date: datetime,
                        time: hour,
                        speed: windSpeed,
                        direction: windDir,
                        gust: windGust
                    });
                }
            }
        }

        return hoursToShow;
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
}

export default WindDataManager;