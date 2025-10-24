import config from './config.js';
import WindUtils from './utils/WindUtils.js';
import WindDataManager from './WindDataManager.js';
import MapController from './MapController.js';
import ForecastManager from './ForecastManager.js';
import WindArrowController from './WindArrowController.js';
import HistoryManager from './HistoryManager.js';
import WindStatistics from './WindStatistics.js';
import LanguageManager from './LanguageManager.js';

class App {
    constructor() {
        // Инициализация языка первым
        this.languageManager = new LanguageManager();

        // Инициализация всех менеджеров
        this.windDataManager = new WindDataManager();
        this.mapController = new MapController();
        this.forecastManager = new ForecastManager(this.languageManager);
        this.historyManager = new HistoryManager();
        this.windStatistics = new WindStatistics();

        this.windArrowController = null; // Будет инициализирован после карты
        this.updateInterval = null;
        this.isInitialized = false;
        this.lastWindData = null; // Store last wind data for language switching
    }

    async init() {
        try {
            console.log('Инициализация JollyKite App...');

            // Инициализация языка
            this.initLanguageToggle();
            this.updateUILanguage();
            console.log('✓ Язык инициализирован:', this.languageManager.getCurrentLanguage());

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

            // Store last wind data for language switching
            this.lastWindData = windData;

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
        const t = (key) => this.languageManager.t(key);

        if (trendElement) {
            // Translate trend text
            let trendText = trend.text;
            if (trend.trend === 'strengthening') trendText = t('strengthening');
            else if (trend.trend === 'weakening') trendText = t('weakening');
            else if (trend.trend === 'stable') trendText = t('stable');
            else if (trend.trend === 'insufficient_data') trendText = t('insufficientData');

            trendElement.innerHTML = `
                <span style="font-size: 1.5em;">${trend.icon}</span>
                <span style="margin-left: 5px; font-weight: bold;">${trendText}</span>
            `;
            trendElement.style.color = trend.color;

            // Добавляем tooltip с подробной информацией
            if (trend.currentSpeed && trend.previousSpeed) {
                const changeText = trend.change > 0 ? `+${trend.change.toFixed(1)}` : trend.change.toFixed(1);
                const currentLang = this.languageManager.getCurrentLanguage();
                if (currentLang === 'ru') {
                    trendElement.title = `Сейчас: ${trend.currentSpeed.toFixed(1)} узлов\nБыло: ${trend.previousSpeed.toFixed(1)} узлов\nИзменение: ${changeText} узлов (${trend.percentChange.toFixed(1)}%)`;
                } else {
                    trendElement.title = `Now: ${trend.currentSpeed.toFixed(1)} knots\nBefore: ${trend.previousSpeed.toFixed(1)} knots\nChange: ${changeText} knots (${trend.percentChange.toFixed(1)}%)`;
                }
            } else {
                if (this.languageManager.getCurrentLanguage() === 'ru') {
                    trendElement.title = 'Накапливаем данные для анализа тренда (требуется 10 минут)';
                } else {
                    trendElement.title = 'Accumulating data for trend analysis (requires 10 minutes)';
                }
            }
        }
    }

    updateWindDisplay(windData) {
        // Обновление скорости ветра
        const windSpeedElement = document.getElementById('windSpeed');
        if (windSpeedElement) {
            windSpeedElement.textContent = windData.windSpeedKnots.toFixed(1);
        }

        // Обновление индикатора на градиентном баре
        const windSpeedIndicator = document.getElementById('windSpeedIndicator');
        if (windSpeedIndicator) {
            // Масштабируем скорость ветра на шкалу от 0 до 30+ узлов
            const maxSpeed = 30;
            const speed = Math.min(windData.windSpeedKnots, maxSpeed);
            const percentage = (speed / maxSpeed) * 100;
            windSpeedIndicator.style.left = `${percentage}%`;
        }

        // Обновление порывов ветра
        const windGustElement = document.getElementById('windGust');
        if (windGustElement) {
            windGustElement.textContent = (windData.windGustKnots !== null && windData.windGustKnots !== undefined)
                ? windData.windGustKnots.toFixed(1)
                : '--';
        }

        // Обновление максимального порыва сегодня
        const maxGustElement = document.getElementById('maxGust');
        if (maxGustElement) {
            maxGustElement.textContent = (windData.maxGustKnots !== null && windData.maxGustKnots !== undefined)
                ? windData.maxGustKnots.toFixed(1)
                : '--';
        }

        // Обновление направления и описания ветра
        this.updateWindDescription(windData);
    }

    updateWindDescription(windData) {
        const windDesc = this.getWindDescription(windData.windSpeedKnots, windData.windDir);
        const t = (key) => this.languageManager.t(key);

        const windIcon = document.getElementById('windIcon');
        const windTitle = document.getElementById('windTitle');
        const windSubtitle = document.getElementById('windSubtitle');
        const windCardinal = document.getElementById('windCardinal');

        if (windIcon) windIcon.textContent = windDesc.icon;
        if (windTitle) windTitle.textContent = windDesc.title;

        // windSubtitle показывает только статус безопасности и тип ветра (без скорости)
        if (windSubtitle && windData.safety) {
            let safetyText = '';
            let textColor = windData.safety.color;

            // Translate safety level
            let safetyLevel = windData.safety.text;
            if (windData.safety.level === 'low') safetyLevel = t('weakWind');
            else if (windData.safety.level === 'danger') safetyLevel = t('danger');
            else if (windData.safety.level === 'high') safetyLevel = t('excellentConditions');
            else if (windData.safety.level === 'good') safetyLevel = t('goodConditions');
            else if (windData.safety.level === 'medium') safetyLevel = t('moderate');

            // Добавляем информацию о типе ветра (offshore/onshore)
            if (windData.safety.isOffshore) {
                safetyText = t('dangerOffshore');
                textColor = '#FF4500'; // Красный для offshore - это всегда опасно!
            } else if (windData.safety.isOnshore) {
                safetyText = `${safetyLevel} • ${t('onshore')}`;
            } else {
                safetyText = `${safetyLevel} • ${t('sideshore')}`;
            }

            windSubtitle.textContent = safetyText;
            windSubtitle.style.color = textColor;
            windSubtitle.style.fontWeight = '600';
        }

        // Обновление направления ветра (румб)
        if (windCardinal) {
            windCardinal.textContent = this.degreesToCardinal(windData.windDir);
        }

    }

    degreesToCardinal(degrees) {
        return WindUtils.degreesToCardinal(degrees);
    }

    getWindDescription(speedKnots, degrees) {
        const t = (key) => this.languageManager.t(key);
        const speed = parseFloat(speedKnots) || 0;

        // Wind categories based on speed (in knots)
        if (speed < 5) {
            return {
                icon: '🍃',
                title: t('calm'),
                subtitle: t('calmSubtitle')
            };
        } else if (speed < 12) {
            return {
                icon: '💨',
                title: t('lightWind'),
                subtitle: `${speed.toFixed(1)} ${t('knots')}`
            };
        } else if (speed < 20) {
            return {
                icon: '🌬️',
                title: t('moderateWind'),
                subtitle: `${speed.toFixed(1)} ${t('knots')} - ${t('moderateSubtitle')}`
            };
        } else if (speed < 30) {
            return {
                icon: '💨',
                title: t('strongWind'),
                subtitle: `${speed.toFixed(1)} ${t('knots')} - ${t('strongSubtitle')}`
            };
        } else {
            return {
                icon: '⚡',
                title: t('extremeWind'),
                subtitle: `${speed.toFixed(1)} ${t('knots')} - ${t('extremeSubtitle')}`
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

    // Language Management Methods

    /**
     * Initialize language toggle button
     */
    initLanguageToggle() {
        const toggle = document.getElementById('languageToggle');
        if (!toggle) return;

        const currentLang = this.languageManager.getCurrentLanguage();
        this.updateLanguageToggleUI(currentLang);

        // Add click handlers to language options
        const langOptions = toggle.querySelectorAll('.lang-option');
        langOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                if (lang) {
                    this.switchLanguage(lang);
                }
            });
        });
    }

