// Settings and i18n
import I18nManager from './i18n/I18nManager.js';
import SettingsManager from './settings/SettingsManager.js';
import LocalStorageManager from './settings/LocalStorageManager.js';
import MenuController from './settings/MenuController.js';
import UnitConverter from './utils/UnitConverter.js';

// App modules
import config from './config.js';
import WindUtils from './utils/WindUtils.js';
import WindDataManager from './WindDataManager.js';
import WindStreamManager from './WindStreamManager.js';
import MapController from './MapController.js';
import ForecastManager from './ForecastManager.js';
import WindArrowController from './WindArrowController.js';
import HistoryManager from './HistoryManager.js';
import WindStatistics from './WindStatistics.js';
import NotificationManager from './NotificationManager.js';
import KiteSizeSlider from './KiteSizeSlider.js';
import TodayWindTimeline from './TodayWindTimeline.js';
import WeekWindHistory from './WeekWindHistory.js';
import { rippleManager } from './MaterialRipple.js';

class App {
    constructor() {
        // Settings and i18n managers
        this.settingsManager = new SettingsManager();
        this.i18nManager = new I18nManager();
        this.menuController = null; // Будет инициализирован в init()

        // Инициализация всех менеджеров
        this.windDataManager = new WindDataManager();
        this.windStreamManager = new WindStreamManager('/api');
        this.mapController = new MapController();
        this.forecastManager = new ForecastManager(this.i18nManager);
        this.historyManager = new HistoryManager(this.i18nManager);
        this.windStatistics = new WindStatistics();
        this.notificationManager = new NotificationManager(this.i18nManager);
        this.kiteSizeSlider = new KiteSizeSlider(this.i18nManager);
        this.todayWindTimeline = new TodayWindTimeline(this.i18nManager, this.settingsManager);
        this.weekWindHistory = new WeekWindHistory(this.i18nManager);

        this.windArrowController = null; // Будет инициализирован после карты
        this.updateInterval = null;
        this.historyUpdateInterval = null;
        this.liveCounterInterval = null;
        this.workingHoursCheckInterval = null;
        this.lastUpdateTime = null;
        this.lastWindData = null; // Для перерисовки при изменении единиц
        this.isInitialized = false;

        // Рабочие часы станции (Bangkok time)
        this.workingHours = {
            start: 6,
            end: 19
        };
    }

