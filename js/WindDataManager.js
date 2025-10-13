class WindDataManager {
    constructor() {
        this.apiUrl = 'https://lightning.ambientweather.net/devices?public.slug=e63ff0d2119b8c024b5aad24cc59a504';
        this.forecastApiUrl = 'https://api.open-meteo.com/v1/forecast';
        this.spotLocation = [12.346596280786017, 99.99817902532192];
        this.updateInterval = null;
    }

    mphToMs(mph) {
        return mph * 0.44704;
    }

    mphToKnots(mph) {
        return mph * 0.868976;
    }

    async fetchCurrentWindData() {
        try {
            const response = await fetch(this.apiUrl);
            const result = await response.json();
            
            if (result.data && result.data.length > 0) {
                const device = result.data[0];
                const lastData = device.lastData;
                
                return {
                    windSpeedKnots: this.mphToKnots(lastData.windspeedmph || 0),
                    windGustKnots: this.mphToKnots(lastData.windgustmph || 0),
                    maxGustKnots: this.mphToKnots(lastData.maxdailygust || 0),
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
        const lat = this.spotLocation[0];
        const lon = this.spotLocation[1];
        
        try {
            const url = `${this.forecastApiUrl}?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Asia/Bangkok&forecast_days=3`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.hourly) {
                return this.processForcastData(data);
            }
            throw new Error('Ошибка получения прогноза');
        } catch (error) {
            console.error('Ошибка загрузки прогноза:', error);
            throw error;
        }
    }

    processForcastData(data) {
        const hourly = data.hourly;
        const hoursToShow = [];
        const now = new Date();
        const startHour = 6; // начинаем с 6 утра

        for (let day = 0; day < 3; day++) {
            for (let hour = startHour; hour <= 20; hour += 2) {
                const hourIndex = day * 24 + hour;
                if (hourIndex < hourly.time.length) {
                    const datetime = new Date(hourly.time[hourIndex]);
                    const windSpeed = (hourly.wind_speed_10m[hourIndex] * 1.944); // м/с в узлы
                    const windDir = hourly.wind_direction_10m[hourIndex];
                    const windGust = (hourly.wind_gusts_10m[hourIndex] * 1.944);

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
        const dir = parseInt(direction);
        const knots = parseFloat(speed) || 0;

        // ОПАСНЫЙ offshore (отжим): 225°-315° (ЮЗ-СЗ) - ветер дует С БЕРЕГА В МОРЕ
        const isOffshore = (dir >= 225 && dir <= 315);
        // БЕЗОПАСНЫЙ onshore (прижим): 45°-135° (СВ-ЮВ) - ветер дует С МОРЯ НА БЕРЕГ
        const isOnshore = (dir >= 45 && dir <= 135);

        let safetyLevel = 'medium';
        let safetyText = 'Умеренно';
        let safetyColor = '#FFA500';

        if (knots < 5) {
            // Слабый ветер
            safetyLevel = 'low';
            safetyText = 'Слабый ветер';
            safetyColor = '#87CEEB';
        } else if (isOffshore || knots > 30) {
            // Offshore (отжим) или слишком сильный ветер = ОПАСНО (красный)
            safetyLevel = 'danger';
            safetyText = 'Опасно!';
            safetyColor = '#FF4500';
        } else if (isOnshore && knots >= 12 && knots <= 25) {
            // Onshore (прижим) с хорошим ветром = ОТЛИЧНО (зеленый)
            safetyLevel = 'high';
            safetyText = 'Отличные условия!';
            safetyColor = '#00FF00';
        } else if (isOnshore && knots >= 5 && knots < 12) {
            // Onshore (прижим) со слабым-средним ветром = БЕЗОПАСНО (желтый)
            safetyLevel = 'good';
            safetyText = 'Безопасно';
            safetyColor = '#FFD700';
        } else if (knots >= 8 && knots <= 15) {
            // Sideshore с умеренным ветром = ХОРОШО (желтый)
            safetyLevel = 'good';
            safetyText = 'Хорошие условия';
            safetyColor = '#FFD700';
        }

        return {
            level: safetyLevel,
            text: safetyText,
            color: safetyColor,
            isOffshore,
            isOnshore,
            windSpeed: knots,
            windDirection: dir
        };
    }

    startAutoUpdate(callback, intervalMs = 30000) {
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