/**
 * KiteSizeCalculator - calculates recommended kite size based on wind speed, rider weight, and board type
 *
 * Based on general kitesurfing formulas:
 * - Lighter winds require larger kites
 * - Stronger winds require smaller kites
 * - Hydrofoil requires less power than twintip
 *
 * Formula: Optimal Weight = (KiteSize * WindSpeed²) / Factor
 */
import config from '../config.js';

class KiteSizeCalculator {
  constructor(i18n = null) {
    this.i18n = i18n;

    // Default settings
    this.riderWeight = config.kiteSize.defaultRiderWeight;
    this.boardType = config.kiteSize.defaultBoardType;
  }

  /**
   * Get available sizes for current or specified board type
   * @param {string} boardType - Board type (optional)
   * @returns {number[]} Available sizes
   */
  getSizesForBoardType(boardType = null) {
    const type = boardType || this.boardType;
    return config.kiteSize.calculation[type]?.sizes || config.kiteSize.calculation.twintip.sizes;
  }

  /**
   * Set rider weight
   * @param {number} weight - Rider weight in kg
   */
  setRiderWeight(weight) {
    this.riderWeight = weight;
  }

  /**
   * Set board type
   * @param {string} type - 'twintip' or 'hydrofoil'
   */
  setBoardType(type) {
    if (config.kiteSize.boardTypes[type]) {
      this.boardType = type;
    }
  }

  /**
   * Calculate optimal rider weight for a given kite size and wind speed
   * Formula: Weight = (KiteSize * WindSpeed²) / Factor
   * @param {number} kiteSize - Kite size in m²
   * @param {number} windSpeed - Wind speed in knots
   * @param {string} boardType - 'twintip' or 'hydrofoil'
   * @returns {number} Optimal weight in kg (rounded to nearest kg)
   */
  calculateOptimalWeight(kiteSize, windSpeed, boardType = null) {
    const type = boardType || this.boardType;
    const calcParams = config.kiteSize.calculation[type];

    // Formula: Weight = (KiteSize * WindSpeed²) / Factor
    const baseWeight = (kiteSize * Math.pow(windSpeed, 2)) / calcParams.factor;

    // Round to nearest 1 kg
    const roundedWeight = Math.round(baseWeight);

    // Return null if outside reasonable range (40-120 kg)
    if (roundedWeight < 40 || roundedWeight > 120) {
      return null;
    }
    return roundedWeight;
  }

  /**
   * Calculate optimal kite size for a specific rider weight and wind speed
   * Formula: KiteSize = (RiderWeight * Factor) / WindSpeed²
   * @param {number} riderWeight - Rider weight in kg
   * @param {number} windSpeed - Wind speed in knots
   * @param {string} boardType - 'twintip' or 'hydrofoil'
   * @returns {number} Optimal kite size in m²
   */
  calculateOptimalKiteSize(riderWeight, windSpeed, boardType = null) {
    const type = boardType || this.boardType;
    const calcParams = config.kiteSize.calculation[type];

    // Formula: KiteSize = (RiderWeight * Factor) / WindSpeed²
    const optimalSize = (riderWeight * calcParams.factor) / Math.pow(windSpeed, 2);

    return optimalSize;
  }

  /**
   * Find closest kite size from available sizes
   * @param {number} optimalSize - Calculated optimal size
   * @returns {number} Closest available kite size
   */
  findClosestKiteSize(optimalSize, boardType = null) {
    const sizes = this.getSizesForBoardType(boardType);
    return sizes.reduce((prev, curr) => {
      return Math.abs(curr - optimalSize) < Math.abs(prev - optimalSize) ? curr : prev;
    });
  }

  /**
   * Get suitability classification for a kite size based on how close it is to optimal
   * @param {number} kiteSize - Kite size to evaluate
   * @param {number} optimalSize - Optimal kite size
   * @param {number} windSpeed - Current wind speed
   * @param {string} boardType - Board type
   * @returns {object} Suitability info
   */
  getSuitability(kiteSize, optimalSize, windSpeed, boardType = null) {
    const type = boardType || this.boardType;
    const calcParams = config.kiteSize.calculation[type];

    // Check if wind is in usable range
    if (windSpeed < calcParams.minWind) {
      return {
        level: 'none',
        i18nKey: 'kite.tooWeak',
        color: '#87CEEB',
        icon: '🏖️'
      };
    }

    if (windSpeed > calcParams.maxWind) {
      return {
        level: 'none',
        i18nKey: 'kite.tooStrong',
        color: '#FF6347',
        icon: '⚠️'
      };
    }

    // Calculate difference percentage from optimal
    const difference = Math.abs(kiteSize - optimalSize);
    const percentDiff = (difference / optimalSize) * 100;

    // Classify suitability
    if (percentDiff <= 10) {
      return {
        level: 'optimal',
        i18nKey: 'kite.optimal',
        color: '#00FF00',
        icon: '🎯'
      };
    } else if (percentDiff <= 20) {
      return {
        level: 'good',
        i18nKey: 'kite.good',
        color: '#90EE90',
        icon: '✅'
      };
    } else if (percentDiff <= 35) {
      return {
        level: 'acceptable',
        i18nKey: 'kite.acceptable',
        color: '#FFD700',
        icon: '👍'
      };
    } else {
      // Determine if too small or too large
      if (kiteSize < optimalSize) {
        return {
          level: 'too_small',
          i18nKey: 'kite.tooSmall',
          color: '#FFA500',
          icon: '⬇️'
        };
      } else {
        return {
          level: 'too_large',
          i18nKey: 'kite.tooLarge',
          color: '#FF8C00',
          icon: '⬆️'
        };
      }
    }
  }

