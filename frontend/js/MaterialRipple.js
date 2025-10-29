/**
 * Material Design 3 Ripple Effect
 * Implements M3 ripple animation for interactive elements
 */

export class MaterialRipple {
    constructor() {
        this.rippleElements = [];
        this.init();
    }

    /**
     * Initialize ripple effects on all interactive elements
     */
    init() {
        // Add ripple to buttons
        const buttons = document.querySelectorAll('button, .button, .telegram-button');
        buttons.forEach(button => {
            this.attachRipple(button);
        });

        // Add ripple to cards (subtle)
        const cards = document.querySelectorAll('.card, .detail-item, .price-item');
        cards.forEach(card => {
            this.attachRipple(card, { subtle: true });
        });

        // Add ripple to forecast hour slots
        const forecastSlots = document.querySelectorAll('.forecast-hour-slot');
        forecastSlots.forEach(slot => {
            this.attachRipple(slot, { subtle: true });
        });

        console.log('✓ Material Design 3 ripple effects initialized');
    }

    /**
     * Attach ripple effect to an element
     * @param {HTMLElement} element - Element to attach ripple to
     * @param {Object} options - Ripple options
     */
    attachRipple(element, options = {}) {
        const { subtle = false } = options;

        // Ensure element has position relative
        const position = window.getComputedStyle(element).position;
        if (position === 'static') {
            element.style.position = 'relative';
        }

        // Ensure overflow is hidden for contained ripple
        if (!element.style.overflow) {
            element.style.overflow = 'hidden';
        }

        element.addEventListener('click', (e) => {
            this.createRipple(e, element, subtle);
        });

        this.rippleElements.push(element);
    }

    /**
     * Create ripple animation at click position
     * @param {MouseEvent} event - Click event
     * @param {HTMLElement} element - Parent element
     * @param {Boolean} subtle - Use subtle ripple
     */
    createRipple(event, element, subtle = false) {
        // Remove existing ripples
        const existingRipples = element.querySelectorAll('.ripple');
        existingRipples.forEach(ripple => ripple.remove());

        // Create ripple element
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        // Calculate ripple size (should be big enough to cover entire element)
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const rippleSize = size * 2;

        // Calculate position relative to element
        const x = event.clientX - rect.left - rippleSize / 2;
        const y = event.clientY - rect.top - rippleSize / 2;

        // Apply styles
        ripple.style.width = ripple.style.height = `${rippleSize}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        // Adjust opacity for subtle ripples
        if (subtle) {
            ripple.style.background = 'rgba(0, 106, 106, 0.2)';
        }

        // Add ripple to element
        element.appendChild(ripple);

        // Remove ripple after animation completes
        setTimeout(() => {
            ripple.remove();
        }, 600); // Match --md-sys-motion-duration-long4
    }

    /**
     * Add ripple to a new element dynamically
     * @param {HTMLElement} element - Element to add ripple to
     * @param {Object} options - Ripple options
     */
    addRipple(element, options = {}) {
        this.attachRipple(element, options);
    }

    /**
     * Remove ripple from an element
     * @param {HTMLElement} element - Element to remove ripple from
     */
    removeRipple(element) {
        // Remove event listeners (would need more complex implementation)
        // For now, just remove visual ripples
        const ripples = element.querySelectorAll('.ripple');
        ripples.forEach(ripple => ripple.remove());

        const index = this.rippleElements.indexOf(element);
        if (index > -1) {
            this.rippleElements.splice(index, 1);
        }
    }

    /**
     * Reinitialize ripples (useful after DOM updates)
     */
    reinitialize() {
        this.rippleElements = [];
        this.init();
    }
}

// Export singleton instance
export const rippleManager = new MaterialRipple();
