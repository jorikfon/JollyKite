import config from './config.js';
import WindUtils from './utils/WindUtils.js';

class WindStatistics {
    constructor() {
        this.windHistory = [];
        this.maxHistoryMinutes = config.statistics.maxHistoryMinutes;
        this.analysisIntervalMinutes = config.statistics.analysisIntervalMinutes;
        this.storageKey = config.storage.statistics;

        // Восстанавливаем данные из localStorage при инициализации
        this.loadFromStorage();
    }

    /**
     * Загрузка данных из localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                // Восстанавливаем timestamp как объекты Date
                this.windHistory = data.map(m => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));

                // Очищаем устаревшие данные
                this.cleanOldData();

                console.log(`✓ Загружено ${this.windHistory.length} измерений из кеша`);
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики из кеша:', error);
            this.windHistory = [];
        }
    }

    /**
     * Сохранение данных в localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.windHistory));
        } catch (error) {
            console.error('Ошибка сохранения статистики в кеш:', error);
        }
    }

    /**
     * Добавление нового измерения ветра
     * @param {Object} windData - Данные о ветре (windSpeedKnots, windDir, timestamp)
     */
    addMeasurement(windData) {
        const measurement = {
            speed: windData.windSpeedKnots,
            direction: windData.windDir,
            gust: windData.windGustKnots,
            timestamp: windData.timestamp || new Date()
        };

        this.windHistory.push(measurement);

        // Очищаем старые данные (старше maxHistoryMinutes)
        this.cleanOldData();

        // Сохраняем в localStorage
        this.saveToStorage();
    }

    /**
     * Очистка устаревших данных
     */
    cleanOldData() {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - this.maxHistoryMinutes * 60 * 1000);

        const beforeCount = this.windHistory.length;
        this.windHistory = this.windHistory.filter(m => m.timestamp >= cutoffTime);

