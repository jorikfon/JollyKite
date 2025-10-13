import config from './config.js';
import WindUtils from './utils/WindUtils.js';
import WindDataManager from './WindDataManager.js';
import MapController from './MapController.js';
import ForecastManager from './ForecastManager.js';
import WindArrowController from './WindArrowController.js';
import HistoryManager from './HistoryManager.js';
import WindStatistics from './WindStatistics.js';

class App {
    constructor() {
        // Инициализация всех менеджеров
        this.windDataManager = new WindDataManager();
        this.mapController = new MapController();
        this.forecastManager = new ForecastManager();
        this.historyManager = new HistoryManager();
        this.windStatistics = new WindStatistics();

        this.windArrowController = null; // Будет инициализирован после карты
        this.updateInterval = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('Инициализация JollyKite App...');
            
            // Инициализация карты
            this.mapController.initMap();
            console.log('✓ Карта инициализирована');

            // Инициализация контроллера стрелки ветра
            this.windArrowController = new WindArrowController(
                this.mapController, 
                this.windDataManager
            );
            console.log('✓ Контроллер стрелки ветра создан');

            // Инициализация менеджера прогнозов
            if (!this.forecastManager.init()) {
                console.warn('⚠ Не удалось инициализировать менеджер прогнозов');
            } else {
                console.log('✓ Менеджер прогнозов инициализирован');
            }

            // Настройка симуляции ветра для прогнозов
            this.forecastManager.setupSimulation((direction, speed) => {
                this.simulateWind(direction, speed);
            });

            // Проверка доступности истории
            if (!this.historyManager.isStorageAvailable()) {
                console.warn('⚠ История недоступна (localStorage не поддерживается)');
            } else {
                console.log('✓ Менеджер истории готов');
            }

            // Загрузка первоначальных данных
            await this.loadInitialData();
            
            // Запуск автообновления
            this.startAutoUpdate();
            
            this.isInitialized = true;
            console.log('✅ JollyKite App успешно инициализирован');
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации приложения:', error);
            return false;
        }
    }

    async loadInitialData() {
        // Загрузка текущих данных о ветре
        try {
            await this.updateWindData();
            console.log('✓ Данные о ветре загружены');
        } catch (error) {
            console.error('⚠ Ошибка загрузки данных о ветре:', error);
            this.showWindError('Ошибка загрузки данных о ветре');
        }

        // Загрузка прогноза
        try {
            await this.updateForecast();
            console.log('✓ Прогноз загружен');
        } catch (error) {
            console.error('⚠ Ошибка загрузки прогноза:', error);
            this.forecastManager.showError(error);
        }
    }

    async updateWindData() {
        try {
            const windData = await this.windDataManager.fetchCurrentWindData();
            
            // Получение информации о безопасности
            const safety = this.windDataManager.getWindSafety(
                windData.windDir, 
                windData.windSpeedKnots
            );
            
            // Обновление данных с информацией о безопасности
            windData.safety = safety;
            
            // Обновление UI
            this.updateWindDisplay(windData);

            // Обновление стрелки ветра
            if (this.windArrowController) {
                this.windArrowController.updateWind(windData.windDir, windData.windSpeedKnots);
            }

            // Добавление измерения в статистику
            this.windStatistics.addMeasurement(windData);

            // Обновление тренда
            this.updateWindTrend();

            // Сохранение в историю
            if (this.historyManager.isStorageAvailable()) {
                this.historyManager.saveWindData(windData);
            }
            
            return windData;
        } catch (error) {
            console.error('Ошибка обновления данных о ветре:', error);
            throw error;
        }
    }

    updateWindTrend() {
        const trend = this.windStatistics.analyzeTrend();
        const trendElement = document.getElementById('windTrend');

        if (trendElement) {
            trendElement.innerHTML = `
                <span style="font-size: 1.5em;">${trend.icon}</span>
                <span style="margin-left: 5px; font-weight: bold;">${trend.text}</span>
            `;
            trendElement.style.color = trend.color;

            // Добавляем tooltip с подробной информацией
            if (trend.currentSpeed && trend.previousSpeed) {
                const changeText = trend.change > 0 ? `+${trend.change.toFixed(1)}` : trend.change.toFixed(1);
                trendElement.title = `Сейчас: ${trend.currentSpeed.toFixed(1)} узлов\nБыло: ${trend.previousSpeed.toFixed(1)} узлов\nИзменение: ${changeText} узлов (${trend.percentChange.toFixed(1)}%)`;
            } else {
                trendElement.title = 'Накапливаем данные для анализа тренда (требуется 10 минут)';
            }
        }
    }

    updateWindDisplay(windData) {
        // Обновление скорости ветра
        const windSpeedElement = document.getElementById('windSpeed');
        if (windSpeedElement) {
            windSpeedElement.textContent = windData.windSpeedKnots.toFixed(1);
        }

        // Обновление направления и описания ветра
        this.updateWindDescription(windData);
    }

    updateWindDescription(windData) {
        const windDesc = this.getWindDescription(windData.windSpeedKnots, windData.windDir);

        const windIcon = document.getElementById('windIcon');
        const windTitle = document.getElementById('windTitle');
        const windSubtitle = document.getElementById('windSubtitle');
        const windCardinal = document.getElementById('windCardinal');
        const windSafetyDesc = document.getElementById('windSafetyDesc');

        if (windIcon) windIcon.textContent = windDesc.icon;
        if (windTitle) windTitle.textContent = windDesc.title;
        if (windSubtitle) windSubtitle.textContent = windDesc.subtitle;

        // Обновление направления ветра (румб)
        if (windCardinal) {
            windCardinal.textContent = this.degreesToCardinal(windData.windDir);
        }

        // Обновление описания безопасности
        if (windSafetyDesc && windData.safety) {
            let safetyText = windData.safety.text;

            // Добавляем информацию о типе ветра (offshore/onshore)
            if (windData.safety.isOffshore) {
                safetyText += ' • Отжим (offshore)';
            } else if (windData.safety.isOnshore) {
                safetyText += ' • Прижим (onshore)';
            } else {
                safetyText += ' • Боковой (sideshore)';
            }

            windSafetyDesc.textContent = safetyText;
            windSafetyDesc.style.color = windData.safety.color;
            windSafetyDesc.style.fontWeight = '600';
        }

        // Обновление цвета на основе безопасности
        const windButton = document.getElementById('windDescriptionButton');
        if (windButton && windData.safety) {
            windButton.style.borderColor = windData.safety.color;
            windButton.style.boxShadow = `0 0 20px ${windData.safety.color}40`;
        }
    }

    degreesToCardinal(degrees) {
        return WindUtils.degreesToCardinal(degrees);
    }

    getWindDescription(speedKnots, degrees) {
        return WindUtils.getWindDescription(speedKnots, degrees);
    }

    async updateForecast() {
        try {
            this.forecastManager.showLoading();
            const forecastData = await this.windDataManager.fetchWindForecast();
            this.forecastManager.displayForecast(forecastData);
        } catch (error) {
            this.forecastManager.showError(error);
            throw error;
        }
    }

    simulateWind(direction, speed) {
        console.log(`Симуляция ветра: ${speed} узлов, направление ${direction}°`);
        
        // Симуляция данных
        const simulatedData = {
            windSpeedKnots: speed,
            windDir: direction,
            windGustKnots: speed * 1.2,
            windDirAvg: direction,
            temperature: 85, // Фиксированная температура для симуляции
            humidity: 65,
            pressure: 30.1,
            timestamp: new Date()
        };
        
        // Получение информации о безопасности
        const safety = this.windDataManager.getWindSafety(direction, speed);
        simulatedData.safety = safety;
        
        // Обновление отображения
        this.updateWindDisplay(simulatedData);
        
        // Обновление стрелки
        if (this.windArrowController) {
            this.windArrowController.updateWind(direction, speed);
        }
    }

    showWindError(message) {
        const windTitle = document.getElementById('windTitle');
        const windSubtitle = document.getElementById('windSubtitle');
        const windIcon = document.getElementById('windIcon');
        
        if (windTitle) windTitle.textContent = 'Ошибка загрузки';
        if (windSubtitle) windSubtitle.textContent = message;
        if (windIcon) windIcon.textContent = '⚠️';
    }

    startAutoUpdate(intervalMs = config.intervals.autoUpdate) {
        if (this.updateInterval) {
            this.stopAutoUpdate();
        }
        
        console.log(`Запуск автообновления каждые ${intervalMs/1000} сек`);
        this.updateInterval = setInterval(async () => {
            try {
                await this.updateWindData();
            } catch (error) {
                console.error('Ошибка автообновления:', error);
            }
        }, intervalMs);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('Автообновление остановлено');
        }
    }

    // Методы для работы с историей
    getWindHistory(hours = 24) {
        return this.historyManager.getHistoryByPeriod(hours);
    }

    getWindStatistics(hours = 24) {
        return this.historyManager.getWindStatistics(hours);
    }

    exportHistoryJSON(hours = null) {
        return this.historyManager.exportHistoryJSON(hours);
    }

    exportHistoryCSV(hours = null) {
        return this.historyManager.exportHistoryCSV(hours);
    }

    clearHistory() {
        return this.historyManager.clearHistory();
    }

    // Методы для работы со статистикой
    getStatisticsCacheInfo() {
        return this.windStatistics.getCacheInfo();
    }

    clearStatisticsCache() {
        this.windStatistics.clearHistory();
        console.log('✓ Кеш статистики очищен');
    }

    // Методы для внешнего управления
    async refreshData() {
        if (!this.isInitialized) return false;
        
        try {
            await this.updateWindData();
            await this.updateForecast();
            return true;
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
            return false;
        }
    }

    destroy() {
        console.log('Завершение работы JollyKite App...');
        
        // Остановка автообновления
        this.stopAutoUpdate();
        
        // Очистка карты
        this.mapController.destroy();
        
        // Очистка менеджеров
        if (this.windArrowController) {
            this.windArrowController.clear();
        }
        
        this.forecastManager.clear();
        
        this.isInitialized = false;
        console.log('✅ JollyKite App завершен');
    }
}

export default App;