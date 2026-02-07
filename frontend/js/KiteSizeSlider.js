import KiteSizeCalculator from './utils/KiteSizeCalculator.js';
import config from './config.js';

/**
 * KiteSizeSlider - horizontal scrolling kite size recommendations with auto-scroll to optimal
 * Features:
 * - Horizontal scroll with fade effects at edges
 * - Auto-scroll to center optimal kite
 * - Touch/swipe gestures support
 * - Smooth animations
 */
class KiteSizeSlider {
  constructor(i18n = null) {
    this.i18n = i18n;
    this.calculator = new KiteSizeCalculator(i18n);
    this.containerElement = null;
    this.sliderElement = null;
    this.currentWindSpeed = 0;
    this.isScrolling = false;
  }

  /**
   * Initialize component
   */
  init() {
    this.containerElement = document.getElementById('kiteSizeRecommendation');

    if (!this.containerElement) {
      console.warn('Kite size slider container not found');
      return false;
    }

    // Load user preferences from settings if available
    if (window.settings) {
      const boardType = window.settings.getSetting('boardType');
      const riderWeight = window.settings.getSetting('riderWeight');

      if (boardType) {
        this.calculator.setBoardType(boardType);
      }
      if (riderWeight) {
        this.calculator.setRiderWeight(riderWeight);
      }
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

    // Get user preferences
    const riderWeight = window.settings ? window.settings.getSetting('riderWeight') : null;
    const boardType = window.settings ? window.settings.getSetting('boardType') : null;

    const recommendations = this.calculator.getRecommendations(windSpeed, riderWeight, boardType);

    // Find optimal kite index
    const optimalIndex = recommendations.findIndex(rec => rec.isOptimal);

    // Generate HTML for kite size cards
    const cardsHtml = recommendations.map((rec, index) =>
      this.createKiteCard(rec, index)
    ).join('');

    // Update container with slider structure
    this.containerElement.innerHTML = `
      <div class="kite-slider-container">
        <div class="kite-slider-wrapper">
          <div class="kite-slider-fade kite-slider-fade--left"></div>
          <div class="kite-slider" id="kiteSlider">
            <div class="kite-slider-track" id="kiteSliderTrack">
              ${cardsHtml}
            </div>
          </div>
          <div class="kite-slider-fade kite-slider-fade--right"></div>
        </div>
      </div>
    `;

    // Get slider element reference
    this.sliderElement = document.getElementById('kiteSlider');

    // Auto-scroll to optimal kite after a short delay
    if (optimalIndex >= 0 && this.sliderElement) {
      setTimeout(() => {
        this.scrollToCard(optimalIndex);
      }, 300);
    }

    // Setup scroll event listeners for fade effects
    this.setupScrollListeners();
  }

  /**
   * Create HTML for a single kite size card
   */
  createKiteCard(recommendation, index) {
    const { size, recommendedWeight, icon, i18nKey, color, isOptimal } = recommendation;

    // Create weight display
    const kgLabel = this.i18n ? this.i18n.t('kite.kg') : 'кг';
    const weightDisplay = (recommendedWeight !== null && recommendedWeight > 0) ? `${recommendedWeight} ${kgLabel}` : '–';

    // Get suitability text
    const suitabilityText = this.calculator.getSuitabilityText(i18nKey);

    // Add optimal class
    const optimalClass = isOptimal ? 'kite-slider-card--optimal' : '';

    // Create card with data attributes for smooth scrolling
    return `
      <div class="kite-slider-card ${optimalClass}"
           data-index="${index}"
           data-size="${size}"
           style="border-color: ${color};">
        <div class="kite-slider-card__size">${size}м</div>
        <div class="kite-slider-card__weight">${weightDisplay}</div>
        <div class="kite-slider-card__label">${suitabilityText}</div>
        ${isOptimal ? '<div class="kite-slider-card__optimal-tag">⭐ ' + (this.i18n ? this.i18n.t('kite.optimalChoice') : 'Оптимально') + '</div>' : ''}
      </div>
    `;
  }

  /**
   * Scroll to specific card (centered)
   */
  scrollToCard(index) {
    if (!this.sliderElement) return;

    const cards = this.sliderElement.querySelectorAll('.kite-slider-card');
    if (index < 0 || index >= cards.length) return;

    const card = cards[index];
    const sliderWidth = this.sliderElement.clientWidth;
    const cardWidth = card.offsetWidth;
    const cardLeft = card.offsetLeft;

    // Calculate scroll position to center the card
    const scrollPosition = cardLeft - (sliderWidth / 2) + (cardWidth / 2);

    // Smooth scroll
    this.sliderElement.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  }

  /**
   * Setup scroll event listeners for fade effects
   */
  setupScrollListeners() {
    if (!this.sliderElement) return;

    const updateFadeEffects = () => {
      const scrollLeft = this.sliderElement.scrollLeft;
      const scrollWidth = this.sliderElement.scrollWidth;
      const clientWidth = this.sliderElement.clientWidth;
      const maxScroll = scrollWidth - clientWidth;

      const leftFade = this.containerElement.querySelector('.kite-slider-fade--left');
      const rightFade = this.containerElement.querySelector('.kite-slider-fade--right');

      // Show/hide left fade
      if (leftFade) {
        if (scrollLeft > 10) {
          leftFade.classList.add('kite-slider-fade--visible');
        } else {
          leftFade.classList.remove('kite-slider-fade--visible');
        }
      }

      // Show/hide right fade
      if (rightFade) {
        if (scrollLeft < maxScroll - 10) {
          rightFade.classList.add('kite-slider-fade--visible');
        } else {
          rightFade.classList.remove('kite-slider-fade--visible');
        }
      }
    };

    // Update on scroll
    this.sliderElement.addEventListener('scroll', updateFadeEffects);

    // Initial update
    setTimeout(updateFadeEffects, 100);
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (!this.containerElement) return;

    const loadingText = this.i18n ? this.i18n.t('app.loading') : 'Загружаем рекомендации...';
    this.containerElement.innerHTML = `
      <div class="kite-slider-loading">
        <div class="kite-slider-loading__spinner"></div>
        <p class="kite-slider-loading__text">${loadingText}</p>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div class="kite-slider-error">
        ⚠️ ${message}
      </div>
    `;
  }

  /**
   * Update slider when settings change
   */
  onSettingsChange() {
    if (this.currentWindSpeed > 0) {
      this.updateRecommendations(this.currentWindSpeed);
    }
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

export default KiteSizeSlider;
