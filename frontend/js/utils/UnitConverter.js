/**
 * UnitConverter - конвертация единиц измерения скорости ветра
 *
 * Поддерживает конвертацию между:
 * - Узлы (knots, kn)
 * - Метры в секунду (meters per second, m/s)
 */
class UnitConverter {
  /**
   * Константы конвертации
   */
  static CONVERSION = {
    // 1 узел = 0.514444 м/с
    KNOT_TO_MS: 0.514444,
    // 1 м/с = 1.94384 узла
    MS_TO_KNOT: 1.94384,
  };

  /**
   * Поддерживаемые единицы измерения
   */
  static UNITS = {
    KNOTS: 'knots',
    MS: 'ms',
  };

  /**
   * Символы единиц измерения
   */
  static SYMBOLS = {
    knots: 'kn',
    ms: 'm/s',
  };

  /**
   * Конвертировать узлы в метры/секунду
   * @param {number} knots - Скорость в узлах
   * @returns {number} Скорость в м/с
   */
  static knotsToMs(knots) {
    if (typeof knots !== 'number' || isNaN(knots)) {
      console.warn('Invalid knots value:', knots);
      return 0;
    }
    return knots * this.CONVERSION.KNOT_TO_MS;
  }

  /**
   * Конвертировать метры/секунду в узлы
   * @param {number} ms - Скорость в м/с
   * @returns {number} Скорость в узлах
   */
  static msToKnots(ms) {
    if (typeof ms !== 'number' || isNaN(ms)) {
      console.warn('Invalid m/s value:', ms);
      return 0;
    }
    return ms * this.CONVERSION.MS_TO_KNOT;
  }

  /**
   * Универсальная конвертация между единицами
   * @param {number} value - Значение для конвертации
   * @param {string} fromUnit - Исходная единица ('knots' или 'ms')
   * @param {string} toUnit - Целевая единица ('knots' или 'ms')
   * @returns {number} Сконвертированное значение
   */
  static convert(value, fromUnit, toUnit) {
    if (typeof value !== 'number' || isNaN(value)) {
      console.warn('Invalid value for conversion:', value);
      return 0;
    }

    // Если единицы одинаковые, вернуть значение как есть
    if (fromUnit === toUnit) {
      return value;
    }

    // Конвертация knots -> ms
    if (fromUnit === this.UNITS.KNOTS && toUnit === this.UNITS.MS) {
      return this.knotsToMs(value);
    }

    // Конвертация ms -> knots
    if (fromUnit === this.UNITS.MS && toUnit === this.UNITS.KNOTS) {
      return this.msToKnots(value);
    }

    console.warn(`Unknown conversion: ${fromUnit} -> ${toUnit}`);
    return value;
  }

  /**
   * Форматировать скорость с единицами измерения
   * @param {number} value - Значение скорости
   * @param {string} unit - Единица измерения ('knots' или 'ms')
   * @param {boolean} showUnit - Показывать ли единицу измерения
   * @param {number} decimals - Количество знаков после запятой (по умолчанию 1)
   * @returns {string} Отформатированная строка
   */
  static formatSpeed(value, unit, showUnit = true, decimals = 1) {
    if (typeof value !== 'number' || isNaN(value)) {
      return '—';
    }

    const rounded = value.toFixed(decimals);

    if (!showUnit) {
      return rounded;
    }

    const symbol = this.getUnitSymbol(unit);
    return `${rounded} ${symbol}`;
  }

  /**
   * Получить символ единицы измерения
   * @param {string} unit - Единица измерения
   * @returns {string} Символ единицы
   */
  static getUnitSymbol(unit) {
    // Используем i18n для локализации единиц измерения
    const i18n = window.i18n;

    if (i18n) {
      if (unit === 'knots') {
        return i18n.t('units.knotsShort');
      } else if (unit === 'ms') {
        return i18n.t('units.msShort');
      }
    }

    // Fallback на статические символы
    return this.SYMBOLS[unit] || unit;
  }

  /**
   * Получить название единицы измерения для отображения
   * @param {string} unit - Единица измерения
   * @param {boolean} short - Короткий формат
   * @returns {string} Название единицы
   */
  static getUnitName(unit, short = false) {
    if (short) {
      return this.getUnitSymbol(unit);
    }

    // Используем i18n для локализации названий единиц измерения
    const i18n = window.i18n;

    if (i18n) {
      if (unit === 'knots') {
        return i18n.t('units.knots');
      } else if (unit === 'ms') {
        return i18n.t('units.metersPerSecond');
      }
    }

    // Fallback на статические названия
    const names = {
      knots: 'Knots',
      ms: 'Meters per second',
    };

    return names[unit] || unit;
  }

  /**
   * Проверить, является ли единица валидной
   * @param {string} unit - Единица измерения
   * @returns {boolean} true если единица валидна
   */
  static isValidUnit(unit) {
    return Object.values(this.UNITS).includes(unit);
  }

  /**
   * Конвертировать массив значений
   * @param {Array<number>} values - Массив значений
   * @param {string} fromUnit - Исходная единица
   * @param {string} toUnit - Целевая единица
   * @returns {Array<number>} Массив сконвертированных значений
   */
  static convertArray(values, fromUnit, toUnit) {
    if (!Array.isArray(values)) {
      console.warn('convertArray expects an array');
      return [];
    }

    return values.map(value => this.convert(value, fromUnit, toUnit));
  }

  /**
   * Получить множитель для конвертации
   * @param {string} fromUnit - Исходная единица
   * @param {string} toUnit - Целевая единица
   * @returns {number} Множитель конвертации
   */
  static getConversionFactor(fromUnit, toUnit) {
    if (fromUnit === toUnit) {
      return 1;
    }

    if (fromUnit === this.UNITS.KNOTS && toUnit === this.UNITS.MS) {
      return this.CONVERSION.KNOT_TO_MS;
    }

    if (fromUnit === this.UNITS.MS && toUnit === this.UNITS.KNOTS) {
      return this.CONVERSION.MS_TO_KNOT;
    }

    return 1;
  }
}

export default UnitConverter;
