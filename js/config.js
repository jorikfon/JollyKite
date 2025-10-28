/**
 * JollyKite Application Configuration
 * Centralized configuration for all constants and settings
 */

const config = {
    // API Endpoints
    // Note: All API calls now go through the backend
    api: {
        backend: '/api' // Backend API endpoint (proxied through nginx)
    },

    // Geographical Locations
    locations: {
        spot: [12.346596280786017, 99.99817902532192], // JollyKite spot coordinates
        kiter: [12.3468, 100.0116], // Kiter in the sea (100m closer to shore)
        beachNorth: [12.350, 99.996],
        beachSouth: [12.343, 100.001],
        beach: [12.347, 99.998],
        parking: [12.3445, 99.9985]
    },

    // Wind Direction Bearings
    bearings: {
        sea: 90,  // Direction from sea to land
        land: 270 // Direction from land to sea
    },

    // Update Intervals (in milliseconds)
    intervals: {
        autoUpdate: 30000, // 30 seconds for wind data updates
        trendAnalysis: 5 * 60 * 1000 // 5 minutes for trend analysis
    },

    // Wind Safety Parameters
    windSafety: {
        // Wind direction ranges (degrees)
        offshore: { min: 225, max: 315 }, // SW-NW dangerous (blowing from land to sea)
        onshore: { min: 45, max: 135 },   // NE-SE safe (blowing from sea to land)

        // Wind speed thresholds (knots)
        speeds: {
            veryLow: 5,     // Below this is too weak
            low: 8,         // Light wind
            moderate: 12,   // Good for beginners
            good: 15,       // Good conditions
            strong: 20,     // For experienced
            veryStrong: 25, // Strong wind
            extreme: 30     // Dangerous
        },

        // Safety levels configuration
        levels: {
            low: {
                level: 'low',
                text: 'Слабый ветер',
                color: '#87CEEB'
            },
            danger: {
                level: 'danger',
                text: 'Опасно!',
                color: '#FF4500'
            },
            high: {
                level: 'high',
                text: 'Отличные условия!',
                color: '#00FF00'
            },
            good: {
                level: 'good',
                text: 'Хорошие условия',
                color: '#FFD700'
            },
            medium: {
                level: 'medium',
                text: 'Умеренно',
                color: '#FFA500'
            }
        }
    },

    // Wind Statistics Configuration
    statistics: {
        maxHistoryMinutes: 60,        // Keep history for 1 hour
        analysisIntervalMinutes: 5,   // Analyze trend over 5 minutes
        minMeasurementsForTrend: 20,  // Minimum measurements needed for trend
        storageKey: 'jolly-kite-wind-statistics'
    },

    // Forecast Configuration
    forecast: {
        daysToShow: 3,      // Show 3 days forecast
        startHour: 6,       // Start from 6 AM
        endHour: 19,        // End at 7 PM
        hourInterval: 2,    // Show every 2 hours
        timezone: 'Asia/Bangkok',
        weatherModel: '',   // Empty = use default model (best_match)
        marineParams: 'wave_height,wave_direction,wave_period' // Marine parameters to fetch
    },

    // Map Configuration
    map: {
        containerId: 'windMap', // Map container element ID
        defaultZoom: 14,
        centerOffset: 0.00286, // Offset map center to the right (~320m)
        tileServer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        // All interactions disabled for static map
        interactions: {
            dragging: false,
            touchZoom: false,
            doubleClickZoom: false,
            scrollWheelZoom: false,
            boxZoom: false,
            keyboard: false,
            tap: false,
            zoomControl: false,
            attributionControl: false
        }
    },

    // Conversion Factors
    conversions: {
        mphToMs: 0.44704,      // Miles per hour to meters per second
        mphToKnots: 0.868976,  // Miles per hour to knots
        msToKnots: 1.944,      // Meters per second to knots
        kmhToKnots: 0.539957   // Kilometers per hour to knots (1 / 1.852)
    },

    // Wind Speed Categories
    windCategories: [
        {
            maxSpeed: 5,
            icon: '🍃',
            title: 'Штиль',
            subtitle: 'Ветра практически нет'
        },
        {
            maxSpeed: 12,
            icon: '💨',
            title: 'Легкий ветер',
            subtitle: 'узлов'
        },
        {
            maxSpeed: 20,
            icon: '🌬️',
            title: 'Умеренный ветер',
            subtitle: 'узлов - отлично для кайта!'
        },
        {
            maxSpeed: 30,
            icon: '💨',
            title: 'Сильный ветер',
            subtitle: 'узлов - для опытных'
        },
        {
            maxSpeed: Infinity,
            icon: '⚡',
            title: 'Экстремальный ветер',
            subtitle: 'узлов - осторожно!'
        }
    ],

    // Cardinal Directions
    cardinalDirections: [
        { min: 337.5, max: 22.5, name: 'С' },     // North
        { min: 22.5, max: 67.5, name: 'СВ' },     // Northeast
        { min: 67.5, max: 112.5, name: 'В' },     // East
        { min: 112.5, max: 157.5, name: 'ЮВ' },   // Southeast
        { min: 157.5, max: 202.5, name: 'Ю' },    // South
        { min: 202.5, max: 247.5, name: 'ЮЗ' },   // Southwest
        { min: 247.5, max: 292.5, name: 'З' },    // West
        { min: 292.5, max: 337.5, name: 'СЗ' }    // Northwest
    ],

    // Local Storage Keys
    storage: {
        statistics: 'jolly-kite-wind-statistics',
        history: 'jolly-kite-wind-history',
        preferences: 'jolly-kite-user-preferences'
    },

    // Wind Arrow Positioning Configuration
    // Arrow is centered on kiter position for maximum visibility
    windArrow: {
        // Global angle correction applied to all arrow rotations
        globalAngle: 0,

        // Directional offsets for 8 cardinal directions (in lat/lng degrees)
        // Set to zero to keep arrow centered on kiter position
        directions: {
            0: { x: 0, y: 0 },     // North (С)
            45: { x: 0, y: 0 },   // Northeast (СВ)
            90: { x: 0, y: 0 },   // East (В)
            135: { x: 0, y: 0 },    // Southeast (ЮВ)
            180: { x: 0, y: 0 },     // South (Ю)
            225: { x: 0, y: 0 },    // Southwest (ЮЗ)
            270: { x: 0, y: 0 },    // West (З)
            315: { x: 0, y: 0 }     // Northwest (СЗ)
        }
    }
};

// Freeze the configuration to prevent accidental modifications
export default Object.freeze(config);