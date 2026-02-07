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
    this.boardTypeButtons = [];
    this.weightInput = null;
    this.weightButtons = [];
    this.dirOffsetInput = null;
    this.dirOffsetButtons = [];

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
      this.boardTypeButtons = Array.from(
        this.settingsMenu.querySelectorAll('.board-type-option')
      );

      // Получить элементы веса
      this.weightInput = document.getElementById('riderWeight');
      this.weightButtons = Array.from(
        this.settingsMenu.querySelectorAll('.weight-button:not(.dir-offset-button)')
      );

      // Получить элементы калибровки направления
      this.dirOffsetInput = document.getElementById('windDirOffset');
      this.dirOffsetButtons = Array.from(
        this.settingsMenu.querySelectorAll('.dir-offset-button')
      );

      console.log('Weight input found:', !!this.weightInput);
      console.log('Weight buttons found:', this.weightButtons.length);

      // Установить обработчики событий
      this.setupEventListeners();

      // Инициализировать UI
      this.updateLanguageButtons();
      this.updateUnitButtons();
      this.updateBoardTypeButtons();
      this.updateWeightInput();
      this.updateDirOffsetInput();
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

    // Переключение типа доски
    this.boardTypeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const boardType = button.dataset.board;
        this.handleBoardTypeChange(boardType);
      });
    });

    // Изменение веса через input
    if (this.weightInput) {
      // Обработка при потере фокуса (после завершения ввода)
      this.weightInput.addEventListener('blur', (e) => {
        console.log('Weight input blur event:', e.target.value);
        const weight = parseInt(this.weightInput.value, 10);
        if (!isNaN(weight)) {
          this.handleWeightChange(weight);
        }
      });

      // Обработка при нажатии Enter
      this.weightInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Weight input Enter pressed:', e.target.value);
          const weight = parseInt(this.weightInput.value, 10);
          if (!isNaN(weight)) {
            this.handleWeightChange(weight);
          }
          e.target.blur(); // Убрать фокус
        }
      });
    } else {
      console.warn('⚠️ Weight input not found!');
    }

    // Кнопки +/- для веса
    console.log('Setting up weight button listeners for', this.weightButtons.length, 'buttons');
    this.weightButtons.forEach((button, index) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = button.dataset.action;
        console.log(`Weight button ${index} clicked: action=${action}`);
        this.handleWeightButtonClick(action);
      });
    });

    // Изменение калибровки направления через input
    if (this.dirOffsetInput) {
      this.dirOffsetInput.addEventListener('blur', () => {
        const offset = parseInt(this.dirOffsetInput.value, 10);
        if (!isNaN(offset)) {
          this.handleDirOffsetChange(offset);
        }
      });

      this.dirOffsetInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const offset = parseInt(this.dirOffsetInput.value, 10);
          if (!isNaN(offset)) {
            this.handleDirOffsetChange(offset);
          }
          e.target.blur();
        }
      });
    }

    // Кнопки +/- для калибровки направления
    this.dirOffsetButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = button.dataset.action;
        this.handleDirOffsetButtonClick(action);
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

    // Полная перезагрузка приложения для PWA
    setTimeout(() => {
      // Используем hard reload для обхода кеша Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Отправляем сообщение Service Worker для очистки кеша
        navigator.serviceWorker.controller.postMessage({
          type: 'SKIP_WAITING_AND_RELOAD',
        });

        // Выполняем жесткую перезагрузку
        window.location.reload(true);
      } else {
        // Если Service Worker не активен, просто перезагружаем
        window.location.reload(true);
      }
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
   * Обработать смену типа доски
   * @param {string} boardType - Тип доски (twintip, hydrofoil)
   */
  handleBoardTypeChange(boardType) {
    if (!['twintip', 'hydrofoil'].includes(boardType)) {
      console.warn('Unsupported board type:', boardType);
      return;
    }

    this.settings.setSetting('boardType', boardType);
    this.updateBoardTypeButtons();
    console.log('Board type changed to:', boardType);

    // Dispatch event for kite size slider to update
    window.dispatchEvent(new CustomEvent('riderSettingsChanged'));
  }

  /**
   * Обработать смену веса
   * @param {number} weight - Вес в кг
   */
  handleWeightChange(weight) {
    // Validate weight range
    if (weight < 40) weight = 40;
    if (weight > 120) weight = 120;

    this.settings.setSetting('riderWeight', weight);
    this.updateWeightInput();
    console.log('Rider weight changed to:', weight);

    // Dispatch event for kite size slider to update
    window.dispatchEvent(new CustomEvent('riderSettingsChanged'));
  }

  /**
   * Обработать клик по кнопке +/-
   * @param {string} action - 'increase' or 'decrease'
   */
  handleWeightButtonClick(action) {
    console.log('🔧 handleWeightButtonClick called with action:', action);

    if (!this.weightInput) {
      console.error('❌ Weight input not available in handleWeightButtonClick');
      return;
    }

    const currentWeight = parseInt(this.weightInput.value, 10) || 75;
    const step = 1; // Increment by 1kg

    let newWeight = currentWeight;
    if (action === 'increase') {
      newWeight = Math.min(120, currentWeight + step);
    } else if (action === 'decrease') {
      newWeight = Math.max(40, currentWeight - step);
    }

    console.log(`Weight change: ${currentWeight} → ${newWeight}`);
    this.weightInput.value = newWeight;
    this.handleWeightChange(newWeight);
  }

  /**
   * Обновить состояние кнопок типа доски
   */
  updateBoardTypeButtons() {
    const currentBoardType = this.settings.getSetting('boardType') || 'twintip';

    this.boardTypeButtons.forEach((button) => {
      if (button.dataset.board === currentBoardType) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Обновить значение веса в input
   */
  updateWeightInput() {
    if (!this.weightInput) return;

    const currentWeight = this.settings.getSetting('riderWeight') || 75;
    this.weightInput.value = currentWeight;
  }

  /**
   * Обработать смену калибровки направления
   * @param {number} offset - Смещение в градусах
   */
  handleDirOffsetChange(offset) {
    if (offset < -180) offset = -180;
    if (offset > 180) offset = 180;

    this.settings.setSetting('windDirOffset', offset);
    this.updateDirOffsetInput();
    console.log('Wind direction offset changed to:', offset);

    // Dispatch event to refresh wind display
    window.dispatchEvent(new CustomEvent('riderSettingsChanged'));
  }

  /**
   * Обработать клик по кнопке +/- калибровки
   * @param {string} action - 'increase' or 'decrease'
   */
  handleDirOffsetButtonClick(action) {
    if (!this.dirOffsetInput) return;

    const currentOffset = parseInt(this.dirOffsetInput.value, 10) || 0;
    const step = 5;

    let newOffset = currentOffset;
    if (action === 'increase') {
      newOffset = Math.min(180, currentOffset + step);
    } else if (action === 'decrease') {
      newOffset = Math.max(-180, currentOffset - step);
    }

    this.dirOffsetInput.value = newOffset;
    this.handleDirOffsetChange(newOffset);
  }

  /**
   * Обновить значение калибровки в input
   */
  updateDirOffsetInput() {
    if (!this.dirOffsetInput) return;

    const currentOffset = this.settings.getSetting('windDirOffset') || 0;
    this.dirOffsetInput.value = currentOffset;
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
