/**
 * I18nManager - менеджер интернационализации
 *
 * Управляет переводами приложения, сменой языка
 * и локализацией интерфейса.
 */
class I18nManager {
  /**
   * Поддерживаемые локали
   */
  static SUPPORTED_LOCALES = ['en', 'ru', 'de', 'th'];

  /**
   * Fallback локаль при отсутствии перевода
   */
  static FALLBACK_LOCALE = 'en';

  /**
   * Конструктор
   * @param {string} defaultLocale - Локаль по умолчанию
   */
  constructor(defaultLocale = 'ru') {
    this.currentLocale = defaultLocale;
    this.translations = {};
    this.eventListeners = {};
  }

  /**
   * Загрузить переводы для всех языков
   * @returns {Promise<void>}
   */
  async loadTranslations() {
    try {
      // Динамический импорт переводов
      const [ru, en, de, th] = await Promise.all([
        import('./translations/ru.js'),
        import('./translations/en.js'),
        import('./translations/de.js'),
        import('./translations/th.js'),
      ]);

      this.translations = {
        ru: ru.default,
        en: en.default,
        de: de.default,
        th: th.default,
      };

      console.log('✓ Translations loaded for:', Object.keys(this.translations));
    } catch (error) {
      console.error('Failed to load translations:', error);
      throw error;
    }
  }

  /**
   * Установить текущую локаль
   * @param {string} locale - Код языка (en, ru, de, th)
   * @returns {boolean} true если локаль установлена
   */
  setLocale(locale) {
    if (!I18nManager.SUPPORTED_LOCALES.includes(locale)) {
      console.warn(`Unsupported locale: ${locale}. Using fallback.`);
      locale = I18nManager.FALLBACK_LOCALE;
    }

    const previousLocale = this.currentLocale;
    this.currentLocale = locale;

    // Триггер события смены языка
    this.emit('localeChange', {
      previous: previousLocale,
      current: locale,
    });

    console.log(`Locale changed: ${previousLocale} → ${locale}`);
    return true;
  }

  /**
   * Получить текущую локаль
   * @returns {string} Код текущего языка
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Получить полный код локали для форматирования дат
   * @returns {string} Полный код локали (например, 'en-US', 'ru-RU')
   */
  getFullLocale() {
    const localeMap = {
      'en': 'en-US',
      'ru': 'ru-RU',
      'de': 'de-DE',
      'th': 'th-TH'
    };
    return localeMap[this.currentLocale] || 'en-US';
  }

  /**
   * Получить перевод по ключу
   * @param {string} key - Ключ перевода (например, 'app.title')
   * @param {Object} params - Параметры для подстановки
   * @returns {string} Переведенный текст
   */
  t(key, params = {}) {
    const translation = this.getTranslation(key, this.currentLocale);

    // Подстановка параметров
    if (params && Object.keys(params).length > 0) {
      return this.interpolate(translation, params);
    }

    return translation;
  }

  /**
   * Получить перевод из объекта переводов
   * @param {string} key - Ключ с точечной нотацией
   * @param {string} locale - Локаль
   * @returns {string} Перевод или ключ
   */
  getTranslation(key, locale) {
    const keys = key.split('.');
    let translation = this.translations[locale];

    // Поиск по вложенным объектам
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Попытка fallback на английский
        if (locale !== I18nManager.FALLBACK_LOCALE) {
          console.warn(`Translation not found for key: ${key} in ${locale}, trying fallback`);
          return this.getTranslation(key, I18nManager.FALLBACK_LOCALE);
        }

        console.warn(`Translation not found for key: ${key}`);
        return key; // Возвращаем ключ если перевод не найден
      }
    }

    return translation;
  }

  /**
   * Подстановка параметров в перевод
   * @param {string} text - Текст с плейсхолдерами
   * @param {Object} params - Параметры
   * @returns {string} Текст с подставленными параметрами
   */
  interpolate(text, params) {
    if (typeof text !== 'string') {
      return text;
    }

    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params.hasOwnProperty(key) ? params[key] : match;
    });
  }

  /**
   * Определить язык браузера пользователя
   * @returns {string} Код языка или defaultLocale
   */
  detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;

    // Извлечь код языка (например, 'ru' из 'ru-RU')
    const langCode = browserLang.split('-')[0].toLowerCase();

    // Проверить, поддерживается ли язык
    if (I18nManager.SUPPORTED_LOCALES.includes(langCode)) {
      console.log(`Detected browser language: ${langCode}`);
      return langCode;
    }

    console.log(`Browser language ${langCode} not supported, using fallback`);
    return I18nManager.FALLBACK_LOCALE;
  }

  /**
   * Получить название языка
   * @param {string} locale - Код языка
   * @returns {string} Название языка
   */
  getLanguageName(locale) {
    const names = {
      en: 'English',
      ru: 'Русский',
      de: 'Deutsch',
      th: 'ไทย',
    };
    return names[locale] || locale;
  }

  /**
   * Получить флаг языка (эмодзи)
   * @param {string} locale - Код языка
   * @returns {string} Эмодзи флага
   */
  getLanguageFlag(locale) {
    const flags = {
      en: '🇬🇧',
      ru: '🇷🇺',
      de: '🇩🇪',
      th: '🇹🇭',
    };
    return flags[locale] || '🌐';
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
   */
  emit(event, data) {
    if (!this.eventListeners[event]) return;

    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Перевести все элементы с атрибутом data-i18n
   */
  translatePage() {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);

      // Определить, куда вставлять текст
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translation;
      } else {
        // Если перевод содержит HTML теги, используем innerHTML, иначе textContent (безопаснее)
        if (/<[^>]+>/.test(translation)) {
          element.innerHTML = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    // Обновить meta теги
    this.updateMetaTags();
  }

  /**
   * Обновить meta теги (title, description) для текущего языка
   */
  updateMetaTags() {
    // Обновить title страницы
    const title = this.t('app.title');
    if (title) {
      document.title = title;

      // Обновить Open Graph title
      const ogTitle = document.getElementById('og-title');
      if (ogTitle) ogTitle.setAttribute('content', title);

      // Обновить Twitter title
      const twitterTitle = document.getElementById('twitter-title');
      if (twitterTitle) twitterTitle.setAttribute('content', title);
    }

    // Обновить description
    const description = this.t('app.description');
    if (description) {
      const metaDesc = document.getElementById('page-description');
      if (metaDesc) metaDesc.setAttribute('content', description);

      // Обновить Open Graph description
      const ogDesc = document.getElementById('og-description');
      if (ogDesc) ogDesc.setAttribute('content', description);

      // Обновить Twitter description
      const twitterDesc = document.getElementById('twitter-description');
      if (twitterDesc) twitterDesc.setAttribute('content', description);
    }
  }

  /**
   * Перевести элемент по ключу
   * @param {HTMLElement} element - DOM элемент
   * @param {string} key - Ключ перевода
   * @param {Object} params - Параметры
   */
  translateElement(element, key, params = {}) {
    if (!element) return;

    const translation = this.t(key, params);

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = translation;
    } else {
      element.textContent = translation;
    }
  }

  /**
   * Получить все поддерживаемые локали
   * @returns {Array<Object>} Массив объектов с информацией о языках
   */
  getSupportedLocales() {
    return I18nManager.SUPPORTED_LOCALES.map(locale => ({
      code: locale,
      name: this.getLanguageName(locale),
      flag: this.getLanguageFlag(locale),
    }));
  }

  /**
   * Проверить, загружены ли переводы
   * @returns {boolean}
   */
  isLoaded() {
    return Object.keys(this.translations).length > 0;
  }
}

export default I18nManager;
