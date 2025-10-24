class ForecastManager {
    constructor(languageManager = null) {
        this.forecastContainer = null;
        this.languageManager = languageManager;
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

        const getWindColor = (speed) => {
            const knots = parseFloat(speed) || 0;
            if (knots < 5) return '#87CEEB';      // Голубой - слабый
            if (knots < 10) return '#00CED1';     // Бирюзовый
            if (knots < 15) return '#00FF00';     // Зелёный - отлично
            if (knots < 20) return '#FFD700';     // Жёлтый - хорошо
            if (knots < 25) return '#FFA500';     // Оранжевый
            if (knots < 30) return '#FF4500';     // Красно-оранжевый
            return '#8B0000';                      // Тёмно-красный - опасно
        };

        const getCardinalDirection = (degrees) => {
            const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
            const index = Math.round(degrees / 45) % 8;
            return directions[index];
        };

        const isOffshore = (direction) => {
            const dir = parseInt(direction);
            return (dir >= 225 && dir <= 315);
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
                    <div class="text-sm font-semibold text-white mb-3 text-center">
                        ${dayName}
                    </div>
                    <div style="position: relative;">
                        <!-- Градиентная шкала ветра -->
                        <div style="display: flex; height: 50px; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            `;

            // Создаём градиентные сегменты для каждого часа
            group.forEach((hour, index) => {
                const color = getWindColor(hour.speed);
                const cardinalDir = getCardinalDirection(hour.direction);
                const offshore = isOffshore(hour.direction);
                const currentLang = this.languageManager?.getCurrentLanguage() || 'ru';
                const knotsText = currentLang === 'ru' ? 'узлов' : 'knots';
                const offshoreWarning = offshore ? (currentLang === 'ru' ? '⚠️ ОТЖИМ!' : '⚠️ OFFSHORE!') : '';

                forecastHTML += `
                    <div style="flex: 1; background: ${color}; position: relative; cursor: pointer; transition: all 0.2s ease;"
                         onclick="simulateWind(${hour.direction}, ${hour.speed})"
                         onmouseover="this.style.transform='scaleY(1.2)'; this.style.zIndex='10';"
                         onmouseout="this.style.transform='scaleY(1)'; this.style.zIndex='1';"
                         title="${hour.time}:00 - ${hour.speed.toFixed(1)} ${knotsText} ${cardinalDir} ${offshoreWarning}">
                    </div>
                `;
            });

            forecastHTML += `
                        </div>
                        <!-- Часовые метки -->
                        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.7rem; color: rgba(255,255,255,0.7);">
            `;

            // Добавляем метки времени
            group.forEach((hour, index) => {
                if (index % 2 === 0 || index === group.length - 1) {
                    forecastHTML += `
                        <div style="text-align: center; flex: 1;">
                            <div style="font-weight: 600; color: rgba(255,255,255,0.9);">${hour.time}:00</div>
                            <div style="font-size: 0.65rem; margin-top: 2px;">${hour.speed.toFixed(1)}</div>
                        </div>
                    `;
                } else {
                    forecastHTML += `<div style="flex: 1;"></div>`;
                }
            });

            forecastHTML += `
                        </div>
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

        const currentLang = this.languageManager?.getCurrentLanguage() || 'ru';

        if (targetDate.toDateString() === today.toDateString()) {
            return currentLang === 'ru' ? 'Сегодня' : 'Today';
        } else if (targetDate.toDateString() === tomorrow.toDateString()) {
            return currentLang === 'ru' ? 'Завтра' : 'Tomorrow';
        } else if (targetDate.toDateString() === dayAfterTomorrow.toDateString()) {
            return currentLang === 'ru' ? 'Послезавтра' : 'Day after tomorrow';
        } else {
            // Use LanguageManager to get localized day name
            if (this.languageManager) {
                const dayName = this.languageManager.getDayName(targetDate.getDay());
                const day = targetDate.getDate();
                const month = this.languageManager.getMonthName(targetDate.getMonth());
                return `${dayName}, ${day} ${month}`;
            } else {
                const options = {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short'
                };
                const locale = currentLang === 'ru' ? 'ru-RU' : 'en-US';
                return targetDate.toLocaleDateString(locale, options);
            }
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