  /**
   * Get recommendations for all kite sizes based on current conditions
   * @param {number} windSpeed - Wind speed in knots
   * @param {number} riderWeight - Rider weight in kg (optional, uses default if not provided)
   * @param {string} boardType - Board type (optional, uses default if not provided)
   * @returns {Array} Array of recommendations for each kite size
   */
  getRecommendations(windSpeed, riderWeight = null, boardType = null) {
    const weight = riderWeight || this.riderWeight;
    const type = boardType || this.boardType;
    const sizes = this.getSizesForBoardType(type);

    // Calculate optimal size for the rider
    const optimalSize = this.calculateOptimalKiteSize(weight, windSpeed, type);

    // Check if optimal size is within available range
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const isOutOfRange = optimalSize > maxSize * 1.3 || optimalSize < minSize * 0.7;

    // Only find closest size if optimal is in reasonable range
    const closestSize = isOutOfRange ? null : this.findClosestKiteSize(optimalSize, type);

    // Generate recommendations for each kite size
    return sizes.map(size => {
      const recommendedWeight = this.calculateOptimalWeight(size, windSpeed, type);
      const suitability = this.getSuitability(size, optimalSize, windSpeed, type);

      return {
        size,
        recommendedWeight,
        suitability: suitability.level,
        i18nKey: suitability.i18nKey,
        color: suitability.color,
        icon: suitability.icon,
        isOptimal: size === closestSize,
        optimalSize: optimalSize.toFixed(1)
      };
    });
  }

  /**
   * Get suitability text (translated)
   * @param {string} suitabilityKey - i18n key for suitability
   * @returns {string} Translated text
   */
  getSuitabilityText(suitabilityKey) {
    if (this.i18n) {
      return this.i18n.t(suitabilityKey);
    }

    // Fallback to Russian
    const texts = {
      'kite.optimal': 'Отлично!',
      'kite.good': 'Хорошо',
      'kite.acceptable': 'Подойдёт',
      'kite.tooSmall': 'Маловат',
      'kite.tooLarge': 'Великоват',
      'kite.tooWeak': 'Слабый ветер',
      'kite.tooStrong': 'Сильный ветер',
      'kite.none': 'Не подходит'
    };
    return texts[suitabilityKey] || '';
  }

  /**
   * Get general recommendation text based on wind speed
   * @param {number} windSpeed - Wind speed in knots
   * @param {string} boardType - Board type
   * @returns {string} Recommendation text
   */
  getRecommendationText(windSpeed, boardType = null) {
    const type = boardType || this.boardType;
    const calcParams = config.kiteSize.calculation[type];

    const t = (key, fallback) => {
      return this.i18n ? this.i18n.t(key) : fallback;
    };

    if (windSpeed < calcParams.minWind) {
      return t('kite.veryWeak', '🏖️ Слишком слабый ветер');
    } else if (type === 'wingfoil') {
      if (windSpeed < 15) {
        return t('kite.wf.lightWind', '💨 Слабый ветер - большое крыло (6-7м)');
      } else if (windSpeed < 20) {
        return t('kite.wf.goodConditions', '✨ Хорошие условия - среднее крыло (4.5-5.5м)');
      } else if (windSpeed < 28) {
        return t('kite.wf.excellentConditions', '🔥 Отличные условия - малое крыло (3.5-4.5м)');
      } else if (windSpeed < calcParams.maxWind) {
        return t('kite.wf.strongWind', '💪 Сильный ветер - минимальное крыло (3-3.5м)');
      } else {
        return t('kite.veryStrong', '⚠️ Очень сильный ветер - для опытных!');
      }
    } else if (windSpeed >= calcParams.minWind && windSpeed < 12) {
      return t('kite.lightWind', '💨 Слабый ветер - нужен большой кайт (14-17м)');
    } else if (windSpeed >= 12 && windSpeed < 18) {
      return t('kite.goodConditions', '✨ Хорошие условия - средний кайт (11-14м)');
    } else if (windSpeed >= 18 && windSpeed < 25) {
      return t('kite.excellentConditions', '🔥 Отличные условия - маленький кайт (9-12м)');
    } else if (windSpeed >= 25 && windSpeed < calcParams.maxWind) {
      return t('kite.strongWind', '💪 Сильный ветер - малый кайт (8-9м)');
    } else {
      return t('kite.veryStrong', '⚠️ Очень сильный ветер - для опытных!');
    }
  }
}

export default KiteSizeCalculator;