        // Если удалили записи, сохраняем обновленные данные
        if (beforeCount !== this.windHistory.length) {
            this.saveToStorage();
        }
    }

    /**
     * Получение средней скорости за заданный период
     * @param {number} minutes - Период в минутах
     * @returns {number} Средняя скорость или null если данных недостаточно
     */
    getAverageSpeed(minutes) {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - minutes * 60 * 1000);

        const recentMeasurements = this.windHistory.filter(m => m.timestamp >= cutoffTime);

        if (recentMeasurements.length === 0) {
            return null;
        }

        const sum = recentMeasurements.reduce((acc, m) => acc + m.speed, 0);
        return sum / recentMeasurements.length;
    }

    /**
     * Анализ тренда ветра (раздувает/затихает)
     * @returns {Object} Объект с информацией о тренде
     */
    analyzeTrend() {
        // Нужно минимум 2 измерения для анализа
        if (this.windHistory.length < 2) {
            return {
                trend: 'insufficient_data',
                text: 'Недостаточно данных',
                icon: '⏳',
                color: '#808080'
            };
        }

        // Определяем период анализа в зависимости от доступных данных
        // Минимум 15 минут, предпочтительно 30 минут
        let analysisMinutes = 15;

        // Проверяем, есть ли данные за 30 минут
        const dataAge = this.getDataAge();
        if (dataAge >= 60) {
            // Если данных >= 60 минут, используем 30-минутные периоды
            analysisMinutes = 30;
        }

        // Получаем среднюю скорость за последние N минут
        const currentAverage = this.getAverageSpeed(analysisMinutes);

        // Получаем среднюю скорость за предыдущие N минут (N-2N минут назад)
        const previousAverage = this.getAverageInTimeRange(
            analysisMinutes,
            analysisMinutes * 2
        );

        if (currentAverage === null || previousAverage === null) {
            return {
                trend: 'insufficient_data',
                text: 'Накапливаем данные...',
                icon: '⏳',
                color: '#808080',
                currentSpeed: currentAverage,
                previousSpeed: previousAverage
            };
        }

        // Вычисляем изменение
        const speedChange = currentAverage - previousAverage;
        const percentChange = (speedChange / previousAverage) * 100;

        // Определяем тренд на основе изменения скорости
        // Используем порог 10% для более стабильных результатов
        const i18n = window.i18n;

        if (Math.abs(percentChange) < 10) {
            // Изменение меньше 10% - стабильно
            return {
                trend: 'stable',
                text: i18n ? i18n.t('trends.stable') : 'Стабильный',
                icon: '➡️',
                color: '#4169E1',
                currentSpeed: currentAverage,
                previousSpeed: previousAverage,
                change: speedChange,
                percentChange: percentChange
            };
        } else if (speedChange > 0) {
            // Усиливается
            return {
                trend: 'strengthening',
                text: i18n ? i18n.t('trends.strengthening') : 'Раздувает',
                icon: '↗️',
                color: '#FF8C00',
                currentSpeed: currentAverage,
                previousSpeed: previousAverage,
                change: speedChange,
                percentChange: percentChange
            };
        } else {
            // Ослабевает
            return {
                trend: 'weakening',
                text: i18n ? i18n.t('trends.weakening') : 'Затихает',
                icon: '↘️',
                color: '#87CEEB',
                currentSpeed: currentAverage,
                previousSpeed: previousAverage,
                change: speedChange,
                percentChange: percentChange
            };
        }
    }

    /**
     * Получение возраста данных (насколько старая самая старая запись)
     * @returns {number} Возраст в минутах
     */
    getDataAge() {
        if (this.windHistory.length === 0) {
            return 0;
        }

        const now = new Date();
        const oldest = this.windHistory[0].timestamp;
        const ageMs = now.getTime() - oldest.getTime();
        return ageMs / (60 * 1000); // Convert to minutes
    }

    /**
     * Получение средней скорости за период времени (от startMinutes до endMinutes назад)
     * @param {number} startMinutes - Начало периода (минут назад)
     * @param {number} endMinutes - Конец периода (минут назад)
     * @returns {number} Средняя скорость или null
     */
    getAverageInTimeRange(startMinutes, endMinutes) {
        const now = new Date();
        const startTime = new Date(now.getTime() - endMinutes * 60 * 1000);
        const endTime = new Date(now.getTime() - startMinutes * 60 * 1000);

        const measurements = this.windHistory.filter(
            m => m.timestamp >= startTime && m.timestamp < endTime
        );

        if (measurements.length === 0) {
            return null;
        }

        const sum = measurements.reduce((acc, m) => acc + m.speed, 0);
        return sum / measurements.length;
    }

    /**
     * Получение статистики за последний период
     * @param {number} minutes - Период в минутах
     * @returns {Object} Статистика
     */
    getStatistics(minutes = 60) {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - minutes * 60 * 1000);
        const measurements = this.windHistory.filter(m => m.timestamp >= cutoffTime);

        if (measurements.length === 0) {
            return null;
        }

        const speeds = measurements.map(m => m.speed);
        const gusts = measurements.map(m => m.gust).filter(g => g !== undefined && g !== null);

        return {
            count: measurements.length,
            avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
            minSpeed: Math.min(...speeds),
            maxSpeed: Math.max(...speeds),
            avgGust: gusts.length > 0 ? gusts.reduce((a, b) => a + b, 0) / gusts.length : null,
            maxGust: gusts.length > 0 ? Math.max(...gusts) : null,
            period: minutes
        };
    }

    /**
     * Получение количества измерений в истории
     * @returns {number}
     */
    getMeasurementCount() {
        return this.windHistory.length;
    }

    /**
     * Очистка всей истории
     */
    clearHistory() {
        this.windHistory = [];
        this.saveToStorage();
        console.log('✓ История статистики очищена');
    }

    /**
     * Экспорт истории для отладки
     * @returns {Array}
     */
    exportHistory() {
        return this.windHistory.map(m => ({
            speed: m.speed.toFixed(1),
            direction: m.direction,
            gust: m.gust ? m.gust.toFixed(1) : '--',
            time: m.timestamp.toLocaleTimeString('ru-RU')
        }));
    }

    /**
     * Получение информации о кеше
     * @returns {Object}
     */
    getCacheInfo() {
        const oldest = this.windHistory.length > 0
            ? this.windHistory[0].timestamp
            : null;
        const newest = this.windHistory.length > 0
            ? this.windHistory[this.windHistory.length - 1].timestamp
            : null;

        const sizeInBytes = new Blob([JSON.stringify(this.windHistory)]).size;
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);

        return {
            entries: this.windHistory.length,
            sizeKB: sizeInKB,
            sizeBytes: sizeInBytes,
            oldestEntry: oldest,
            newestEntry: newest,
            storageKey: this.storageKey,
            maxHistoryMinutes: this.maxHistoryMinutes
        };
    }
}

export default WindStatistics;
