/**
 * Language Manager Module
 * Handles application localization between Russian and English
 */

const translations = {
    ru: {
        // Header
        appTitle: 'Pak Nam Pran',

        // Wind Display
        knots: 'узлов',
        direction: 'направление',
        gusts: 'Порывы',
        maxToday: 'Макс сегодня',
        trend: 'Тренд',

        // Wind descriptions
        loadingData: 'Загружаем данные...',
        pleaseWait: 'Подождите немного',

        // Wind categories
        calm: 'Штиль',
        calmSubtitle: 'Ветра практически нет',
        lightWind: 'Легкий ветер',
        moderateWind: 'Умеренный ветер',
        moderateSubtitle: 'отлично для кайта!',
        strongWind: 'Сильный ветер',
        strongSubtitle: 'для опытных',
        extremeWind: 'Экстремальный ветер',
        extremeSubtitle: 'осторожно!',

        // Safety levels
        weakWind: 'Слабый ветер',
        danger: 'Опасно!',
        excellentConditions: 'Отличные условия!',
        goodConditions: 'Хорошие условия',
        moderate: 'Умеренно',
        safe: 'Безопасно',

        // Wind types
        offshore: 'Отжим',
        onshore: 'Прижим',
        sideshore: 'Боковой',
        dangerOffshore: '⚠️ ОПАСНО • Отжим (offshore)',

        // Trend
        strengthening: 'Раздувает',
        weakening: 'Затихает',
        stable: 'Стабильный',
        insufficientData: 'Недостаточно данных',
        accumulatingData: 'Накапливаем данные...',

        // Forecast
        forecastTitle: '🌪️ Прогноз ветра на 3 дня',
        loadingForecast: 'Загружаем прогноз ветра...',

        // Days of week
        monday: 'Пн',
        tuesday: 'Вт',
        wednesday: 'Ср',
        thursday: 'Чт',
        friday: 'Пт',
        saturday: 'Сб',
        sunday: 'Вс',

        // Months
        january: 'янв',
        february: 'фев',
        march: 'мар',
        april: 'апр',
        may: 'мая',
        june: 'июн',
        july: 'июл',
        august: 'авг',
        september: 'сен',
        october: 'окт',
        november: 'ноя',
        december: 'дек',

        // Footer
        footer: 'Разработано с ❤️ для кайтсерферов',

        // Live indicator
        live: 'LIVE',

        // Errors
        errorLoading: 'Ошибка загрузки',
        errorLoadingData: 'Ошибка загрузки данных о ветре',
        errorLoadingForecast: 'Ошибка загрузки прогноза'
    },

    en: {
        // Header
        appTitle: 'Pak Nam Pran',

        // Wind Display
        knots: 'knots',
        direction: 'direction',
        gusts: 'Gusts',
        maxToday: 'Max today',
        trend: 'Trend',

        // Wind descriptions
        loadingData: 'Loading data...',
        pleaseWait: 'Please wait',

        // Wind categories
        calm: 'Calm',
        calmSubtitle: 'Almost no wind',
        lightWind: 'Light wind',
        moderateWind: 'Moderate wind',
        moderateSubtitle: 'perfect for kiting!',
        strongWind: 'Strong wind',
        strongSubtitle: 'for experienced',
        extremeWind: 'Extreme wind',
        extremeSubtitle: 'be careful!',

        // Safety levels
        weakWind: 'Weak wind',
        danger: 'Danger!',
        excellentConditions: 'Excellent conditions!',
        goodConditions: 'Good conditions',
        moderate: 'Moderate',
        safe: 'Safe',

        // Wind types
        offshore: 'Offshore',
        onshore: 'Onshore',
        sideshore: 'Sideshore',
        dangerOffshore: '⚠️ DANGER • Offshore wind',

        // Trend
        strengthening: 'Strengthening',
        weakening: 'Weakening',
        stable: 'Stable',
        insufficientData: 'Insufficient data',
        accumulatingData: 'Accumulating data...',

        // Forecast
        forecastTitle: '🌪️ 3-Day Wind Forecast',
        loadingForecast: 'Loading wind forecast...',

        // Days of week
        monday: 'Mon',
        tuesday: 'Tue',
        wednesday: 'Wed',
        thursday: 'Thu',
        friday: 'Fri',
        saturday: 'Sat',
        sunday: 'Sun',

        // Months
        january: 'Jan',
        february: 'Feb',
        march: 'Mar',
        april: 'Apr',
        may: 'May',
        june: 'Jun',
        july: 'Jul',
        august: 'Aug',
        september: 'Sep',
        october: 'Oct',
        november: 'Nov',
        december: 'Dec',

        // Footer
        footer: 'Made with ❤️ for kitesurfers',

        // Live indicator
        live: 'LIVE',

        // Errors
        errorLoading: 'Loading error',
        errorLoadingData: 'Error loading wind data',
        errorLoadingForecast: 'Error loading forecast'
    }
};

class LanguageManager {
    constructor() {
        this.currentLanguage = this.loadLanguagePreference();
        this.translations = translations;
    }

    /**
     * Load language preference from localStorage
     */
    loadLanguagePreference() {
        const saved = localStorage.getItem('jollykite-language');
        return saved || 'ru'; // Default to Russian
    }

    /**
     * Save language preference to localStorage
     */
    saveLanguagePreference(lang) {
        localStorage.setItem('jollykite-language', lang);
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Set language
     */
    setLanguage(lang) {
        if (lang !== 'ru' && lang !== 'en') {
            console.warn('Unsupported language:', lang);
            return false;
        }

        this.currentLanguage = lang;
        this.saveLanguagePreference(lang);
        return true;
    }

    /**
     * Toggle between languages
     */
    toggleLanguage() {
        const newLang = this.currentLanguage === 'ru' ? 'en' : 'ru';
        this.setLanguage(newLang);
        return newLang;
    }

    /**
     * Get translated text
     */
    t(key) {
        const translation = this.translations[this.currentLanguage][key];
        if (!translation) {
            console.warn(`Missing translation for key: ${key}`);
            return key;
        }
        return translation;
    }

    /**
     * Get day of week name
     */
    getDayName(dayIndex) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return this.t(days[dayIndex]);
    }

    /**
     * Get month name
     */
    getMonthName(monthIndex) {
        const months = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
        return this.t(months[monthIndex]);
    }

    /**
     * Format date according to current language
     */
    formatDate(date) {
        const day = date.getDate();
        const month = this.getMonthName(date.getMonth());
        const dayOfWeek = this.getDayName(date.getDay());

        if (this.currentLanguage === 'ru') {
            return `${dayOfWeek}, ${day} ${month}`;
        } else {
            return `${dayOfWeek}, ${month} ${day}`;
        }
    }
}

export default LanguageManager;
