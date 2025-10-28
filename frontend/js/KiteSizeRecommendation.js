import KiteSizeCalculator from './utils/KiteSizeCalculator.js';

/**
 * KiteSizeRecommendation - displays kite size recommendations based on current wind
 */
class KiteSizeRecommendation {
  constructor() {
    this.calculator = new KiteSizeCalculator();
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

    // Update container
    this.containerElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 15px; color: rgba(255,255,255,0.9); font-size: 1rem;">
        ${recommendationText}
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
        ${cardsHtml}
      </div>
    `;
  }

  /**
   * Create HTML for a single kite size card
   */
  createKiteCard(recommendation) {
    const { size, weight, suitability, color } = recommendation;

    // Determine opacity based on suitability
    let opacity = '1';
    let borderWidth = '2px';
    let transform = 'scale(1)';

    if (suitability === 'optimal') {
      borderWidth = '3px';
      transform = 'scale(1.05)';
    } else if (suitability === 'too_light' || suitability === 'too_strong') {
      opacity = '0.5';
    } else if (suitability === 'none') {
      opacity = '0.3';
    }

    // Create weight display
    const weightDisplay = weight > 0 ? `${weight} кг` : '-';

    // Get suitability icon
    const icon = this.getSuitabilityIcon(suitability);

    return `
      <div style="
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        border: ${borderWidth} solid ${color};
        border-radius: 12px;
        padding: 15px 10px;
        text-align: center;
        opacity: ${opacity};
        transform: ${transform};
        transition: all 0.3s ease;
      ">
        <!-- Kite size -->
        <div style="font-size: 2rem; font-weight: 700; color: #fff; line-height: 1;">
          ${size}м
        </div>

        <!-- Icon -->
        <div style="font-size: 1.5rem; margin: 8px 0;">
          ${icon}
        </div>

        <!-- Recommended weight -->
        <div style="
          font-size: 1.3rem;
          font-weight: 600;
          color: ${color};
          margin: 8px 0;
        ">
          ${weightDisplay}
        </div>

        <!-- Suitability text -->
        <div style="
          font-size: 0.75rem;
          color: rgba(255,255,255,0.7);
          margin-top: 5px;
        ">
          ${this.calculator.getSuitabilityText(suitability)}
        </div>
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
   * Show loading state
   */
  showLoading() {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7);">
        <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
        <p>Загружаем рекомендации...</p>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div style="text-align: center; padding: 20px; color: rgba(255,100,100,0.9);">
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
