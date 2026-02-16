/// JollyKiteShared - Shared data layer for JollyKite Apple apps.
///
/// This Swift package provides the complete networking, data models,
/// business logic, and persistence layer shared across:
/// - JollyKite iPhone app
/// - JollyKite Apple Watch app
/// - JollyKite WidgetKit widgets
///
/// ## Architecture
///
/// ```
/// Sources/JollyKiteShared/
/// ├── Models/          - Data models (Codable, Sendable, Hashable)
/// │   ├── WindData          - Current wind measurement
/// │   ├── WindForecast      - 3-day forecast collection
/// │   ├── WindTrend         - Trend direction + percentage
/// │   ├── WindStatistics    - min/avg/max for period
/// │   ├── WaveData          - Wave height/direction/period
/// │   ├── SafetyLevel       - 5-level safety enum with colors
/// │   ├── WindDirection     - Degrees + compass + arrow
/// │   ├── WindUnit          - Knots / m/s with conversion
/// │   ├── WindHistory       - Historical measurements
/// │   └── KiteSize          - Size recommendation + board type
/// ├── Networking/      - API clients
/// │   ├── APIClient         - Backend API (protocol + implementation)
/// │   ├── SSEClient         - Server-Sent Events for real-time
/// │   ├── OpenMeteoClient   - Direct forecast fallback
/// │   ├── AmbientWeatherClient - Direct weather fallback
/// │   └── APIError          - Typed error enum
/// ├── Services/        - Business logic
/// │   ├── WindSafetyService - Safety calculation
/// │   ├── KiteSizeService   - Kite size recommendation
/// │   ├── WorkingHoursService - Bangkok timezone hours
/// │   └── WindDataService   - High-level data orchestration
/// ├── Utils/           - Infrastructure
/// │   ├── UnitConverter     - Speed/temperature conversions
/// │   ├── SharedDataStore   - App Group UserDefaults
/// │   ├── WindDataCache     - File-based JSON cache
/// │   ├── PreferencesStore  - User settings
/// │   └── WatchConnectivityManager - WCSession wrapper
/// └── Extensions/      - Swift extensions
///     ├── Color+Hex         - Color from hex string
///     ├── Date+Bangkok      - Bangkok timezone helpers
///     └── Double+Formatting - Wind speed formatting
/// ```
///
/// ## Quick Start
///
/// ```swift
/// let prefs = PreferencesStore()
/// let client = prefs.makeAPIClient()
/// let service = WindDataService(apiClient: client)
///
/// let wind = try await service.currentWind()
/// let safety = WindSafetyService.evaluate(windData: wind)
/// let kite = KiteSizeService.recommend(
///     windSpeedKnots: wind.windSpeedKnots,
///     riderWeight: prefs.riderWeight,
///     boardType: prefs.boardType
/// )
/// ```

// Re-export Foundation for convenience
@_exported import Foundation
