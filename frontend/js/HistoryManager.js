class HistoryManager {
    constructor(i18n = null) {
        this.i18n = i18n;
        this.storageKey = 'jolly-kite-wind-history';
        this.maxHistoryEntries = 100; // Максимальное количество записей
    }

    // Сохранение данных о ветре в историю
    saveWindData(windData) {
        try {
            const historyEntry = {
                timestamp: new Date().toISOString(),
                windSpeed: windData.windSpeedKnots,
                windDirection: windData.windDir,
                windGust: windData.windGustKnots,
                windDirAvg: windData.windDirAvg,
                temperature: windData.temperature,
                humidity: windData.humidity,
                pressure: windData.pressure,
                safety: windData.safety || null
            };

            const history = this.getHistory();
            history.unshift(historyEntry); // Добавляем в начало

            // Ограничиваем количество записей
            if (history.length > this.maxHistoryEntries) {
                history.splice(this.maxHistoryEntries);
            }

            localStorage.setItem(this.storageKey, JSON.stringify(history));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в историю:', error);
            return false;
        }
    }

    // Получение истории данных
    getHistory() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Ошибка чтения истории:', error);
            return [];
        }
    }

    // Получение истории за определенный период
    getHistoryByPeriod(hours = 24) {
        const history = this.getHistory();
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - hours);

        return history.filter(entry => 
            new Date(entry.timestamp) > cutoffTime
        );
    }

    // Получение статистики за период
    getWindStatistics(hours = 24) {
        const data = this.getHistoryByPeriod(hours);
        
        if (data.length === 0) {
            return null;
        }

        const speeds = data.map(entry => entry.windSpeed);
        const directions = data.map(entry => entry.windDirection);

        return {
            entries: data.length,
            period: hours,
            windSpeed: {
                min: Math.min(...speeds),
                max: Math.max(...speeds),
                avg: speeds.reduce((a, b) => a + b, 0) / speeds.length
            },
            mostCommonDirection: this.getMostCommonDirection(directions),
            lastUpdate: data[0].timestamp,
            firstEntry: data[data.length - 1].timestamp
        };
    }

    // Получение наиболее частого направления ветра
    getMostCommonDirection(directions) {
        const directionRanges = {
            'С': [337.5, 22.5],
            'СВ': [22.5, 67.5],
            'В': [67.5, 112.5],
            'ЮВ': [112.5, 157.5],
            'Ю': [157.5, 202.5],
            'ЮЗ': [202.5, 247.5],
            'З': [247.5, 292.5],
            'СЗ': [292.5, 337.5]
        };

        const directionCounts = {};
        
        directions.forEach(dir => {
            for (const [direction, [min, max]] of Object.entries(directionRanges)) {
                if (direction === 'С') {
                    // Особый случай для севера (переход через 0°)
                    if (dir >= min || dir < max) {
                        directionCounts[direction] = (directionCounts[direction] || 0) + 1;
                        break;
                    }
                } else {
                    if (dir >= min && dir < max) {
                        directionCounts[direction] = (directionCounts[direction] || 0) + 1;
                        break;
                    }
                }
            }
        });

        // Находим самое частое направление
        let maxCount = 0;
        let mostCommon = 'Не определено';
        
        for (const [direction, count] of Object.entries(directionCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = direction;
            }
        }

        return { direction: mostCommon, count: maxCount, percentage: (maxCount / directions.length * 100).toFixed(1) };
    }

    // Экспорт истории в JSON
    exportHistoryJSON(hours = null) {
        const data = hours ? this.getHistoryByPeriod(hours) : this.getHistory();
        const statistics = this.getWindStatistics(hours || 24 * 7); // Неделя по умолчанию
        
        const exportData = {
            exportDate: new Date().toISOString(),
            location: 'Pak Nam Pran, Thailand',
            spot: 'JollyKite',
            coordinates: [12.346596280786017, 99.99817902532192],
            statistics: statistics,
            entries: data.length,
            data: data
        };

        return JSON.stringify(exportData, null, 2);
    }

    // Экспорт в CSV формат
    exportHistoryCSV(hours = null) {
        const data = hours ? this.getHistoryByPeriod(hours) : this.getHistory();
        
        if (data.length === 0) {
            return 'Нет данных для экспорта';
        }

        const headers = [
            'Дата и время',
            'Скорость ветра (узлы)',
            'Направление ветра (°)',
            'Порывы (узлы)',
            'Среднее направление',
            'Температура (°F)',
            'Влажность (%)',
            'Давление (inHg)'
        ];

        const csvRows = [headers.join(',')];

        const locale = this.i18n ? this.i18n.getFullLocale() : 'ru-RU';
        data.forEach(entry => {
            const row = [
                new Date(entry.timestamp).toLocaleString(locale),
                entry.windSpeed.toFixed(1),
                entry.windDirection,
                entry.windGust.toFixed(1),
                entry.windDirAvg,
                entry.temperature.toFixed(1),
                entry.humidity,
                entry.pressure.toFixed(2)
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    // Очистка истории
    clearHistory() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Ошибка очистки истории:', error);
            return false;
        }
    }

    // Получение размера хранилища
    getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? new Blob([data]).size : 0;
        } catch (error) {
            console.error('Ошибка получения размера:', error);
            return 0;
        }
    }

    // Проверка доступности localStorage
    isStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Импорт данных из JSON
    importFromJSON(jsonString) {
        try {
            const importedData = JSON.parse(jsonString);
            
            if (!importedData.data || !Array.isArray(importedData.data)) {
                throw new Error('Неверный формат данных');
            }

            localStorage.setItem(this.storageKey, JSON.stringify(importedData.data));
            return { success: true, entries: importedData.data.length };
        } catch (error) {
            console.error('Ошибка импорта:', error);
            return { success: false, error: error.message };
        }
    }
}

export default HistoryManager;