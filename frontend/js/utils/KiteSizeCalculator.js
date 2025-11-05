/**
 * KiteSizeCalculator - calculates recommended kite size based on wind speed and rider weight
 *
 * Based on general kitesurfing formulas:
 * - Lighter winds (5-12 knots) require larger kites
 * - Medium winds (12-20 knots) require medium kites
 * - Strong winds (20-30+ knots) require smaller kites
 *
 * Formula approximation:
 * Kite Size (m²) ≈ Rider Weight (kg) / Wind Speed (knots) * Factor
 * Where Factor depends on conditions and experience level
 */
class KiteSizeCalculator {
  constructor(i18n = null) {
    this.i18n = i18n;
    // Available kite sizes in m²
    this.kiteSizes = [9, 12, 14, 17];

    // Кайтсерфинг коэффициенты для разных условий
    // Для twin-tip досок и среднего уровня катания
    // Скорректировано на основе реальных данных: при 14 узлах 12м кайт для 55 кг, 14м для 68 кг
    this.baseFactor = 3.0;  // Базовый коэффициент (увеличен для уменьшения рекомендуемого веса)

    // Диапазоны веса для каждого размера кайта при разной силе ветра
    // Основано на стандартных таблицах производителей кайтов
    this.kiteRanges = {
      9: {
        minWind: 18,   // минимальная скорость ветра для 9м кайта
        optimalWind: 25,
        maxWind: 40,
        weightRange: [50, 90]  // диапазон веса райдеров
      },
      12: {
        minWind: 13,
        optimalWind: 18,
        maxWind: 30,
        weightRange: [50, 100]
      },
      14: {
        minWind: 10,
        optimalWind: 15,
        maxWind: 25,
        weightRange: [50, 110]
      },
      17: {
        minWind: 8,
        optimalWind: 12,
        maxWind: 20,
        weightRange: [50, 120]
      }
    };
  }

  /**
   * Calculate optimal rider weight for a given kite size and wind speed
   * Returns weight in 5kg increments
   */
  calculateOptimalWeight(kiteSize, windSpeed) {
    // Базовая формула: Weight = KiteSize * WindSpeed / Factor
    const baseWeight = (kiteSize * windSpeed) / this.baseFactor;

    // Корректировки для разных размеров кайта
    let adjustedWeight = baseWeight;

    // Для больших кайтов (17м) в слабый ветер нужно больше веса
    if (kiteSize === 17 && windSpeed < 10) {
      adjustedWeight *= 1.15;
    }

    // Для маленьких кайтов (9м) в сильный ветер нужно меньше веса
    if (kiteSize === 9 && windSpeed > 25) {
      adjustedWeight *= 0.9;
    }

    // Округляем до 5 кг
    const roundedWeight = Math.round(adjustedWeight / 5) * 5;

    // Проверяем, находится ли вес в разумном диапазоне
    const range = this.kiteRanges[kiteSize];
    if (range) {
      // Ограничиваем вес разумными пределами
      return Math.max(range.weightRange[0], Math.min(range.weightRange[1], roundedWeight));
    }

    return roundedWeight;
  }

  /**
   * Get recommendations for all kite sizes based on current wind speed
   * Returns array of objects with kite size and recommended weight
   */
  getRecommendations(windSpeed) {
    return this.kiteSizes.map(size => {
      const range = this.kiteRanges[size];
      const weight = this.calculateOptimalWeight(size, windSpeed);

      // Определяем, подходит ли этот размер для текущего ветра
      let suitability = 'none';
      let color = '#666';

      if (windSpeed >= range.minWind && windSpeed <= range.maxWind) {
        // Кайт подходит для текущих условий
        const distanceToOptimal = Math.abs(windSpeed - range.optimalWind);

        if (distanceToOptimal <= 3) {
          suitability = 'optimal';
          color = '#00FF00';  // Зелёный - оптимально
        } else if (distanceToOptimal <= 5) {
          suitability = 'good';
          color = '#90EE90';  // Светло-зелёный - хорошо
        } else {
          suitability = 'acceptable';
          color = '#FFD700';  // Жёлтый - приемлемо
        }
      } else if (windSpeed < range.minWind) {
        suitability = 'too_light';
        color = '#87CEEB';  // Голубой - слабо
      } else {
        suitability = 'too_strong';
        color = '#FF6347';  // Красный - слишком сильно
      }

      return {
        size,
        weight,
        suitability,
        color,
        range
      };
    });
  }

  /**
   * Find best kite size for specific rider weight and wind speed
   */
  findBestKiteSize(riderWeight, windSpeed) {
    const recommendations = this.getRecommendations(windSpeed);

    // Находим кайт, где вес райдера ближе всего к рекомендованному
    let bestMatch = null;
    let minDifference = Infinity;

    recommendations.forEach(rec => {
      const difference = Math.abs(rec.weight - riderWeight);
      if (difference < minDifference && rec.suitability !== 'none') {
        minDifference = difference;
        bestMatch = rec;
      }
    });

    return bestMatch;
  }

  /**
   * Get description for suitability level
   */
  getSuitabilityText(suitability) {
    if (this.i18n) {
      const keys = {
        'optimal': 'kite.optimal',
        'good': 'kite.good',
        'acceptable': 'kite.acceptable',
        'too_light': 'kite.tooLight',
        'too_strong': 'kite.tooStrong',
        'none': 'kite.none'
      };
      return this.i18n.t(keys[suitability]) || '';
    }

    // Fallback to Russian
    const texts = {
      'optimal': 'Отлично!',
      'good': 'Хорошо',
      'acceptable': 'Подойдёт',
      'too_light': 'Слабо',
      'too_strong': 'Сильно',
      'none': 'Не подходит'
    };
    return texts[suitability] || '';
  }

  /**
   * Get detailed recommendation text
   */
  getRecommendationText(windSpeed) {
    // Use i18n if available, otherwise fallback to Russian
    const t = (key, fallback) => {
      return this.i18n ? this.i18n.t(key) : fallback;
    };

    if (windSpeed < 8) {
      return t('kite.veryWeak', '🏖️ Слишком слабый ветер для кайтсёрфинга');
    } else if (windSpeed >= 8 && windSpeed < 12) {
      return t('kite.weak', '💨 Слабый ветер - нужен большой кайт (17м)');
    } else if (windSpeed >= 12 && windSpeed < 18) {
      return t('kite.goodConditions', '✨ Хорошие условия - средний кайт (12-14м)');
    } else if (windSpeed >= 18 && windSpeed < 25) {
      return t('kite.excellentConditions', '🔥 Отличные условия - маленький кайт (9-12м)');
    } else if (windSpeed >= 25 && windSpeed < 30) {
      return t('kite.strongWind', '💪 Сильный ветер - малый кайт (9м)');
    } else {
      return t('kite.veryStrong', '⚠️ Очень сильный ветер - для опытных!');
    }
  }
}

export default KiteSizeCalculator;
