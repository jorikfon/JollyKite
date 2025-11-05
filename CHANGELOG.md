# Changelog

All notable changes to the JollyKite project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.3] - 2025-11-05

### Fixed
- **Unit Symbol Localization**: Fixed wind speed unit symbols to use localized values
  - Russian now displays "уз" instead of "kn" for knots
  - Russian displays "м/с" instead of "m/s" for meters per second
  - Other languages continue to use "kn" and "m/s"
- **Chart Legend Translation**: Fixed forecast chart legend not translating
  - Wind, Waves, Rain labels now properly translate in all 4 languages
  - Changed from window.i18n to this.i18n in ForecastManager
- **Timeline Header Units**: Added unit display to "Today's Wind Timeline" header
  - Shows "(уз)" or "(м/с)" based on current setting
  - Updates automatically when unit setting changes

### Changed
- **UnitConverter Enhancement**: Updated getUnitSymbol() and getUnitName() methods
  - Now uses window.i18n for localized unit names and symbols
  - Falls back to static values if i18n is not available
- **ForecastManager Constructor**: Now accepts i18n parameter
  - Ensures proper translation access during initialization
  - getDayName() method uses this.i18n instead of window.i18n

### Technical Details
- Updated UnitConverter.js (lines 121-166): Added i18n support for unit symbols and names
- Updated ForecastManager.js (lines 1-4, 339-341): Added i18n to constructor and fixed legend translations
- Updated index.html (lines 314-317): Added todayTimelineUnit element
- Updated App.js (lines 34, 437-441): Pass i18n to ForecastManager and update timeline header unit
- Service Worker cache updated to v2.4.3

---

## [2.4.2] - 2025-11-04

### Fixed
- **CRITICAL: Initialization Order Bug**: Fixed window.i18n being set AFTER components initialization
  - Moved `window.i18n = this.i18nManager` to happen BEFORE ForecastManager, KiteSizeRecommendation, etc. init
  - Fixed "calm", "Today", "Tomorrow", and chart legends not translating
  - All dynamic content (wind descriptions, day names, chart labels) now translate properly
  - Components can now access window.i18n during their initialization
