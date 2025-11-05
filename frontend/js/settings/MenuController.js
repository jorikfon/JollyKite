import SettingsManager from './SettingsManager.js';
import I18nManager from '../i18n/I18nManager.js';

/**
 * MenuController - управление UI меню настроек
 *
 * Отвечает за открытие/закрытие меню, обработку кликов,
 * синхронизацию UI с настройками и перевод интерфейса.
 */
class MenuController {
  /**
   * Конструктор
   * @param {SettingsManager} settingsManager - Менеджер настроек
   * @param {I18nManager} i18nManager - Менеджер переводов
   */
  constructor(settingsManager, i18nManager) {
    this.settings = settingsManager;
    this.i18n = i18nManager;

    // DOM элементы
    this.menuButton = null;
    this.settingsMenu = null;
    this.closeButton = null;
    this.overlay = null;
    this.languageButtons = [];
    this.unitButtons = [];

    this.isOpen = false;
  }

  /**
   * Инициализация контроллера
   */
  init() {
    try {
      // Получить DOM элементы
      this.menuButton = document.getElementById('menuButton');
      this.settingsMenu = document.getElementById('settingsMenu');
      this.closeButton = document.getElementById('closeMenuButton');
      this.overlay = this.settingsMenu?.querySelector('.settings-menu__overlay');

      if (!this.menuButton || !this.settingsMenu) {
        console.error('Menu elements not found in DOM');
        return false;
      }

      // Получить кнопки языков и единиц
      this.languageButtons = Array.from(
        this.settingsMenu.querySelectorAll('.language-option')
      );
      this.unitButtons = Array.from(
        this.settingsMenu.querySelectorAll('.unit-option')
      );

      // Установить обработчики событий
      this.setupEventListeners();

      // Инициализировать UI
      this.updateLanguageButtons();
      this.updateUnitButtons();
      this.translateUI();

      console.log('✓ MenuController initialized');
      return true;
    } catch (error) {
      console.error('MenuController init error:', error);
      return false;
    }
  }

  /**
   * Установить обработчики событий
   */
  setupEventListeners() {
    // Открытие меню
    this.menuButton.addEventListener('click', () => this.open());

    // Закрытие меню
    this.closeButton?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Переключение языков
    this.languageButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const locale = button.dataset.lang;
        this.handleLanguageChange(locale);
      });
    });

    // Переключение единиц измерения
    this.unitButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const unit = button.dataset.unit;
        this.handleUnitChange(unit);
      });
    });

    // Слушать изменения настроек
    this.settings.on('change:locale', (locale) => {
      this.i18n.setLocale(locale);
      this.updateLanguageButtons();
      this.translateUI();
    });

    this.settings.on('change:windSpeedUnit', () => {
      this.updateUnitButtons();
      // Событие для перерисовки компонентов с новыми единицами
      window.dispatchEvent(new CustomEvent('unitChanged'));
    });

    // Слушать смену языка из I18nManager
    this.i18n.on('localeChanged', () => {
      this.translateUI();
    });
  }

  /**
   * Открыть меню
   */
  open() {
    if (this.isOpen) return;

    this.settingsMenu.classList.add('active');
    this.isOpen = true;

    // Предотвратить прокрутку страницы
    document.body.style.overflow = 'hidden';

    console.log('Menu opened');
  }

  /**
   * Закрыть меню
   */
  close() {
    if (!this.isOpen) return;

    this.settingsMenu.classList.remove('active');
    this.isOpen = false;

    // Восстановить прокрутку страницы
    document.body.style.overflow = '';

    console.log('Menu closed');
  }

  /**
   * Переключить состояние меню
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Обработать смену языка
   * @param {string} locale - Код языка
   */
  handleLanguageChange(locale) {
    if (!I18nManager.SUPPORTED_LOCALES.includes(locale)) {
      console.warn('Unsupported locale:', locale);
      return;
    }

    this.settings.setSetting('locale', locale);
    console.log('Language changed to:', locale);

    // Сохранить локаль для Service Worker (для пуш-уведомлений)
    LocalStorageManager.saveLocaleForServiceWorker(locale);

    // Перезагрузить страницу для полного применения перевода
    setTimeout(() => {
      window.location.reload();
    }, 300); // Небольшая задержка для сохранения настройки
  }

  /**
   * Обработать смену единиц измерения
   * @param {string} unit - Единица измерения (knots, ms)
   */
  handleUnitChange(unit) {
    if (!['knots', 'ms'].includes(unit)) {
      console.warn('Unsupported unit:', unit);
      return;
    }

    this.settings.setSetting('windSpeedUnit', unit);
    console.log('Wind speed unit changed to:', unit);
  }

  /**
   * Обновить состояние кнопок языков
   */
  updateLanguageButtons() {
    const currentLocale = this.settings.getSetting('locale');

    this.languageButtons.forEach((button) => {
      if (button.dataset.lang === currentLocale) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Обновить состояние кнопок единиц
   */
  updateUnitButtons() {
    const currentUnit = this.settings.getSetting('windSpeedUnit');

    this.unitButtons.forEach((button) => {
      if (button.dataset.unit === currentUnit) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Перевести весь UI меню
   */
  translateUI() {
    try {
      // Перевести всю страницу (не только меню)
      this.i18n.translatePage();

      // Обновить текст в кнопках единиц измерения
      this.translateUnitButtons();

      console.log('UI translated to:', this.i18n.getLocale());
    } catch (error) {
      console.error('translateUI error:', error);
    }
  }

  /**
   * Перевести кнопки единиц измерения
   */
  translateUnitButtons() {
    this.unitButtons.forEach((button) => {
      const unit = button.dataset.unit;
      const nameElement = button.querySelector('.unit-name');
      const symbolElement = button.querySelector('.unit-symbol');

      if (nameElement) {
        const nameKey = unit === 'knots' ? 'units.knots' : 'units.metersPerSecond';
        nameElement.textContent = this.i18n.t(nameKey);
      }

      if (symbolElement) {
        const symbolKey = unit === 'knots' ? 'units.knotsShort' : 'units.msShort';
        symbolElement.textContent = this.i18n.t(symbolKey);
      }
    });
  }

  /**
   * Обновить статус уведомлений
   * @param {boolean} enabled - Включены ли уведомления
   */
  updateNotificationButton(enabled) {
    const button = this.settingsMenu.querySelector('#notificationButton');
    const status = this.settingsMenu.querySelector('#notificationStatus');

    if (!button) return;

    if (enabled) {
      button.classList.add('enabled');
      button.classList.remove('disabled');
      button.textContent = this.i18n.t('notifications.unsubscribe');

      if (status) {
        status.textContent = this.i18n.t('notifications.subscribed');
      }
    } else {
      button.classList.remove('enabled');
      button.classList.add('disabled');
      button.textContent = this.i18n.t('notifications.subscribe');

      if (status) {
        status.textContent = this.i18n.t('notifications.notSubscribed');
      }
    }
  }

  /**
   * Получить текущее состояние меню
   * @returns {boolean} Открыто ли меню
   */
  isMenuOpen() {
    return this.isOpen;
  }
}

export default MenuController;
