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

        const getWindSafety = (direction, speed) => {
            const dir = parseInt(direction);
            const knots = parseFloat(speed) || 0;

            // ОПАСНЫЙ offshore (отжим): 225°-315° (ЮЗ-СЗ) - ветер дует С БЕРЕГА В МОРЕ
            const isOffshore = (dir >= 225 && dir <= 315);
            // БЕЗОПАСНЫЙ onshore (прижим): 45°-135° (СВ-ЮВ) - ветер дует С МОРЯ НА БЕРЕГ
            const isOnshore = (dir >= 45 && dir <= 135);

            let safetyLevel = 'medium';
            let safetyColor = '#FFA500';
            let isGoodForKiting = false;

            if (knots < 5) {
                safetyLevel = 'low';
                safetyColor = '#87CEEB';
            } else if (isOffshore || knots > 30) {
                // Offshore (отжим) или слишком сильный ветер = ОПАСНО (красный)
                safetyLevel = 'danger';
                safetyColor = '#FF4500';
            } else if (isOnshore && knots >= 12 && knots <= 25) {
                // Onshore (прижим) с хорошим ветром = ОТЛИЧНО (зеленый)
                safetyLevel = 'high';
                safetyColor = '#00FF00';
                isGoodForKiting = true;
            } else if (isOnshore && knots >= 5 && knots < 12) {
                // Onshore (прижим) со слабым-средним ветром = БЕЗОПАСНО (желтый)
                safetyLevel = 'good';
                safetyColor = '#FFD700';
            } else if (knots >= 8 && knots <= 15) {
                // Sideshore с умеренным ветром = ХОРОШО (желтый)
                safetyLevel = 'good';
                safetyColor = '#FFD700';
            }

            return {
                level: safetyLevel,
                color: safetyColor,
                isOffshore,
                isOnshore,
                isGoodForKiting
            };
        };

        const getWindIcon = (speed) => {
            if (speed < 5) return '💨';
            if (speed < 12) return '🌬️';
            if (speed < 20) return '💨';
            if (speed < 30) return '🌪️';
            return '⚡';
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
                const safety = getWindSafety(hour.direction, hour.speed);
                const windIcon = getWindIcon(hour.speed);
                const cardinalDir = getCardinalDirection(hour.direction);
                const kiteIcon = safety.isGoodForKiting ? '🪁' : '';

                forecastHTML += `
                    <div class="flex-1 min-w-[60px] rounded-lg p-2 flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                         style="background: ${safety.color}; border: 2px solid ${safety.color}; box-shadow: 0 0 15px ${safety.color}40;"
                         onclick="simulateWind(${hour.direction}, ${hour.speed})" title="Нажмите для симуляции">
                        <div class="text-xs font-semibold text-white drop-shadow-md">${hour.time}:00 ${kiteIcon}</div>
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