    async init() {
        try {
            console.log('Инициализация JollyKite App...');

            // === ФАЗА 1: Инициализация настроек и i18n ===

            // 1. Загрузка настроек из LocalStorage
            this.settingsManager.loadSettings();
            console.log('✓ Настройки загружены');

            // Обновить версию в UI из единого источника
            this.updateVersionDisplay();

            // 2. Загрузка всех переводов
            await this.i18nManager.loadTranslations();
            console.log('✓ Переводы загружены');

            // 3. Определение языка (из настроек или браузера)
            let locale = this.settingsManager.getSetting('locale');
            if (!locale) {
                locale = this.i18nManager.detectBrowserLanguage();
                this.settingsManager.setSetting('locale', locale);
            }
            this.i18nManager.setLocale(locale);
            console.log('✓ Язык установлен:', locale);

            // Сохранить локаль для Service Worker (для пуш-уведомлений)
            await LocalStorageManager.saveLocaleForServiceWorker(locale);

            // Перевести всю страницу
            this.i18nManager.translatePage();
            console.log('✓ Страница переведена');

            // Make i18n, settings, and unitConverter available globally for all components
            window.i18n = this.i18nManager;
            window.settings = this.settingsManager;
            window.unitConverter = UnitConverter;
            console.log('✓ Глобальные объекты установлены (i18n, settings, unitConverter)');

            // 4. Инициализация контроллера меню
            this.menuController = new MenuController(
                this.settingsManager,
                this.i18nManager
            );
            if (this.menuController.init()) {
                console.log('✓ Меню настроек инициализировано');
            }

            // Подписка на изменение единиц измерения
            window.addEventListener('unitChanged', async () => {
                console.log('🔄 Unit changed, refreshing data...');
                // Перерисовать текущие данные о ветре
                if (this.lastWindData) {
                    this.updateWindDisplay(this.lastWindData);
                }
                // Перерисовать графики
                await this.loadInitialData();
            });

            // Подписка на изменение настроек райдера
            window.addEventListener('riderSettingsChanged', () => {
                console.log('🔄 Rider settings changed, updating display...');
                if (this.lastWindData) {
                    // Re-fetch and re-apply offset for direction calibration changes
                    this.updateWindData().catch(err => {
                        console.error('Error refreshing wind data:', err);
                    });
                    if (this.kiteSizeSlider) {
                        this.kiteSizeSlider.onSettingsChange();
                    }
                }
            });

            // === ФАЗА 2: Инициализация основного приложения ===

            // Проверка и обновление видимости секций в зависимости от времени работы станции
            this.updateWorkingHoursVisibility();

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

            // Инициализация слайдера с размерами кайтов
            if (!this.kiteSizeSlider.init()) {
                console.warn('⚠ Не удалось инициализировать слайдер кайтов');
            } else {
                console.log('✓ Слайдер кайтов инициализирован');
            }

            // Инициализация графика ветра на сегодня
            if (!this.todayWindTimeline.init()) {
                console.warn('⚠ Не удалось инициализировать график ветра на сегодня');
            } else {
                console.log('✓ График ветра на сегодня инициализирован');
            }

            // Инициализация истории ветра за 7 дней
            if (!this.weekWindHistory.init()) {
                console.warn('⚠ Не удалось инициализировать историю ветра за 7 дней');
            } else {
                console.log('✓ История ветра за 7 дней инициализирована');
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

            // Инициализация кнопки уведомлений (один раз, не при каждом loadInitialData)
            this.setupNotificationButton();

            // Подключение к SSE для real-time обновлений (только в рабочие часы)
            if (this.isWithinWorkingHours()) {
                this.connectToWindStream();
            }

            // Запуск обновления истории (forecast обновляется по-прежнему по таймеру)
            this.startHistoryUpdate();

            // Запуск проверки рабочих часов (каждую минуту)
            this.startWorkingHoursCheck();

            // Инициализация Material Design 3 Ripple эффектов
            rippleManager.init();
            console.log('✓ Material Design 3 Ripple эффекты инициализированы');

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

        // Загрузка графика на сегодня (история + прогноз)
        try {
            await this.updateTodayTimeline();
            console.log('✓ График на сегодня загружен');
        } catch (error) {
            console.error('⚠ Ошибка загрузки графика на сегодня:', error);
        }

        // Загрузка истории за 7 дней
        try {
            await this.updateWeekHistory();
            console.log('✓ История за 7 дней загружена');
        } catch (error) {
            console.error('⚠ Ошибка загрузки истории за 7 дней:', error);
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

    setupNotificationButton() {
        const button = document.getElementById('notificationButton');
        if (!button) return;

        // Update button state
        this.notificationManager.updateUI(button);

        // Handle button click
        button.addEventListener('click', async () => {
            try {
                button.disabled = true;
                const isSubscribed = await this.notificationManager.isSubscribed();

                if (isSubscribed) {
                    await this.notificationManager.unsubscribe();
                    alert('✓ Вы отписались от уведомлений');
                } else {
                    await this.notificationManager.subscribe();
                    alert('✓ Вы подписались на уведомления о ветре! Вы получите уведомление когда ветер усилится выше 10 узлов (не чаще 1 раза в день)');
                }

                // Update button state
                await this.notificationManager.updateUI(button);
            } catch (error) {
                console.error('Error toggling notifications:', error);
                alert('❌ Ошибка: ' + error.message);
                button.disabled = false;
            }
        });
    }

    /**
     * Connect to SSE stream for real-time wind updates
     */
    connectToWindStream() {
        console.log('🔄 Подключение к потоку real-time обновлений...');

        this.windStreamManager.connect((windData, trend) => {
            try {
                // Обновление времени последнего обновления из timestamp данных с сервера
                if (windData.timestamp) {
                    this.lastUpdateTime = new Date(windData.timestamp);
                    console.log('📅 Время данных с ветрометра:', this.lastUpdateTime.toISOString());
                }

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

                // Обновление тренда с данными из backend
                this.updateWindTrendFromBackend(trend);

                // Сохранение в историю
                if (this.historyManager.isStorageAvailable()) {
                    this.historyManager.saveWindData(windData);
                }
            } catch (error) {
                console.error('Ошибка обработки SSE обновления:', error);
            }
        });

        // Запуск счетчика времени с последнего обновления
        this.startLiveCounter();
    }

    async updateWindData() {
        try {
            const windData = await this.windDataManager.fetchCurrentWindData();

            // Обновление времени последнего обновления из timestamp данных с сервера
            if (windData.timestamp) {
                this.lastUpdateTime = new Date(windData.timestamp);
                console.log('📅 Время данных с ветрометра:', this.lastUpdateTime.toISOString());
            }

            // Получение информации о безопасности
            const safety = this.windDataManager.getWindSafety(
                windData.windDir,
                windData.windSpeedKnots
            );

            // Обновление данных с информацией о безопасности
            windData.safety = safety;

            // Сохранить данные для перерисовки при изменении единиц
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

    /**
     * Update wind trend with data from SSE (faster than API call)
     */
    updateWindTrendFromBackend(trend) {
        const trendIconElement = document.getElementById('trendIcon');
        const trendTextElement = document.getElementById('trendText');
        const trendElement = document.getElementById('windTrend');

        if (trendIconElement && trendTextElement && trend) {
            // Map backend trend types to i18n keys
            const trendTextMap = {
                'stable': 'trends.stable',
                'increasing_strong': 'trends.strengthening',
                'increasing': 'trends.slightlyIncreasing',
                'decreasing_strong': 'trends.weakening',
                'decreasing': 'trends.slightlyDecreasing'
            };
            const trendKey = trendTextMap[trend.trend] || 'trends.stable';
            const trendText = this.i18nManager.t(trendKey);

            // Иконка тренда
            trendIconElement.textContent = trend.icon;
            trendIconElement.style.color = trend.color;

            // Текст с названием, процентами и периодом в одну строку
            if (trend.percentChange !== undefined && trend.percentChange !== 0) {
                const percentText = trend.percentChange > 0 ?
                    `+${Math.abs(trend.percentChange).toFixed(1)}%` :
                    `-${Math.abs(trend.percentChange).toFixed(1)}%`;
                const for30min = this.i18nManager.t('trends.for30min');
                trendTextElement.innerHTML = `<span style="font-weight: 600;">${trendText}</span> ${percentText} <span style="opacity: 0.7;">(${for30min})</span>`;
                trendTextElement.style.color = trend.color;
            } else {
                const accumulatingText = this.i18nManager.t('trends.accumulatingData');
                trendTextElement.innerHTML = `<span style="opacity: 0.7;">${accumulatingText}</span>`;
                trendTextElement.style.color = '#808080';
            }

            // Tooltip с подробной информацией о методе скользящего окна
            if (trendElement) {
                if (trend.currentSpeed && trend.previousSpeed) {
                    const changeText = trend.change > 0 ? `+${trend.change.toFixed(1)}` : trend.change.toFixed(1);
                    trendElement.title = `${trendText}\n\nМетод скользящего окна:\n• Последние 30 мин: ${trend.currentSpeed.toFixed(1)} узлов\n• Предыдущие 30 мин: ${trend.previousSpeed.toFixed(1)} узлов\n• Изменение: ${changeText} узлов (${trend.percentChange.toFixed(1)}%)\n\nАнализ обновляется каждые 5 минут`;
                } else {
                    trendElement.title = 'Накапливаем данные для анализа тренда\n(требуется 60 минут данных с интервалом 5 мин)';
                }
            }
        }

        // Обновление тренда направления
        this.updateDirectionTrend(trend);
    }

    updateDirectionTrend(trend) {
        const dirIconEl = document.getElementById('dirTrendIcon');
        const dirTextEl = document.getElementById('dirTrendText');
        const dirTrendEl = document.getElementById('windDirTrend');

        if (!dirIconEl || !dirTextEl || !dirTrendEl) return;

        if (!trend || !trend.directionTrend || trend.directionTrend === 'insufficient_data') {
            dirTrendEl.style.display = 'none';
            return;
        }

        dirTrendEl.style.display = 'flex';
        dirIconEl.textContent = trend.directionIcon;

        const dirTextMap = {
            'stable': 'trends.directionStable',
            'variable': 'trends.directionVariable',
            'changing': 'trends.directionChanging'
        };
        const dirKey = dirTextMap[trend.directionTrend] || 'trends.directionStable';
        const dirText = this.i18nManager.t(dirKey);

        if (trend.directionSpread > 0) {
            dirTextEl.innerHTML = `<span style="font-weight: 600;">${dirText}</span> <span style="opacity: 0.7;">(±${trend.directionSpread}°)</span>`;
        } else {
            dirTextEl.innerHTML = `<span style="font-weight: 600;">${dirText}</span>`;
        }
    }

    async updateWindTrend() {
        // Fetch trend from backend instead of calculating on frontend
        const trend = await this.windDataManager.fetchWindTrend();
        this.updateWindTrendFromBackend(trend);
    }

    updateWindDisplay(windData) {
        // Get current unit setting
        const currentUnit = this.settingsManager.getSetting('windSpeedUnit') || 'knots';
        const unitSymbol = UnitConverter.getUnitSymbol(currentUnit);

        // Обновление скорости ветра
        const windSpeedElement = document.getElementById('windSpeed');
        if (windSpeedElement) {
            const speed = UnitConverter.convert(windData.windSpeedKnots, 'knots', currentUnit);
            windSpeedElement.textContent = speed.toFixed(1);
        }

        // Обновление единиц измерения
        const windSpeedUnitElement = document.getElementById('windSpeedUnit');
        if (windSpeedUnitElement) {
            windSpeedUnitElement.textContent = unitSymbol;
        }

        // Обновление единицы измерения в заголовке графика
        const todayTimelineUnitElement = document.getElementById('todayTimelineUnit');
        if (todayTimelineUnitElement) {
            todayTimelineUnitElement.textContent = `(${unitSymbol})`;
        }

        // Обновление рекомендаций по размеру кайта (всегда в узлах)
        if (this.kiteSizeSlider) {
            this.kiteSizeSlider.updateRecommendations(windData.windSpeedKnots);
        }

        // Обновление рекомендации кайта в блоке ветра
        this.updateRecommendedKite(windData.windSpeedKnots);

        // Обновление индикатора на градиентном баре (позиция всегда в узлах - привязана к цветовым зонам)
        const windSpeedIndicator = document.getElementById('windSpeedIndicator');
        if (windSpeedIndicator) {
            const maxSpeed = 30;
            const speed = Math.min(windData.windSpeedKnots, maxSpeed);
            const percentage = (speed / maxSpeed) * 100;
            windSpeedIndicator.style.left = `${percentage}%`;
        }

        // Обновление меток шкалы градиентного бара
        this.updateWindBarLabels(currentUnit);

        // Обновление порывов ветра
        const windGustElement = document.getElementById('windGust');
        if (windGustElement) {
            if (windData.windGustKnots !== null && windData.windGustKnots !== undefined) {
                const gust = UnitConverter.convert(windData.windGustKnots, 'knots', currentUnit);
                windGustElement.textContent = gust.toFixed(1);
            } else {
                windGustElement.textContent = '--';
            }
        }

        // Обновление единицы измерения для порывов
        const windGustUnitElement = document.getElementById('windGustUnit');
        if (windGustUnitElement) {
            windGustUnitElement.textContent = unitSymbol;
        }

        // Обновление максимального порыва сегодня
        const maxGustElement = document.getElementById('maxGust');
        if (maxGustElement) {
            if (windData.maxGustKnots !== null && windData.maxGustKnots !== undefined) {
                const maxGust = UnitConverter.convert(windData.maxGustKnots, 'knots', currentUnit);
                maxGustElement.textContent = maxGust.toFixed(1);
            } else {
                maxGustElement.textContent = '--';
            }
        }

        // Обновление единицы измерения для максимального порыва
        const maxGustUnitElement = document.getElementById('maxGustUnit');
        if (maxGustUnitElement) {
            maxGustUnitElement.textContent = unitSymbol;
        }

        // Обновление направления и описания ветра
        this.updateWindDescription(windData);
    }

    updateWindBarLabels(currentUnit) {
        const labelsContainer = document.getElementById('windBarLabels');
        if (!labelsContainer) return;

        const knotValues = [0, 5, 10, 15, 20, 25, 30];
        const spans = labelsContainer.querySelectorAll('span');
        if (spans.length !== knotValues.length) return;

        knotValues.forEach((knots, i) => {
            const displayValue = UnitConverter.convert(knots, 'knots', currentUnit);
            const isLast = i === knotValues.length - 1;
            spans[i].textContent = isLast
                ? `${Math.round(displayValue)}+`
                : `${Math.round(displayValue)}`;
        });
    }

    updateRecommendedKite(windSpeedKnots) {
        const el = document.getElementById('recommendedKite');
        if (!el) return;

        if (!this.kiteSizeSlider || !this.kiteSizeSlider.calculator) {
            el.textContent = '';
            return;
        }

        const riderWeight = this.settingsManager.getSetting('riderWeight') || 75;
        const boardType = this.settingsManager.getSetting('boardType') || 'twintip';
        const calcParams = config.kiteSize.calculation[boardType];

        // Проверяем что ветер в допустимом диапазоне
        if (windSpeedKnots < calcParams.minWind || windSpeedKnots > calcParams.maxWind) {
            el.textContent = '';
            return;
        }

        const calculator = this.kiteSizeSlider.calculator;
        const optimalSize = calculator.calculateOptimalKiteSize(riderWeight, windSpeedKnots, boardType);

        // Проверяем что оптимальный размер в разумном диапазоне доступных размеров
        const sizes = calcParams.sizes;
        const maxSize = Math.max(...sizes);
        const minSize = Math.min(...sizes);
        if (optimalSize > maxSize * 1.3 || optimalSize < minSize * 0.7) {
            el.textContent = '';
            return;
        }

        const closestSize = calculator.findClosestKiteSize(optimalSize, boardType);
        const icon = boardType === 'wingfoil' ? '🪽' : '🪁';

        if (closestSize) {
            el.innerHTML = `<span style="opacity: 0.5;">|</span> <span style="font-weight: 600;">${icon} ${closestSize}м</span>`;
        } else {
            el.textContent = '';
        }
    }

    updateWindDescription(windData) {
        const windDesc = this.getWindDescription(windData.windSpeedKnots, windData.windDir);

        const windIcon = document.getElementById('windIcon');
        const windTitle = document.getElementById('windTitle');
        const windSubtitle = document.getElementById('windSubtitle');
        const windCardinal = document.getElementById('windCardinal');

        if (windIcon) windIcon.textContent = windDesc.icon;
        if (windTitle) windTitle.textContent = windDesc.title;

        // windSubtitle показывает только статус безопасности и тип ветра (без скорости)
        if (windSubtitle && windData.safety) {
            let safetyText = windData.safety.text + ' • ';
            let textColor = windData.safety.color;

            // Добавляем информацию о типе ветра (offshore/onshore) с переводом
            if (windData.safety.isOffshore) {
                safetyText = this.i18nManager.t('info.dangerOffshore');
                textColor = '#FF4500'; // Красный для offshore - это всегда опасно!
            } else if (windData.safety.isOnshore) {
                safetyText += this.i18nManager.t('info.onshore');
            } else {
                safetyText += this.i18nManager.t('info.sideshore');
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

    async updateTodayTimeline() {
        try {
            await this.todayWindTimeline.displayTimeline();
        } catch (error) {
            console.error('Error updating today timeline:', error);
            this.todayWindTimeline.showError(error);
        }
    }

    async updateWeekHistory() {
        try {
            await this.weekWindHistory.displayHistory();
        } catch (error) {
            console.error('Error updating week history:', error);
            this.weekWindHistory.showError(error);
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

        if (windTitle) windTitle.textContent = this.i18nManager.t('app.error');
        if (windSubtitle) windSubtitle.textContent = message;
        if (windIcon) windIcon.textContent = '⚠️';
    }

    /**
     * Start periodic history update (wind updates come via SSE)
     */
    startHistoryUpdate() {
        // Обновление графика ветра на сегодня каждые 5 минут
        this.historyUpdateInterval = setInterval(async () => {
            try {
                await this.updateTodayTimeline();
                console.log('✓ График на сегодня обновлен');
            } catch (error) {
                console.error('Ошибка обновления графика на сегодня:', error);
            }
        }, 5 * 60 * 1000); // 5 минут

        console.log('✓ Периодическое обновление истории запущено (каждые 5 минут)');
    }

    /**
     * Start LIVE counter showing data timestamp
     */
    startLiveCounter() {
        const counterElement = document.getElementById('updateCountdown');
        if (!counterElement) return;

        // Don't initialize lastUpdateTime here - it will be set from server data

        // Update counter every second
        this.liveCounterInterval = setInterval(() => {
            if (!this.lastUpdateTime) {
                counterElement.textContent = this.i18nManager.t('app.loading');
                return;
            }

            // Calculate seconds ago
            const now = new Date();
            const secondsAgo = Math.floor((now - this.lastUpdateTime) / 1000);

            // Format time as HH:MM
            const hours = this.lastUpdateTime.getHours().toString().padStart(2, '0');
            const minutes = this.lastUpdateTime.getMinutes().toString().padStart(2, '0');

            // Show different messages based on how long ago
            let displayText;
            if (secondsAgo < 60) {
                const secondsText = this.i18nManager.t('info.secondsAgo');
                displayText = `${secondsAgo}${secondsText}`;
            } else if (secondsAgo < 3600) {
                const minutesAgo = Math.floor(secondsAgo / 60);
                const minutesText = this.i18nManager.t('info.minutesAgo');
                displayText = `${minutesAgo}${minutesText}`;
            } else {
                const atText = this.i18nManager.t('info.at');
                displayText = `${atText} ${hours}:${minutes}`;
            }

            counterElement.textContent = displayText;
        }, 1000);

        console.log('✓ LIVE счетчик запущен');
    }

    /**
     * Check if current time is within working hours (6:00-19:00 Bangkok time)
     */
    isWithinWorkingHours() {
        const bangkokTime = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Bangkok',
            hour12: false
        });
        const hour = parseInt(new Date(bangkokTime).getHours());
        return hour >= this.workingHours.start && hour < this.workingHours.end;
    }

    /**
     * Update visibility of sections based on working hours
     */
    updateWorkingHoursVisibility() {
        const isWorking = this.isWithinWorkingHours();

        const offlineNotice = document.getElementById('offlineNotice');
        const currentWindSection = document.getElementById('currentWindSection');
        const mapSection = document.getElementById('mapSection');

        if (isWorking) {
            // Рабочие часы: показываем данные о ветре и карту, скрываем уведомление
            if (offlineNotice) offlineNotice.style.display = 'none';
            if (currentWindSection) currentWindSection.style.display = 'block';
            if (mapSection) mapSection.style.display = 'block';
        } else {
            // Не рабочие часы: скрываем данные о ветре и карту, показываем уведомление
            if (offlineNotice) offlineNotice.style.display = 'block';
            if (currentWindSection) currentWindSection.style.display = 'none';
            if (mapSection) mapSection.style.display = 'none';
        }

        console.log(`📅 Статус станции: ${isWorking ? 'Работает' : 'Не работает'} (проверка рабочих часов 6:00-19:00)`);
    }

    /**
     * Start periodic check of working hours
     */
    startWorkingHoursCheck() {
        // Проверка каждую минуту
        this.workingHoursCheckInterval = setInterval(() => {
            const wasWorking = this.isWithinWorkingHours();
            this.updateWorkingHoursVisibility();
            const isWorking = this.isWithinWorkingHours();

            // Если статус изменился
            if (wasWorking !== isWorking) {
                if (isWorking) {
                    // Начались рабочие часы - подключаемся к SSE
                    console.log('🌅 Начались рабочие часы - подключение к SSE...');
                    this.connectToWindStream();
                } else {
                    // Закончились рабочие часы - отключаемся от SSE
                    console.log('🌙 Рабочие часы закончились - отключение от SSE...');
                    if (this.windStreamManager) {
                        this.windStreamManager.disconnect();
                    }
                }
            }
        }, 60000); // Проверка каждую минуту

        console.log('✓ Проверка рабочих часов запущена (каждую минуту)');
    }

    stopAutoUpdate() {
        // Disconnect from SSE stream
        if (this.windStreamManager) {
            this.windStreamManager.disconnect();
            console.log('SSE соединение закрыто');
        }

        // Stop history updates
        if (this.historyUpdateInterval) {
            clearInterval(this.historyUpdateInterval);
            this.historyUpdateInterval = null;
            console.log('Обновление истории остановлено');
        }

        // Stop LIVE counter
        if (this.liveCounterInterval) {
            clearInterval(this.liveCounterInterval);
            this.liveCounterInterval = null;
            console.log('LIVE счетчик остановлен');
        }

        // Stop working hours check
        if (this.workingHoursCheckInterval) {
            clearInterval(this.workingHoursCheckInterval);
            this.workingHoursCheckInterval = null;
            console.log('Проверка рабочих часов остановлена');
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

    /**
     * Update version display in UI from version.json (single source of truth)
     */
    async updateVersionDisplay() {
        let version = SettingsManager.DEFAULT_SETTINGS.version;
        try {
            const response = await fetch('/version.json');
            if (response.ok) {
                const data = await response.json();
                version = data.version;
            }
        } catch (e) {
            // Fallback to SettingsManager default
        }
        document.querySelectorAll('.app-version').forEach(el => {
            el.textContent = `JollyKite v${version}`;
        });
        document.querySelectorAll('.version-number').forEach(el => {
            el.textContent = `v${version}`;
        });
        console.log('✓ Версия приложения:', version);
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