class ForecastManager {
    constructor() {
        this.forecastContainer = null;
    }

    init() {
        this.forecastContainer = document.getElementById('windForecast');
        if (!this.forecastContainer) {
            console.error('Forecast container not found');
            return false;
        }
        return true;
    }

    showLoading() {
        if (this.forecastContainer) {
            this.forecastContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p class="text-white/80">Загружаем прогноз ветра...</p>
                </div>
            `;
        }
    }

    showError(error) {
        if (this.forecastContainer) {
            this.forecastContainer.innerHTML = `
                <div class="forecast-loading">
                    <p class="text-red-400">Ошибка загрузки прогноза: ${error.message}</p>
                </div>
            `;
        }
    }

    displayForecast(hoursData) {
        if (!this.forecastContainer) return;

        const getWindClass = (speed) => {
            if (speed < 8) return 'wind-light';
            if (speed < 15) return 'wind-moderate';
            if (speed < 25) return 'wind-strong';
            return 'wind-extreme';
        };

        const getWindIcon = (speed) => {
            if (speed < 5) return '💨';
            if (speed < 12) return '🌬️';
            if (speed < 20) return '💨';
            if (speed < 30) return '🌪️';
            return '⚡';
        };

        const getTailwindWindClass = (speed) => {
            if (speed < 8) return 'bg-gradient-to-br from-blue-400/80 to-blue-600/80 border border-blue-300/50';
            if (speed < 15) return 'bg-gradient-to-br from-green-400/80 to-green-600/80 border border-green-300/50';
            if (speed < 25) return 'bg-gradient-to-br from-yellow-400/80 to-orange-500/80 border border-yellow-300/50';
            return 'bg-gradient-to-br from-red-500/80 to-red-700/80 border border-red-400/50';
        };

        const getCardinalDirection = (degrees) => {
            const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
            const index = Math.round(degrees / 45) % 8;
            return directions[index];
        };

        // Группировка по дням
        const dayGroups = {};
        hoursData.forEach(hour => {
            const dayKey = hour.date.toDateString();
            if (!dayGroups[dayKey]) {
                dayGroups[dayKey] = [];
            }
            dayGroups[dayKey].push(hour);
        });

        let forecastHTML = '';
        Object.entries(dayGroups).forEach(([dayKey, group]) => {
            const dayName = this.getDayName(new Date(dayKey));
            
            forecastHTML += `
                <div class="mb-6">
                    <div class="text-sm font-semibold text-white mb-3 text-center bg-white/10 rounded-lg py-2">
                        ${dayName}
                    </div>
                    <div class="flex gap-1 min-w-full">
            `;

            group.forEach(hour => {
                const windClass = getTailwindWindClass(hour.speed);
                const windIcon = getWindIcon(hour.speed);
                const cardinalDir = getCardinalDirection(hour.direction);

                forecastHTML += `
                    <div class="flex-1 min-w-[60px] ${windClass} rounded-lg p-2 flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" 
                         onclick="simulateWind(${hour.direction}, ${hour.speed})" title="Нажмите для симуляции">
                        <div class="text-xs font-semibold text-white drop-shadow-md">${hour.time}:00</div>
                        <div class="text-lg my-1 drop-shadow-md">${windIcon}</div>
                        <div class="text-sm font-bold text-white drop-shadow-md">${hour.speed.toFixed(1)}</div>
                        <div class="text-xs text-white/90 drop-shadow-sm">${cardinalDir}</div>
                    </div>
                `;
            });

            forecastHTML += `
                    </div>
                </div>
            `;
        });

        this.forecastContainer.innerHTML = forecastHTML;
    }

    getDayName(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        const targetDate = new Date(date);
        
        if (targetDate.toDateString() === today.toDateString()) {
            return 'Сегодня';
        } else if (targetDate.toDateString() === tomorrow.toDateString()) {
            return 'Завтра';
        } else if (targetDate.toDateString() === dayAfterTomorrow.toDateString()) {
            return 'Послезавтра';
        } else {
            const options = { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'short' 
            };
            return targetDate.toLocaleDateString('ru-RU', options);
        }
    }

    // Метод для симуляции ветра (будет вызываться извне)
    setupSimulation(simulateCallback) {
        window.simulateWind = simulateCallback;
    }

    clear() {
        if (this.forecastContainer) {
            this.forecastContainer.innerHTML = '';
        }
    }
}

export default ForecastManager;