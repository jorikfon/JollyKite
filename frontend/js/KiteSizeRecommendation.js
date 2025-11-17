import KiteSizeCalculator from './utils/KiteSizeCalculator.js';

/**
 * KiteSizeRecommendation - displays kite size recommendations based on current wind
 */
class KiteSizeRecommendation {
  constructor(i18n = null) {
    this.i18n = i18n;
    this.calculator = new KiteSizeCalculator(i18n);
    this.containerElement = null;
    this.currentWindSpeed = 0;
  }

  /**
   * Initialize component
   */
  init() {
    this.containerElement = document.getElementById('kiteSizeRecommendation');

    if (!this.containerElement) {
      console.warn('Kite size recommendation container not found');
      return false;
    }

    return true;
  }

  /**
   * Update recommendations based on wind speed
   */
  updateRecommendations(windSpeed) {
    if (!this.containerElement) {
      return;
    }

    this.currentWindSpeed = windSpeed;
    const recommendations = this.calculator.getRecommendations(windSpeed);

    // Generate HTML for kite size cards
    const cardsHtml = recommendations.map(rec => this.createKiteCard(rec)).join('');

    // Get overall recommendation text
    const recommendationText = this.calculator.getRecommendationText(windSpeed);

    // Update container with M3 design - clean structure, no inline styles
    this.containerElement.innerHTML = `
      <div class="kite-recommendation-container">
        <div class="kite-recommendation-header">
          ${recommendationText}
        </div>
        <div class="kite-cards-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Create HTML for a single kite size card - M3 Design with CSS classes
   */
  createKiteCard(recommendation) {
    const { size, recommendedWeight, suitability } = recommendation;

    // Create weight display
    const kgLabel = this.i18n ? this.i18n.t('kite.kg') : 'кг';
    const weightDisplay = recommendedWeight > 0 ? `${recommendedWeight} ${kgLabel}` : '-';

    // Get suitability icon
    const icon = this.getSuitabilityIcon(suitability);

    // Get suitability class modifier
    const suitabilityClass = `kite-card--${suitability.replace('_', '-')}`;

    // Clean M3 structure with BEM classes
    return `
      <div class="kite-card ${suitabilityClass}">
        <div class="kite-card__size">${size}м</div>
        <div class="kite-card__icon">${icon}</div>
        <div class="kite-card__weight">${weightDisplay}</div>
        <div class="kite-card__label">${this.calculator.getSuitabilityText(suitability)}</div>
      </div>
    `;
  }

  /**
   * Get icon for suitability level
   */
  getSuitabilityIcon(suitability) {
    const icons = {
      'optimal': '⭐',
      'good': '✅',
      'acceptable': '👌',
      'too_light': '💨',
      'too_strong': '💪',
      'none': '❌'
    };
    return icons[suitability] || '🪁';
  }

  /**
   * Show loading state - M3 Design
   */
  showLoading() {
    if (!this.containerElement) return;

    const loadingText = this.i18n ? this.i18n.t('app.loading') : 'Загружаем рекомендации...';
    this.containerElement.innerHTML = `
      <div class="kite-loading">
        <div class="kite-loading__spinner"></div>
        <p class="kite-loading__text">${loadingText}</p>
      </div>
    `;
  }

  /**
   * Show error state - M3 Design
   */
  showError(message) {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div class="kite-error">
        ⚠️ ${message}
      </div>
    `;
  }

  /**
   * Hide component
   */
  hide() {
    if (this.containerElement) {
      this.containerElement.style.display = 'none';
    }
  }

  /**
   * Show component
   */
  show() {
    if (this.containerElement) {
      this.containerElement.style.display = 'block';
    }
  }
}

export default KiteSizeRecommendation;