- **Critical Translation System Bug**: Fixed translatePage() not being called
  - Page content now translates properly when language changes
  - All section titles (Today's Wind Timeline, 3-Day Wind Forecast, etc.) now translate
  - Station Offline notice and all data-i18n elements now work correctly
- **HTML in Translations**: Fixed I18nManager to support HTML tags in translations
  - Modified translatePage() to use innerHTML for translations with HTML tags
  - Keeps textContent for plain text (safer from XSS)
  - Fixed "Station Offline" notice with proper formatting
- **Time Display Translations**: Fixed LIVE counter time display
  - "4m ago" now properly translates to all languages
  - Added translations: secondsAgo, minutesAgo, at
  - Works in all 4 languages (EN, RU, DE, TH)

### Changed
- **App.js Initialization Order**: Restructured to set global objects before component init
  - `window.i18n`, `window.settings`, `window.unitConverter` now set at line 86-88
  - Removed duplicate assignment at line 180-182 (was after components init)
  - Ensures all components have access to i18n from the start
- **I18nManager.translatePage()**: Enhanced to detect and handle HTML in translations
  - Uses regex `/<[^>]+>/` to detect HTML tags
  - Switches between innerHTML and textContent automatically
- **MenuController.translateUI()**: Simplified to call i18n.translatePage() for full page translation
- **App.js init()**: Added translatePage() call after setting locale

### Technical Details
- **CRITICAL FIX** at App.js lines 85-89: Set window globals BEFORE component initialization
- Updated I18nManager.js (lines 259-278): Enhanced translatePage() method
- Updated MenuController.js (lines 226-238): Simplified translateUI()
- Updated App.js (lines 82-83): Added translatePage() call on init
- Added time translation keys to all 4 language files
- Service Worker cache updated to v2.4.2

---

## [2.4.1] - 2025-11-04

### Fixed
- **Complete Translation Coverage**: Fixed all remaining hardcoded text
  - Trend text ("Усиление", "Ослабление") now properly translates based on backend trend type
  - "LIVE" indicator now translates to "Онлайн" (RU), "Live" (EN/DE), "ถ่ายทอดสด" (TH)
  - Section titles updated to include "Wind" keyword in all languages
- **Section Title Improvements**:
  - "3-Day Forecast" → "3-Day Wind Forecast" (and equivalents in all languages)
  - "7-Day History" → "7-Day Wind History" (and equivalents in all languages)
  - "Today's Wind Timeline" remains consistent across all languages

### Changed
- **App.js**: Updated `updateWindTrendFromBackend()` to map backend trend types to i18n keys
  - `increasing_strong` → `trends.strengthening`
  - `decreasing_strong` → `trends.weakening`
  - `stable` → `trends.stable`
- **Translation Files**: Enhanced consistency across all 4 languages (EN, RU, DE, TH)

### Technical Details
- Added trend type mapping in App.js (lines 367-376)
- Added `data-i18n` attributes to LIVE indicator in index.html
- Service Worker cache updated to v2.4.1

---

## [2.4.0] - 2025-11-04

### Fixed
- **Unit Conversion Bug**: Fixed wind speed unit conversion not applying to displayed values
  - Now properly converts wind speed, gusts, and max gusts between knots and m/s
  - Added automatic refresh when unit setting changes
  - Fixed issue where "knots" or "kn" still showed when meters/second was selected
- **Missing Translations**: Completed i18n integration across all components:
  - Fixed hardcoded Russian text for wind trends ("Усиление", "Ослабевает", "Стабильный")
  - Fixed hardcoded wind direction types ("Отжим", "Прижим", "Боковой")
  - Fixed "за 30 мин" and "Накапливаем данные..." in trend display
  - Added translations for offshore/onshore/sideshore in all 4 languages
- **WindUtils.js Error**: Fixed `category.subtitle.includes` TypeError
  - Updated to use i18n system instead of hardcoded category properties
  - Modified config.js to use i18n keys for wind categories and safety levels

### Added
- **Wind Type Translations**: New translation keys for wind directions:
  - `info.offshore`, `info.onshore`, `info.sideshore`, `info.dangerOffshore`
- **Trend Translations**: Enhanced trend translations:
  - `trends.for30min`, `trends.accumulatingData`
  - `trends.strengthening`, `trends.weakening`
- **Auto-Refresh on Unit Change**: App now automatically refreshes all data when units change
- **I18nManager Enhancement**: Added `getFullLocale()` method for proper date formatting

### Changed
- **Date Formatting**: Now uses locale-aware formatting (en-US, ru-RU, de-DE, th-TH)
  - ForecastManager.js uses `getFullLocale()` for date display
  - WeekWindHistory.js uses locale-specific date formatting
  - HistoryManager.js CSV exports use current locale
- **Component Integration**: All major components now receive i18n instance:
  - TodayWindTimeline, KiteSizeRecommendation, NotificationManager
  - WeekWindHistory, HistoryManager, WindStatistics
- **Config Structure**: Updated to use i18n keys instead of hardcoded text
  - `windCategories` now use `i18nKey` property
  - `windSafety.levels` now use `i18nKey` property

### Technical Details
- Updated `App.js` to listen for `unitChanged` events
- Modified `updateWindDisplay()` to apply unit conversion
- Enhanced `WindStatistics.js` and `WindUtils.js` with i18n support
- Service Worker cache updated to v2.4.0

## [2.3.0] - 2025-11-04

### Added
- **Settings Menu**: New slide-in settings panel with Material Design 3 styling
- **Multi-language Support**: Full internationalization (i18n) system with 4 languages:
  - 🇬🇧 English (EN)
  - 🇷🇺 Русский (RU)
  - 🇩🇪 Deutsch (DE)
  - 🇹🇭 ไทย (TH)
- **Unit Conversion**: Toggle between knots and meters/second for wind speed display
- **Automatic Language Detection**: App detects browser language on first load
- **Settings Persistence**: User preferences saved to LocalStorage
- **I18n System Components**:
  - `I18nManager.js`: Translation management and language switching
  - `SettingsManager.js`: Centralized settings management
  - `LocalStorageManager.js`: Persistent storage utilities
  - `MenuController.js`: Settings menu UI controller
  - `UnitConverter.js`: Wind speed unit conversion utilities
- **Translation Files**: Complete translations for all UI elements in 4 languages

### Changed
- **Notification Button**: Moved from main UI into settings menu
- **All UI Text**: Now uses i18n keys instead of hardcoded strings
- **Wind Speed Display**: Dynamically converts based on selected unit
- **Menu Button**: New settings button in top-right corner
- **App Structure**: Better organization with dedicated folders for i18n, settings, and utils

### Improved
- **Mobile Responsiveness**: Settings menu adapts to mobile screens (full-width panel)
- **User Experience**: Smooth animations for menu transitions
- **Code Maintainability**: Removed hardcoded strings from codebase
- **Accessibility**: Added data-i18n attributes for future screen reader support

### Technical Details
- Added new modules:
  - `frontend/js/i18n/I18nManager.js`
  - `frontend/js/i18n/translations/en.js`
  - `frontend/js/i18n/translations/ru.js`
  - `frontend/js/i18n/translations/de.js`
  - `frontend/js/i18n/translations/th.js`
  - `frontend/js/settings/SettingsManager.js`
  - `frontend/js/settings/LocalStorageManager.js`
  - `frontend/js/settings/MenuController.js`
  - `frontend/js/utils/UnitConverter.js`
- Updated CSS: Added 278 lines of styles for settings menu
- Updated HTML: Added menu structure and data-i18n attributes
- Settings stored in LocalStorage under key `jollyKite_settings`

---

## [2.2.2] - Previous Release

### Added
- Improved kite size cards layout for mobile devices

---

## [2.2.1] - Previous Release

### Added
- Optimized graphs for mobile and improved UX

---

## [2.1.1] - Previous Release

### Added
- Working hours management
- Rain display
- Mobile optimization
- 7-day history

---

## [2.0.0] - Previous Release

### Added
- Enhanced forecast display with hourly intervals
- Improved UI

---

[2.3.0]: https://github.com/yourusername/jollykite/compare/v2.2.2...v2.3.0
[2.2.2]: https://github.com/yourusername/jollykite/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/yourusername/jollykite/compare/v2.1.1...v2.2.1
[2.1.1]: https://github.com/yourusername/jollykite/compare/v2.0.0...v2.1.1
[2.0.0]: https://github.com/yourusername/jollykite/releases/tag/v2.0.0
