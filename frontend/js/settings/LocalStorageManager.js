/**
 * LocalStorageManager - управление данными в LocalStorage
 *
 * Обеспечивает типобезопасную работу с localStorage,
 * автоматическую сериализацию/десериализацию данных
 * и обработку ошибок.
 */
class LocalStorageManager {
  /**
   * Ключи для хранения данных
   */
  static KEYS = {
    SETTINGS: 'jollyKite_settings',
    WIND_HISTORY: 'jollyKite_windHistory',
    VERSION: 'jollyKite_version',
  };

  /**
   * Получить значение из localStorage
   * @param {string} key - Ключ
   * @param {*} defaultValue - Значение по умолчанию
   * @returns {*} Значение или defaultValue
   */
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);

      if (item === null) {
        return defaultValue;
      }

      // Попытка парсинга JSON
      try {
        return JSON.parse(item);
      } catch {
        // Если не JSON, вернуть как есть
        return item;
      }
    } catch (error) {
      console.error(`LocalStorage get error for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Сохранить значение в localStorage
   * @param {string} key - Ключ
   * @param {*} value - Значение (будет сериализовано в JSON)
   * @returns {boolean} Успешность операции
   */
  static set(key, value) {
    try {
      const serialized = typeof value === 'string'
        ? value
        : JSON.stringify(value);

      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Cannot save data.');
        // Можно добавить логику очистки старых данных
      } else {
        console.error(`LocalStorage set error for key "${key}":`, error);
      }
      return false;
    }
  }

  /**
   * Удалить значение из localStorage
   * @param {string} key - Ключ
   * @returns {boolean} Успешность операции
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`LocalStorage remove error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Очистить весь localStorage
   * @returns {boolean} Успешность операции
   */
  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('LocalStorage clear error:', error);
      return false;
    }
  }

  /**
   * Проверить наличие ключа
   * @param {string} key - Ключ
   * @returns {boolean} true если ключ существует
   */
  static has(key) {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Получить настройки приложения
   * @returns {Object|null} Объект настроек или null
   */
  static getSettings() {
    return this.get(this.KEYS.SETTINGS, null);
  }

  /**
   * Сохранить настройки приложения
   * @param {Object} settings - Объект настроек
   * @returns {boolean} Успешность операции
   */
  static saveSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      console.error('Invalid settings object');
      return false;
    }
    return this.set(this.KEYS.SETTINGS, settings);
  }

  /**
   * Получить историю ветра
   * @returns {Array} Массив данных или пустой массив
   */
  static getWindHistory() {
    return this.get(this.KEYS.WIND_HISTORY, []);
  }

  /**
   * Сохранить историю ветра
   * @param {Array} history - Массив данных
   * @returns {boolean} Успешность операции
   */
  static saveWindHistory(history) {
    if (!Array.isArray(history)) {
      console.error('Wind history must be an array');
      return false;
    }
    return this.set(this.KEYS.WIND_HISTORY, history);
  }

  /**
   * Получить версию приложения из localStorage
   * @returns {string|null} Версия или null
   */
  static getVersion() {
    return this.get(this.KEYS.VERSION, null);
  }

  /**
   * Сохранить версию приложения
   * @param {string} version - Версия
   * @returns {boolean} Успешность операции
   */
  static saveVersion(version) {
    return this.set(this.KEYS.VERSION, version);
  }

  /**
   * Получить размер использованного storage (примерно)
   * @returns {number} Размер в байтах
   */
  static getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  /**
   * Получить оставшееся место в storage (примерно)
   * Обычно лимит ~5-10MB в зависимости от браузера
   * @returns {number} Примерный остаток в байтах
   */
  static getRemainingSpace() {
    const maxSize = 5 * 1024 * 1024; // 5MB - типичный лимит
    return maxSize - this.getStorageSize();
  }

  /**
   * Сохранить локаль для Service Worker
   * Service Worker не имеет доступа к LocalStorage,
   * поэтому сохраняем локаль в Cache API
   * @param {string} locale - Код языка
   * @returns {Promise<boolean>} Успешность операции
   */
  static async saveLocaleForServiceWorker(locale) {
    try {
      if ('caches' in window) {
        const cache = await caches.open('jollykite-settings');
        const response = new Response(locale, {
          headers: { 'Content-Type': 'text/plain' }
        });
        await cache.put('/locale', response);
        console.log('[LocalStorageManager] Locale saved for Service Worker:', locale);
        return true;
      }
    } catch (error) {
      console.error('[LocalStorageManager] Failed to save locale for SW:', error);
    }
    return false;
  }
}

export default LocalStorageManager;
