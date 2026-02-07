import LocalStorageManager from './LocalStorageManager.js';

/**
 * SettingsManager - управление настройками приложения
 *
 * Централизованное хранение и управление пользовательскими настройками,
 * с валидацией, событиями и синхронизацией с LocalStorage.
 */
class SettingsManager {
  /**
   * Настройки по умолчанию
   */
  static DEFAULT_SETTINGS = {
    locale: 'ru',           // en, ru, de, th
    windSpeedUnit: 'knots', // knots, ms
    notificationsEnabled: false,
    theme: 'auto',          // auto, light, dark (для будущего)
    version: '2.5.13',
    boardType: 'twintip',   // twintip, hydrofoil
    riderWeight: 75,        // kg (40-120)
    windDirOffset: 0,       // degrees (-180 to +180) - calibration offset for wind direction
  };

  /**
   * Валидаторы для настроек
   */
  static VALIDATORS = {
    locale: (value) => ['en', 'ru', 'de', 'th'].includes(value),
    windSpeedUnit: (value) => ['knots', 'ms'].includes(value),
    notificationsEnabled: (value) => typeof value === 'boolean',
    theme: (value) => ['auto', 'light', 'dark'].includes(value),
    version: (value) => typeof value === 'string',
    boardType: (value) => ['twintip', 'hydrofoil'].includes(value),
    riderWeight: (value) => typeof value === 'number' && value >= 40 && value <= 120,
    windDirOffset: (value) => typeof value === 'number' && value >= -180 && value <= 180,
  };

  /**
   * Конструктор
   */
  constructor() {
    this.settings = { ...SettingsManager.DEFAULT_SETTINGS };
    this.eventListeners = {};
    this.loaded = false;
  }

  /**
   * Загрузить настройки из LocalStorage
   * @returns {Object} Загруженные настройки
   */
  loadSettings() {
    try {
      const saved = LocalStorageManager.getSettings();

      if (saved && typeof saved === 'object') {
        // Мерж с default настройками (на случай новых полей)
        this.settings = {
          ...SettingsManager.DEFAULT_SETTINGS,
          ...saved,
        };

        // Валидация всех настроек
        this.validateAllSettings();

        console.log('✓ Settings loaded:', this.settings);
      } else {
        console.log('No saved settings found, using defaults');
        this.saveSettings();
      }

      this.loaded = true;
      return this.settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...SettingsManager.DEFAULT_SETTINGS };
      this.loaded = true;
      return this.settings;
    }
  }

  /**
   * Сохранить настройки в LocalStorage
   * @returns {boolean} Успешность операции
   */
  saveSettings() {
    try {
      const success = LocalStorageManager.saveSettings(this.settings);

      if (success) {
        console.log('✓ Settings saved:', this.settings);
      }

      return success;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * Получить значение настройки
   * @param {string} key - Ключ настройки
   * @returns {*} Значение настройки
   */
  getSetting(key) {
    if (!this.loaded) {
      console.warn('Settings not loaded yet');
      this.loadSettings();
    }

    return this.settings[key];
  }

  /**
   * Установить значение настройки
   * @param {string} key - Ключ настройки
   * @param {*} value - Значение
   * @returns {boolean} Успешность операции
   */
  setSetting(key, value) {
    // Проверка существования ключа
    if (!(key in SettingsManager.DEFAULT_SETTINGS)) {
      console.error(`Unknown setting key: ${key}`);
      return false;
    }

    // Валидация значения
    if (!this.validateSetting(key, value)) {
      console.error(`Invalid value for ${key}:`, value);
      return false;
    }

    const oldValue = this.settings[key];

    // Установить новое значение
    this.settings[key] = value;

    // Сохранить в LocalStorage
    const saved = this.saveSettings();

    if (saved) {
      // Триггер события изменения
      this.emit('change', {
        key,
        oldValue,
        newValue: value,
      });

      // Триггер события для конкретного ключа
      this.emit(`change:${key}`, value, oldValue);

      console.log(`Setting changed: ${key} = ${value} (was: ${oldValue})`);
    }

    return saved;
  }

  /**
   * Валидация настройки
   * @param {string} key - Ключ
   * @param {*} value - Значение
   * @returns {boolean} true если значение валидно
   */
  validateSetting(key, value) {
    const validator = SettingsManager.VALIDATORS[key];

    if (!validator) {
      console.warn(`No validator for setting: ${key}`);
      return true; // Разрешаем если нет валидатора
    }

    return validator(value);
  }

  /**
   * Валидация всех настроек
   */
  validateAllSettings() {
    for (const key in this.settings) {
      if (!this.validateSetting(key, this.settings[key])) {
        console.warn(`Invalid setting ${key}, resetting to default`);
        this.settings[key] = SettingsManager.DEFAULT_SETTINGS[key];
      }
    }
  }

  /**
   * Сбросить настройки к значениям по умолчанию
   * @returns {boolean} Успешность операции
   */
  resetSettings() {
    const oldSettings = { ...this.settings };
    this.settings = { ...SettingsManager.DEFAULT_SETTINGS };

    const saved = this.saveSettings();

    if (saved) {
      this.emit('reset', {
        old: oldSettings,
        new: this.settings,
      });

      console.log('Settings reset to defaults');
    }

    return saved;
  }

  /**
   * Получить все настройки
   * @returns {Object} Копия объекта настроек
   */
  getAllSettings() {
    return { ...this.settings };
  }

  /**
   * Экспорт настроек в JSON
   * @returns {string} JSON строка
   */
  exportSettings() {
    try {
      return JSON.stringify(this.settings, null, 2);
    } catch (error) {
      console.error('Failed to export settings:', error);
      return null;
    }
  }

  /**
   * Импорт настроек из JSON
   * @param {string} jsonString - JSON строка
   * @returns {boolean} Успешность операции
   */
  importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);

      if (!imported || typeof imported !== 'object') {
        console.error('Invalid settings JSON');
        return false;
      }

      // Валидация импортированных настроек
      const validated = {};
      for (const key in SettingsManager.DEFAULT_SETTINGS) {
        if (key in imported && this.validateSetting(key, imported[key])) {
          validated[key] = imported[key];
        } else {
          validated[key] = SettingsManager.DEFAULT_SETTINGS[key];
        }
      }

      this.settings = validated;
      const saved = this.saveSettings();

      if (saved) {
        this.emit('import', this.settings);
        console.log('Settings imported successfully');
      }

      return saved;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Подписаться на событие
   * @param {string} event - Название события
   * @param {Function} callback - Обработчик
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Отписаться от события
   * @param {string} event - Название события
   * @param {Function} callback - Обработчик
   */
  off(event, callback) {
    if (!this.eventListeners[event]) return;

    this.eventListeners[event] = this.eventListeners[event].filter(
      cb => cb !== callback
    );
  }

  /**
   * Вызвать событие
   * @param {string} event - Название события
   * @param {*} data - Данные события
   * @param {*} data2 - Дополнительные данные
   */
  emit(event, data, data2) {
    if (!this.eventListeners[event]) return;

    this.eventListeners[event].forEach(callback => {
      try {
        callback(data, data2);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Проверить, загружены ли настройки
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * Получить версию настроек
   * @returns {string}
   */
  getVersion() {
    return this.settings.version;
  }

  /**
   * Обновить версию настроек
   * @param {string} version - Новая версия
   * @returns {boolean}
   */
  setVersion(version) {
    return this.setSetting('version', version);
  }
}

export default SettingsManager;
