import WindDataManager from './WindDataManager.js';
import MapController from './MapController.js';
import ForecastManager from './ForecastManager.js';
import WindArrowController from './WindArrowController.js';
import HistoryManager from './HistoryManager.js';

class App {
    constructor() {
        // Инициализация всех менеджеров
        this.windDataManager = new WindDataManager();
        this.mapController = new MapController();
        this.forecastManager = new ForecastManager();
        this.historyManager = new HistoryManager();
        
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

        if (windIcon) windIcon.textContent = windDesc.icon;
        if (windTitle) windTitle.textContent = windDesc.title;
        if (windSubtitle) windSubtitle.textContent = windDesc.subtitle;

        // Обновление цвета на основе безопасности
        const windButton = document.getElementById('windDescriptionButton');
        if (windButton && windData.safety) {
            windButton.style.borderColor = windData.safety.color;
            windButton.style.boxShadow = `0 0 20px ${windData.safety.color}40`;
        }
    }

    getWindDescription(speedKnots, degrees) {
        // Это упрощенная версия, полную логику можно взять из оригинального файла
        const speed = parseFloat(speedKnots) || 0;
        
        if (speed < 5) {
            return {
                icon: '🍃',
                title: 'Штиль',
                subtitle: 'Ветра практически нет'
            };
        } else if (speed < 12) {
            return {
                icon: '💨',
                title: 'Легкий ветер',
                subtitle: `${speed.toFixed(1)} узлов`
            };
        } else if (speed < 20) {
            return {
                icon: '🌬️',
                title: 'Умеренный ветер',
                subtitle: `${speed.toFixed(1)} узлов - отличо для кайта!`
            };
        } else if (speed < 30) {
            return {
                icon: '💨',
                title: 'Сильный ветер',
                subtitle: `${speed.toFixed(1)} узлов - для опытных`
            };
        } else {
            return {
                icon: '⚡',
                title: 'Экстремальный ветер',
                subtitle: `${speed.toFixed(1)} узлов - осторожно!`
            };
        }
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

    startAutoUpdate(intervalMs = 30000) {
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