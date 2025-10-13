/**
 * Wind Utilities Module
 * Centralized wind-related calculations and conversions
 */

import config from '../config.js';

class WindUtils {
    /**
     * Convert miles per hour to meters per second
     * @param {number} mph - Speed in miles per hour
     * @returns {number} Speed in meters per second
     */
    static mphToMs(mph) {
        return mph * config.conversions.mphToMs;
    }

    /**
     * Convert miles per hour to knots
     * @param {number} mph - Speed in miles per hour
     * @returns {number} Speed in knots
     */
    static mphToKnots(mph) {
        return mph * config.conversions.mphToKnots;
    }

    /**
     * Convert meters per second to knots
     * @param {number} ms - Speed in meters per second
     * @returns {number} Speed in knots
     */
    static msToKnots(ms) {
        return ms * config.conversions.msToKnots;
    }

    /**
     * Convert kilometers per hour to knots
     * @param {number} kmh - Speed in kilometers per hour
     * @returns {number} Speed in knots
     */
    static kmhToKnots(kmh) {
        return kmh * config.conversions.kmhToKnots;
    }

    /**
     * Convert degrees to cardinal direction
     * @param {number} degrees - Wind direction in degrees
     * @returns {string} Cardinal direction (С, СВ, В, etc.)
     */
    static degreesToCardinal(degrees) {
        const deg = parseFloat(degrees) || 0;
        const normalized = ((deg % 360) + 360) % 360; // Normalize to 0-360

        for (const direction of config.cardinalDirections) {
            if (direction.min > direction.max) {
                // Handle North (wraps around 360/0)
                if (normalized >= direction.min || normalized < direction.max) {
                    return direction.name;
                }
            } else if (normalized >= direction.min && normalized < direction.max) {
                return direction.name;
            }
        }

        return 'С'; // Fallback to North
    }

    /**
     * Get wind safety assessment
     * @param {number} direction - Wind direction in degrees
     * @param {number} speed - Wind speed in knots
     * @returns {Object} Safety assessment with level, text, color, and type
     */
    static getWindSafety(direction, speed) {
        const dir = parseInt(direction);
        const knots = parseFloat(speed) || 0;
        const { offshore, onshore, speeds, levels } = config.windSafety;

        // Determine wind type relative to shore
        const isOffshore = (dir >= offshore.min && dir <= offshore.max);
        const isOnshore = (dir >= onshore.min && dir <= onshore.max);

        let safety = { ...levels.medium }; // Default to medium

        // Evaluate safety based on speed and direction
        if (knots < speeds.veryLow) {
            // Too weak wind
            safety = { ...levels.low };
        } else if (isOffshore || knots > speeds.extreme) {
            // Offshore (dangerous) or too strong
            safety = { ...levels.danger };
        } else if (isOnshore && knots >= speeds.moderate && knots <= speeds.veryStrong) {
            // Onshore with good wind speed
            safety = { ...levels.high };
        } else if (isOnshore && knots >= speeds.veryLow && knots < speeds.moderate) {
            // Onshore with light-moderate wind
            safety = { ...levels.good };
            safety.text = 'Безопасно';
        } else if (knots >= speeds.low && knots <= speeds.good) {
            // Sideshore with moderate wind
            safety = { ...levels.good };
        }

        // Add wind type information
        let windType = 'sideshore';
        let windTypeRu = 'Боковой';

        if (isOffshore) {
            windType = 'offshore';
            windTypeRu = 'Отжим';
        } else if (isOnshore) {
            windType = 'onshore';
            windTypeRu = 'Прижим';
        }

        return {
            ...safety,
            isOffshore,
            isOnshore,
            windSpeed: knots,
            windDirection: dir,
            windType,
            windTypeRu
        };
    }

    /**
     * Get wind description based on speed
     * @param {number} speedKnots - Wind speed in knots
     * @param {number} degrees - Wind direction in degrees (optional)
     * @returns {Object} Wind description with icon, title, and subtitle
     */
    static getWindDescription(speedKnots, degrees = null) {
        const speed = parseFloat(speedKnots) || 0;

        for (const category of config.windCategories) {
            if (speed < category.maxSpeed) {
                const subtitle = category.subtitle.includes('узлов')
                    ? `${speed.toFixed(1)} ${category.subtitle}`
                    : category.subtitle;

                return {
                    icon: category.icon,
                    title: category.title,
                    subtitle
                };
            }
        }

        // This should never happen due to Infinity in the last category
        return {
            icon: '💨',
            title: 'Ветер',
            subtitle: `${speed.toFixed(1)} узлов`
        };
    }

    /**
     * Calculate wind angle relative to shore
     * @param {number} windDirection - Wind direction in degrees
     * @param {number} shoreDirection - Shore direction in degrees
     * @returns {number} Angle difference in degrees
     */
    static calculateShoreAngle(windDirection, shoreDirection = 0) {
        let angle = Math.abs(windDirection - shoreDirection);
        if (angle > 180) {
            angle = 360 - angle;
        }
        return angle;
    }

    /**
     * Determine if wind conditions are suitable for kitesurfing
     * @param {number} speed - Wind speed in knots
     * @param {number} direction - Wind direction in degrees
     * @returns {boolean} True if conditions are suitable
     */
    static isSuitableForKiting(speed, direction) {
        const safety = this.getWindSafety(direction, speed);
        const knots = parseFloat(speed) || 0;

        // Not suitable if too weak, too strong, or offshore
        if (knots < config.windSafety.speeds.low ||
            knots > config.windSafety.speeds.extreme ||
            safety.isOffshore) {
            return false;
        }

        return true;
    }

    /**
     * Format wind speed with unit
     * @param {number} speed - Wind speed
     * @param {string} unit - Unit (knots, m/s, mph)
     * @returns {string} Formatted speed with unit
     */
    static formatSpeed(speed, unit = 'knots') {
        const value = parseFloat(speed) || 0;
        const formatted = value.toFixed(1);

        switch (unit) {
            case 'knots':
                return `${formatted} уз`;
            case 'm/s':
                return `${formatted} м/с`;
            case 'mph':
                return `${formatted} mph`;
            default:
                return formatted;
        }
    }

    /**
     * Get wind trend icon and description
     * @param {string} trend - Trend type (strengthening, weakening, stable)
     * @returns {Object} Trend icon and description
     */
    static getTrendInfo(trend) {
        const trends = {
            strengthening: {
                icon: '↗️',
                text: 'Раздувает',
                color: '#FF8C00'
            },
            weakening: {
                icon: '↘️',
                text: 'Затихает',
                color: '#87CEEB'
            },
            stable: {
                icon: '➡️',
                text: 'Стабильный',
                color: '#4169E1'
            },
            insufficient_data: {
                icon: '⏳',
                text: 'Недостаточно данных',
                color: '#808080'
            }
        };

        return trends[trend] || trends.insufficient_data;
    }
}

export default WindUtils;