    /**
     * Switch to specified language
     */
    switchLanguage(lang) {
        if (this.languageManager.setLanguage(lang)) {
            this.updateLanguageToggleUI(lang);
            this.updateUILanguage();

            // Refresh wind data display with new language
            if (this.lastWindData) {
                this.updateWindDisplay(this.lastWindData);
            }

            // Refresh wind trend with new language
            this.updateWindTrend();

            // Refresh forecast with new language
            if (this.forecastManager) {
                this.updateForecast();
            }

            console.log('✓ Language switched to:', lang);
        }
    }

    /**
     * Update language toggle UI
     */
    updateLanguageToggleUI(currentLang) {
        const langOptions = document.querySelectorAll('.lang-option');
        langOptions.forEach(option => {
            if (option.dataset.lang === currentLang) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    /**
     * Update all UI text with current language
     */
    updateUILanguage() {
        const t = (key) => this.languageManager.t(key);

        // Update static text elements
        const elements = {
            'windSpeed': null, // Will be updated by wind data
            'windCardinal': null, // Will be updated by wind data
            'windGust': null, // Will be updated by wind data
            'maxGust': null, // Will be updated by wind data
        };

        // Update labels
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = t(key);
        });

        // Update footer
        const footer = document.querySelector('footer p');
        if (footer) {
            footer.innerHTML = `&copy; 2024 Pak Nam Pran. ${t('footer')}`;
        }
    }

    getCurrentWindData() {
        return this.lastWindData || {};
    }
}

export default App;