# JollyKite iPhone App Architecture

## Target: iOS 17+, SwiftUI, MVVM with @Observable

---

## 1. Project File Tree

```
JollyKite/
├── JollyKiteApp.swift                          # App entry point, scene setup
├── ContentView.swift                           # Root TabView navigation
│
├── Config/
│   ├── AppConstants.swift                      # All constants (mirrors frontend config.js)
│   ├── WindSafetyConfig.swift                  # Safety thresholds, direction ranges, colors
│   └── KiteSizeConfig.swift                    # Kite sizes, calculation factors
│
├── Models/
│   ├── WindData.swift                          # Current wind data (Codable)
│   ├── WindSafety.swift                        # Safety level enum + computed properties
│   ├── WindForecast.swift                      # Forecast hour model (Codable)
│   ├── WindHistory.swift                       # History data point (Codable)
│   ├── WindTrend.swift                         # Trend model (Codable)
│   ├── WindTimeline.swift                      # Combined history+forecast for today
│   ├── KiteSizeRecommendation.swift            # Kite recommendation model
│   └── UserSettings.swift                      # User preferences (AppStorage-backed)
│
├── Services/
│   ├── WindAPIService.swift                    # REST API client (async/await)
│   ├── WindSSEService.swift                    # Server-Sent Events stream client
│   ├── WindSafetyCalculator.swift              # Safety level logic (from WindUtils.js)
│   ├── KiteSizeCalculator.swift                # Kite size recommendation engine
│   ├── UnitConverter.swift                     # knots <-> m/s conversion
│   └── HapticService.swift                     # UIFeedbackGenerator wrappers
│
├── ViewModels/
│   ├── DashboardViewModel.swift                # Current wind + safety + kite recs
│   ├── ForecastViewModel.swift                 # 3-day forecast data
│   ├── MapViewModel.swift                      # Map state, wind arrow overlay
│   ├── TimelineViewModel.swift                 # Today timeline + week history
│   └── SettingsViewModel.swift                 # Settings management
│
├── Views/
│   ├── Dashboard/
│   │   ├── DashboardView.swift                 # Main dashboard screen
│   │   ├── WindSpeedGaugeView.swift             # Large speed number + unit
│   │   ├── WindDirectionCompassView.swift       # Compass ring + arrow
│   │   ├── SafetyBadgeView.swift                # Color-coded safety indicator
│   │   ├── WindDetailsCardView.swift            # Gust, max gust, trend row
│   │   ├── KiteSizeSliderView.swift             # Horizontal kite size strip
│   │   └── KiteSizeChipView.swift               # Single kite size chip
│   │
│   ├── Forecast/
│   │   ├── ForecastView.swift                   # 3-day forecast screen
│   │   ├── ForecastDayCardView.swift            # Single day card with chart
│   │   └── ForecastChartView.swift              # Wind+wave SVG-like chart (Swift Charts)
│   │
│   ├── Map/
│   │   ├── MapView.swift                        # MapKit map screen
│   │   ├── WindArrowAnnotation.swift             # Custom map annotation for wind arrow
│   │   └── SpotAnnotationView.swift              # Kite spot pin
│   │
│   ├── Timeline/
│   │   ├── TimelineTabView.swift                # Container: today + week segments
│   │   ├── TodayTimelineChartView.swift          # Today's wind chart (Swift Charts)
│   │   └── WeekHistoryChartView.swift            # 7-day history charts (Swift Charts)
│   │
│   ├── Settings/
│   │   ├── SettingsView.swift                   # Settings screen
│   │   ├── LanguagePickerView.swift              # Language selector
│   │   ├── UnitPickerView.swift                  # knots/m/s toggle
│   │   ├── RiderSettingsView.swift               # Weight slider, board type picker
│   │   └── ServerURLView.swift                   # Server URL text field
│   │
│   └── Shared/
│       ├── WindColorScale.swift                  # Color mapping for wind speeds
│       ├── AnimatedNumberView.swift               # Number transition animation
│       ├── GradientBarView.swift                  # Wind speed gradient indicator
│       └── LoadingStateView.swift                 # Loading/error/empty states
│
├── Localization/
│   ├── Localizable.xcstrings                    # String catalog (en, ru, de, th)
│   └── LocalizationKeys.swift                   # Type-safe localization key enum
│
├── Resources/
│   ├── Assets.xcassets/                         # App icons, colors, images
│   │   ├── AppIcon.appiconset/
│   │   ├── Colors/
│   │   │   ├── BackgroundPrimary.colorset/      # #1e293b
│   │   │   ├── BackgroundSecondary.colorset/    # #334155
│   │   │   ├── SafetyDanger.colorset/           # #FF4500
│   │   │   ├── SafetyExcellent.colorset/        # #00FF00
│   │   │   ├── SafetyGood.colorset/             # #FFD700
│   │   │   ├── SafetyModerate.colorset/         # #FFA500
│   │   │   └── SafetyWeak.colorset/             # #87CEEB
│   │   └── WindIcons/                            # SF Symbol alternatives or custom
│   └── LaunchScreen.storyboard
│
└── Extensions/
    ├── Color+Wind.swift                         # Color extensions for wind speed mapping
    ├── Date+Bangkok.swift                       # Bangkok timezone helpers
    └── Double+Formatting.swift                  # Speed formatting extensions
```

---

## 2. MVVM Architecture with @Observable

### 2.1 Models (Data Layer)

```swift
// MARK: - WindData.swift
struct WindData: Codable, Sendable {
    let timestamp: Date
    let windSpeedKnots: Double
    let windGustKnots: Double?
    let maxGustKnots: Double?
    let windDir: Int
    let windDirAvg: Int?
    let temperature: Double?
    let humidity: Double?
    let pressure: Double?
}

// MARK: - WindSafety.swift
enum SafetyLevel: String, Codable, CaseIterable {
    case low        // Weak wind (#87CEEB)
    case good       // Good conditions (#FFD700)
    case medium     // Moderate (#FFA500)
    case high       // Excellent (#00FF00)
    case danger     // Dangerous (#FF4500)

    var color: Color {
        switch self {
        case .low:    return Color("SafetyWeak")      // #87CEEB
        case .good:   return Color("SafetyGood")      // #FFD700
        case .medium: return Color("SafetyModerate")  // #FFA500
        case .high:   return Color("SafetyExcellent") // #00FF00
        case .danger: return Color("SafetyDanger")    // #FF4500
        }
    }

    var localizedKey: LocalizedStringKey {
        switch self {
        case .low:    return "wind.safety.weak"
        case .good:   return "wind.safety.good"
        case .medium: return "wind.safety.moderate"
        case .high:   return "wind.safety.excellent"
        case .danger: return "wind.safety.dangerous"
        }
    }
}

enum WindType: String {
    case offshore   // 225-315 degrees - DANGEROUS
    case onshore    // 45-135 degrees - SAFE
    case sideshore  // Everything else
}

struct WindSafetyAssessment {
    let level: SafetyLevel
    let windType: WindType
    let isOffshore: Bool
    let isOnshore: Bool
}

// MARK: - WindForecast.swift
struct ForecastHour: Codable, Identifiable {
    var id: String { "\(date)-\(time)" }
    let date: Date
    let time: Int              // Hour 0-23
    let speed: Double          // knots
    let gust: Double           // knots
    let direction: Int         // degrees
    let waveHeight: Double?    // meters
    let waveDirection: Int?
    let wavePeriod: Double?
    let precipitationProbability: Int?
}

struct ForecastDay: Identifiable {
    let id = UUID()
    let date: Date
    let hours: [ForecastHour]
    var maxWindSpeed: Double { hours.map(\.speed).max() ?? 0 }
    var avgWindSpeed: Double {
        guard !hours.isEmpty else { return 0 }
        return hours.map(\.speed).reduce(0, +) / Double(hours.count)
    }
}

// MARK: - WindTrend.swift
struct WindTrend: Codable {
    let trend: String          // "stable", "increasing", "decreasing", etc.
    let icon: String
    let color: String          // hex color
    let percentChange: Double?
    let currentSpeed: Double?
    let previousSpeed: Double?
    let change: Double?
}

// MARK: - WindTimeline.swift
struct TimelinePoint: Identifiable {
    let id = UUID()
    let hour: Int
    let minute: Int
    let speed: Double
    let gust: Double
    let type: TimelinePointType // .history or .forecast

    var timeMinutes: Int { hour * 60 + minute }
}

enum TimelinePointType {
    case history
    case forecast
}

struct TodayTimeline {
    let history: [TimelinePoint]
    let forecast: [TimelinePoint]
    let correctionFactor: Double
    let currentTime: (hour: Int, minute: Int)?
}

// MARK: - KiteSizeRecommendation.swift
struct KiteSizeRecommendation: Identifiable {
    let id = UUID()
    let size: Double            // e.g., 8, 9, 10, 11, 12, 13.5, 14, 17
    let recommendedWeight: Int  // kg
    let suitability: KiteSuitability
    let isOptimal: Bool
}

enum KiteSuitability: String {
    case optimal      // #00FF00
    case good         // #90EE90
    case acceptable   // #FFD700
    case tooSmall     // #FFA500
    case tooLarge     // #FF8C00
    case none         // wind too weak/strong

    var color: Color {
        switch self {
        case .optimal:    return .green
        case .good:       return Color(red: 0.56, green: 0.93, blue: 0.56)
        case .acceptable: return .yellow
        case .tooSmall:   return .orange
        case .tooLarge:   return Color(red: 1.0, green: 0.55, blue: 0.0)
        case .none:       return .gray
        }
    }

    var localizedKey: LocalizedStringKey {
        switch self {
        case .optimal:    return "kite.optimal"
        case .good:       return "kite.good"
        case .acceptable: return "kite.acceptable"
        case .tooSmall:   return "kite.tooSmall"
        case .tooLarge:   return "kite.tooLarge"
        case .none:       return "kite.none"
        }
    }
}

// MARK: - UserSettings.swift
@Observable
final class UserSettings {
    // Persisted with @AppStorage semantics via manual UserDefaults
    var locale: AppLocale = .ru
    var windSpeedUnit: WindSpeedUnit = .knots
    var boardType: BoardType = .twintip
    var riderWeight: Double = 75.0    // 40-120 kg
    var serverBaseURL: String = "https://jollykite.app/api"
    var notificationsEnabled: Bool = false

    private let defaults = UserDefaults(suiteName: "group.com.jollykite.shared")!

    init() { load() }
    func load() { /* read from defaults */ }
    func save() { /* write to defaults */ }
}

enum AppLocale: String, CaseIterable, Codable {
    case en, ru, de, th

    var displayName: String {
        switch self {
        case .en: return "English"
        case .ru: return "Русский"
        case .de: return "Deutsch"
        case .th: return "ไทย"
        }
    }
}

enum WindSpeedUnit: String, CaseIterable, Codable {
    case knots
    case metersPerSecond

    var symbol: LocalizedStringKey {
        switch self {
        case .knots:           return "units.knotsShort"
        case .metersPerSecond: return "units.msShort"
        }
    }
}

enum BoardType: String, CaseIterable, Codable {
    case twintip
    case hydrofoil
}
```

### 2.2 Services (Business Logic Layer)

```swift
// MARK: - WindAPIService.swift
actor WindAPIService {
    private let session: URLSession
    private let baseURL: URL

    init(baseURL: URL) {
        self.baseURL = baseURL
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
    }

    // GET /wind/current -> WindData
    func fetchCurrentWind() async throws -> WindData

    // GET /wind/forecast -> [ForecastHour]
    func fetchForecast() async throws -> [ForecastDay]

    // GET /wind/trend -> WindTrend
    func fetchTrend() async throws -> WindTrend

    // GET /wind/history/:hours -> [WindData]
    func fetchHistory(hours: Int) async throws -> [WindData]

    // GET /wind/history/week -> [[String: Any]]
    func fetchWeekHistory() async throws -> [WeekDayHistory]

    // GET /wind/today/full?interval=5 -> TodayTimeline
    func fetchTodayTimeline() async throws -> TodayTimeline

    // GET /wind/statistics/:hours -> WindStatistics
    func fetchStatistics(hours: Int) async throws -> WindStatistics
}

// MARK: - WindSSEService.swift
@Observable
final class WindSSEService {
    private(set) var isConnected: Bool = false
    private var task: URLSessionDataTask?
    var onWindUpdate: ((WindData, WindTrend?) -> Void)?

    func connect(baseURL: URL) {
        // URLSession-based SSE client
        // Parse "data:" lines from /wind/stream
        // Auto-reconnect with 5s delay on disconnect
    }

    func disconnect() { /* close task, set isConnected false */ }
}

// MARK: - WindSafetyCalculator.swift
// Pure functions, no state - mirrors WindUtils.getWindSafety()
enum WindSafetyCalculator {
    static func assess(direction: Int, speedKnots: Double) -> WindSafetyAssessment {
        let isOffshore = direction >= 225 && direction <= 315
        let isOnshore = direction >= 45 && direction <= 135

        let level: SafetyLevel
        if speedKnots < 5 {
            level = .low
        } else if isOffshore || speedKnots > 30 {
            level = .danger
        } else if isOnshore && speedKnots >= 12 && speedKnots <= 25 {
            level = .high
        } else if isOnshore && speedKnots >= 5 && speedKnots < 12 {
            level = .good
        } else if speedKnots >= 8 && speedKnots <= 15 {
            level = .good
        } else {
            level = .medium
        }

        let windType: WindType
        if isOffshore { windType = .offshore }
        else if isOnshore { windType = .onshore }
        else { windType = .sideshore }

        return WindSafetyAssessment(
            level: level,
            windType: windType,
            isOffshore: isOffshore,
            isOnshore: isOnshore
        )
    }

    static func degreesToCardinal(_ degrees: Int) -> LocalizedStringKey {
        // Maps 0-360 to N/NE/E/SE/S/SW/W/NW
    }
}

// MARK: - KiteSizeCalculator.swift
// Mirrors frontend/js/utils/KiteSizeCalculator.js
enum KiteSizeCalculator {
    static let availableSizes: [Double] = [8, 9, 10, 11, 12, 13.5, 14, 17]

    struct CalcParams {
        let minWind: Double
        let maxWind: Double
        let factor: Double
    }

    static let twintipParams = CalcParams(minWind: 8, maxWind: 35, factor: 35)
    static let hydrofoilParams = CalcParams(minWind: 6, maxWind: 30, factor: 25)

    static func recommendations(
        windSpeed: Double,
        riderWeight: Double,
        boardType: BoardType
    ) -> [KiteSizeRecommendation] {
        // Formula: optimalSize = (riderWeight * factor) / windSpeed^2
        // For each available size, compute suitability
    }
}

// MARK: - UnitConverter.swift
enum UnitConverter {
    static let knotToMs: Double = 0.514444
    static let msToKnot: Double = 1.94384

    static func convert(_ value: Double, from: WindSpeedUnit, to: WindSpeedUnit) -> Double
    static func format(_ value: Double, unit: WindSpeedUnit, decimals: Int = 1) -> String
}

// MARK: - HapticService.swift
enum HapticService {
    static func safetyLevelChanged(to level: SafetyLevel) {
        switch level {
        case .danger:
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        case .high:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        default:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }
    }

    static func refresh() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}
```

### 2.3 ViewModels (@Observable)

```swift
// MARK: - DashboardViewModel.swift
@Observable
final class DashboardViewModel {
    // Published state
    private(set) var windData: WindData?
    private(set) var safety: WindSafetyAssessment?
    private(set) var trend: WindTrend?
    private(set) var kiteRecommendations: [KiteSizeRecommendation] = []
    private(set) var isLoading: Bool = false
    private(set) var error: Error?
    private(set) var lastUpdateTime: Date?
    private(set) var isConnected: Bool = false
    private(set) var isWithinWorkingHours: Bool = true

    // Dependencies
    private let apiService: WindAPIService
    private let sseService: WindSSEService
    private let settings: UserSettings

    // Previous safety level for haptic comparison
    private var previousSafetyLevel: SafetyLevel?

    init(apiService: WindAPIService, sseService: WindSSEService, settings: UserSettings) {
        self.apiService = apiService
        self.sseService = sseService
        self.settings = settings
    }

    // -- Actions --

    @MainActor
    func loadInitialData() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let data = try await apiService.fetchCurrentWind()
            updateWindData(data)
            trend = try await apiService.fetchTrend()
        } catch {
            self.error = error
        }
    }

    @MainActor
    func refresh() async {
        HapticService.refresh()
        await loadInitialData()
    }

    func connectToStream() {
        guard isWithinWorkingHours else { return }
        sseService.onWindUpdate = { [weak self] data, trend in
            Task { @MainActor in
                self?.updateWindData(data)
                if let trend { self?.trend = trend }
            }
        }
        sseService.connect(baseURL: URL(string: settings.serverBaseURL)!)
    }

    func disconnectFromStream() {
        sseService.disconnect()
    }

    // -- Private --

    @MainActor
    private func updateWindData(_ data: WindData) {
        self.windData = data
        self.lastUpdateTime = data.timestamp
        self.isConnected = sseService.isConnected

        // Compute safety
        let newSafety = WindSafetyCalculator.assess(
            direction: data.windDir,
            speedKnots: data.windSpeedKnots
        )
        self.safety = newSafety

        // Haptic on safety level change
        if let previous = previousSafetyLevel, previous != newSafety.level {
            HapticService.safetyLevelChanged(to: newSafety.level)
        }
        previousSafetyLevel = newSafety.level

        // Kite size recommendations
        kiteRecommendations = KiteSizeCalculator.recommendations(
            windSpeed: data.windSpeedKnots,
            riderWeight: settings.riderWeight,
            boardType: settings.boardType
        )
    }

    func checkWorkingHours() {
        // Bangkok timezone: 6:00 - 19:00
        let calendar = Calendar.current
        let bangkok = TimeZone(identifier: "Asia/Bangkok")!
        var bangkokCal = calendar
        bangkokCal.timeZone = bangkok
        let hour = bangkokCal.component(.hour, from: Date())
        isWithinWorkingHours = hour >= 6 && hour < 19
    }

    // Formatted values for display
    var displaySpeed: String {
        guard let data = windData else { return "--" }
        let converted = UnitConverter.convert(data.windSpeedKnots, from: .knots, to: settings.windSpeedUnit)
        return String(format: "%.1f", converted)
    }

    var displayGust: String {
        guard let gust = windData?.windGustKnots else { return "--" }
        let converted = UnitConverter.convert(gust, from: .knots, to: settings.windSpeedUnit)
        return String(format: "%.1f", converted)
    }

    var displayMaxGust: String {
        guard let maxGust = windData?.maxGustKnots else { return "--" }
        let converted = UnitConverter.convert(maxGust, from: .knots, to: settings.windSpeedUnit)
        return String(format: "%.1f", converted)
    }

    var displayDirection: Int {
        windData?.windDir ?? 0
    }

    var displayCardinal: LocalizedStringKey {
        WindSafetyCalculator.degreesToCardinal(displayDirection)
    }

    var timeSinceUpdate: String {
        guard let lastUpdate = lastUpdateTime else { return "" }
        let seconds = Int(Date().timeIntervalSince(lastUpdate))
        if seconds < 60 { return "\(seconds)s ago" }
        if seconds < 3600 { return "\(seconds / 60)m ago" }
        let fmt = DateFormatter()
        fmt.dateFormat = "HH:mm"
        return "at \(fmt.string(from: lastUpdate))"
    }
}


// MARK: - ForecastViewModel.swift
@Observable
final class ForecastViewModel {
    private(set) var forecastDays: [ForecastDay] = []
    private(set) var isLoading: Bool = false
    private(set) var error: Error?

    private let apiService: WindAPIService
    private let settings: UserSettings

    init(apiService: WindAPIService, settings: UserSettings) {
        self.apiService = apiService
        self.settings = settings
    }

    @MainActor
    func loadForecast() async {
        isLoading = true
        defer { isLoading = false }
        do {
            forecastDays = try await apiService.fetchForecast()
        } catch {
            self.error = error
        }
    }

    func windColor(forSpeed knots: Double) -> Color {
        // Mirrors getWindColor() from PWA
        switch knots {
        case ..<5:  return Color(hex: "87CEEB")
        case ..<10: return Color(hex: "00CED1")
        case ..<15: return .green
        case ..<20: return .yellow
        case ..<25: return .orange
        case ..<30: return Color(hex: "FF4500")
        default:    return Color(hex: "8B0000")
        }
    }
}


// MARK: - MapViewModel.swift
@Observable
final class MapViewModel {
    // Pak Nam Pran spot
    let spotCoordinate = CLLocationCoordinate2D(latitude: 12.346596, longitude: 99.998179)
    let kiterCoordinate = CLLocationCoordinate2D(latitude: 12.3468, longitude: 100.0116)

    private(set) var windDirection: Double = 0
    private(set) var windSpeed: Double = 0
    private(set) var safetyLevel: SafetyLevel = .low

    // Animated rotation target for smooth arrow rotation
    var arrowRotation: Angle { .degrees(windDirection) }

    func update(direction: Int, speed: Double, safety: SafetyLevel) {
        // withAnimation is called in the view layer
        self.windDirection = Double(direction)
        self.windSpeed = speed
        self.safetyLevel = safety
    }
}


// MARK: - TimelineViewModel.swift
@Observable
final class TimelineViewModel {
    // Today timeline
    private(set) var todayTimeline: TodayTimeline?
    private(set) var todayLoading: Bool = false
    private(set) var todayError: Error?

    // Week history
    private(set) var weekHistory: [WeekDayHistory] = []
    private(set) var weekLoading: Bool = false
    private(set) var weekError: Error?

    // Active segment
    var selectedSegment: TimelineSegment = .today

    private let apiService: WindAPIService
    private let settings: UserSettings

    init(apiService: WindAPIService, settings: UserSettings) {
        self.apiService = apiService
        self.settings = settings
    }

    @MainActor
    func loadTodayTimeline() async {
        todayLoading = true
        defer { todayLoading = false }
        do {
            todayTimeline = try await apiService.fetchTodayTimeline()
        } catch {
            todayError = error
        }
    }

    @MainActor
    func loadWeekHistory() async {
        weekLoading = true
        defer { weekLoading = false }
        do {
            weekHistory = try await apiService.fetchWeekHistory()
        } catch {
            weekError = error
        }
    }
}

enum TimelineSegment: String, CaseIterable {
    case today
    case week
}


// MARK: - SettingsViewModel.swift
@Observable
final class SettingsViewModel {
    let settings: UserSettings

    init(settings: UserSettings) {
        self.settings = settings
    }

    func setLocale(_ locale: AppLocale) {
        settings.locale = locale
        settings.save()
    }

    func setWindUnit(_ unit: WindSpeedUnit) {
        settings.windSpeedUnit = unit
        settings.save()
    }

    func setRiderWeight(_ weight: Double) {
        settings.riderWeight = max(40, min(120, weight))
        settings.save()
    }

    func setBoardType(_ type: BoardType) {
        settings.boardType = type
        settings.save()
    }

    func setServerURL(_ url: String) {
        settings.serverBaseURL = url
        settings.save()
    }
}
```

---

## 3. Screen Hierarchy and Navigation

### 3.1 TabView (Root Navigation)

```swift
// ContentView.swift
struct ContentView: View {
    @State private var selectedTab: AppTab = .dashboard
    @Environment(UserSettings.self) var settings

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Dashboard", systemImage: "wind", value: .dashboard) {
                DashboardView()
            }
            Tab("Forecast", systemImage: "cloud.sun", value: .forecast) {
                ForecastView()
            }
            Tab("Map", systemImage: "map", value: .map) {
                MapView()
            }
            Tab("Settings", systemImage: "gearshape", value: .settings) {
                SettingsView()
            }
        }
        .tint(.white)
        .preferredColorScheme(.dark)
    }
}

enum AppTab: Hashable {
    case dashboard
    case forecast
    case map
    case settings
}
```

### 3.2 Dashboard Screen (Tab 1)

```
DashboardView
├── ScrollView (.refreshable)
│   ├── VStack(spacing: 16)
│   │   ├── [if !isWithinWorkingHours] OfflineNoticeView
│   │   │
│   │   ├── HStack  // Header: status + last update
│   │   │   ├── Circle (green/red) + "LIVE" / "Offline"
│   │   │   └── Text(timeSinceUpdate)
│   │   │
│   │   ├── WindSpeedGaugeView        // LARGE: "14.5" + "kn"
│   │   │   ├── Text(speed)           // .font(.system(size: 72, weight: .bold, design: .rounded))
│   │   │   └── Text(unit)            // .font(.title3)
│   │   │
│   │   ├── SafetyBadgeView           // Colored pill: "Excellent! • Onshore"
│   │   │   ├── Capsule(fill: safety.color)
│   │   │   └── Text + safety text
│   │   │
│   │   ├── WindDirectionCompassView   // Compass with rotating arrow
│   │   │   ├── ZStack
│   │   │   │   ├── Circle (compass ring with N/E/S/W labels)
│   │   │   │   ├── Arrow Image (rotated by windDir)
│   │   │   │   └── Text(cardinal) // "NE"
│   │   │   └── Text(degrees) // "67°"
│   │   │
│   │   ├── WindDetailsCardView       // Rounded card with details
│   │   │   ├── HStack
│   │   │   │   ├── VStack("Gusts", gustValue)
│   │   │   │   ├── Divider
│   │   │   │   ├── VStack("Max today", maxGustValue)
│   │   │   │   ├── Divider
│   │   │   │   └── VStack("Trend", trendIcon + text)
│   │   │   └── Temperature row
│   │   │
│   │   ├── GradientBarView           // Wind speed indicator on gradient strip
│   │   │   ├── LinearGradient (blue->green->yellow->orange->red)
│   │   │   └── Circle indicator at current speed position
│   │   │
│   │   └── KiteSizeSliderView        // Horizontal scrollable kite sizes
│   │       ├── Text("Kite Size Recommendation")
│   │       ├── ScrollView(.horizontal)
│   │       │   └── HStack
│   │       │       └── ForEach(recommendations)
│   │       │           └── KiteSizeChipView(size, weight, suitability, isOptimal)
│   │       └── Text(hint)
```

### 3.3 Forecast Screen (Tab 2)

```
ForecastView
├── ScrollView
│   ├── VStack(spacing: 24)
│   │   └── ForEach(forecastDays) { day in
│   │       ForecastDayCardView
│   │       ├── Text(dayName)      // "Today", "Tomorrow", etc.
│   │       ├── ForecastChartView  // Swift Charts
│   │       │   ├── Chart {
│   │       │   │   ├── AreaMark (wind speed fill)
│   │       │   │   ├── LineMark (wind speed line, gradient stroke)
│   │       │   │   ├── PointMark (peak annotations)
│   │       │   │   ├── AreaMark (wave height, blue)
│   │       │   │   └── LineMark (wave height line)
│   │       │   }
│   │       │   ├── .chartXAxis { time labels every 2h }
│   │       │   └── .chartYAxis { speed labels }
│   │       └── HStack(rain droplets per hour)
│   │
│   └── LegendView (Wind/Waves/Rain icons with labels)
```

### 3.4 Map Screen (Tab 3)

```
MapView
├── Map(position: $cameraPosition) {
│   ├── Annotation("JollyKite", coordinate: spotCoordinate) {
│   │   └── SpotAnnotationView (kite emoji pin)
│   }
│   ├── Annotation("Wind", coordinate: kiterCoordinate) {
│   │   └── WindArrowAnnotation
│   │       ├── Image(systemName: "location.north.fill")
│   │       │   .rotationEffect(arrowRotation)  // Animated
│   │       │   .foregroundStyle(safety.color)
│   │       └── Text(speed + "kn")
│   }
│   └── MapPolyline (beach line, if desired)
}
├── .mapStyle(.standard(elevation: .realistic))
└── Overlay: safety badge at top
```

### 3.5 Timeline (Accessed from Dashboard or as sub-tab)

```
TimelineTabView
├── Picker("", selection: $selectedSegment)  // "Today" | "7 Days"
│   .pickerStyle(.segmented)
│
├── [if .today] TodayTimelineChartView
│   ├── Chart {
│   │   ├── AreaMark (history portion, solid colors)
│   │   ├── LineMark (history line, gradient)
│   │   ├── AreaMark (forecast portion, dashed/faded)
│   │   ├── LineMark (forecast line, dashed)
│   │   ├── RuleMark (vertical divider at current time, gold dashed)
│   │   └── PointMark (peak annotations with labels)
│   }
│   ├── .chartXAxis { 6:00 to 18:00, every 2h }
│   └── HStack: "Actual" label | "Forecast x1.2" label
│
├── [if .week] ScrollView
│   └── ForEach(weekHistory) { day in
│       WeekHistoryChartView
│       ├── Text(dayLabel)
│       ├── Chart {
│       │   ├── AreaMark (wind speed)
│       │   ├── LineMark (wind speed, gradient)
│       │   └── PointMark (peaks)
│       }
│       └── .chartXAxis { 6:00 to 18:00, every 3h }
│   }
```

### 3.6 Settings Screen (Tab 4)

```
SettingsView
├── NavigationStack
│   └── List {
│       Section("Language") {
│           LanguagePickerView
│           └── Picker(selection: locale) {
│               ForEach(AppLocale.allCases) { Text($0.displayName) }
│           }
│       }
│       Section("Units") {
│           UnitPickerView
│           └── Picker(selection: windSpeedUnit) {
│               Text("Knots (kn)"), Text("m/s")
│           }
│           .pickerStyle(.segmented)
│       }
│       Section("Rider Settings") {
│           RiderSettingsView
│           ├── Picker(boardType) { "Twintip", "Hydrofoil" }
│           ├── Slider(riderWeight, 40...120, step: 1)
│           └── Text("Used to calculate optimal kite size")
│       }
│       Section("Server") {
│           ServerURLView
│           └── TextField("Server URL", text: $serverURL)
│       }
│       Section("Notifications") {
│           Toggle("Wind Alerts", isOn: $notificationsEnabled)
│           Text("description...")
│       }
│       Section("About") {
│           Text("JollyKite v2.5.9")
│           Link("Telegram @gypsy_mermaid", ...)
│       }
│   }
│   .navigationTitle("Settings")
```

---

## 4. Data Flow Diagram

```
                     ┌─────────────────────────────────┐
                     │        JollyKiteApp.swift        │
                     │  @State settings = UserSettings  │
                     │  Creates: APIService, SSEService  │
                     └──────────────┬──────────────────┘
                                    │ .environment(settings)
                     ┌──────────────▼──────────────────┐
                     │         ContentView              │
                     │    TabView(4 tabs)                │
                     └──────┬───┬───┬───┬──────────────┘
                            │   │   │   │
           ┌────────────────┘   │   │   └────────────────┐
           │                    │   │                     │
    ┌──────▼──────┐   ┌────────▼──┐│ ┌───────────────┐  ┌▼────────────┐
    │ Dashboard   │   │ Forecast  ││ │    Map        │  │  Settings   │
    │ ViewModel   │   │ ViewModel ││ │  ViewModel    │  │  ViewModel  │
    └──────┬──────┘   └────┬──────┘│ └───────┬───────┘  └──────┬──────┘
           │               │       │         │                  │
           │               │       │         │                  │
    ┌──────▼───────────────▼───────▼─────────▼──────────────────▼──────┐
    │                        WindAPIService (actor)                     │
    │  GET /wind/current    GET /wind/forecast     GET /wind/trend      │
    │  GET /wind/today/full GET /wind/history/week GET /wind/statistics  │
    └──────────────────────────────┬───────────────────────────────────┘
                                   │
    ┌──────────────────────────────▼───────────────────────────────────┐
    │                        WindSSEService                            │
    │  EventSource: GET /wind/stream  (real-time updates)              │
    │  -> onWindUpdate callback -> DashboardViewModel                  │
    └──────────────────────────────┬───────────────────────────────────┘
                                   │
                     ┌─────────────▼──────────────┐
                     │    Backend Server           │
                     │    (Express.js + SQLite)    │
                     │    /api/wind/*              │
                     └─────────────────────────────┘


    ┌─────────────────── Safety Computation Flow ──────────────────────┐
    │                                                                   │
    │  WindData (from API/SSE)                                          │
    │       │                                                           │
    │       ├── windDir + windSpeedKnots                                │
    │       │       │                                                   │
    │       │       └──> WindSafetyCalculator.assess()                  │
    │       │                 │                                         │
    │       │                 └──> WindSafetyAssessment                 │
    │       │                       ├── level: .high                    │
    │       │                       ├── windType: .onshore              │
    │       │                       ├── isOffshore: false               │
    │       │                       └── isOnshore: true                 │
    │       │                                                           │
    │       ├── windSpeedKnots + settings.riderWeight + boardType       │
    │       │       │                                                   │
    │       │       └──> KiteSizeCalculator.recommendations()           │
    │       │                 │                                         │
    │       │                 └──> [KiteSizeRecommendation]             │
    │       │                       ├── size: 12, optimal: true         │
    │       │                       └── size: 14, suitability: .good    │
    │       │                                                           │
    │       └── windSpeedKnots + settings.windSpeedUnit                 │
    │               │                                                   │
    │               └──> UnitConverter.convert()                        │
    │                         │                                         │
    │                         └──> displaySpeed: "7.3 m/s"              │
    └───────────────────────────────────────────────────────────────────┘
```

---

## 5. Color Scheme

### 5.1 Background Colors (Dark Theme)

| Name               | Hex       | Usage                           |
|--------------------|-----------|---------------------------------|
| BackgroundPrimary  | `#1e293b` | Main background (slate-800)     |
| BackgroundSecondary| `#334155` | Cards, elevated surfaces        |
| BackgroundTertiary | `#475569` | Input fields, segmented controls|
| SurfaceOverlay     | `#ffffff0D` | Frosted glass overlays (5%)   |

### 5.2 Safety Colors

| Level     | Hex       | SwiftUI Color Asset    | Usage                |
|-----------|-----------|------------------------|----------------------|
| Weak      | `#87CEEB` | `SafetyWeak`           | Wind < 5 kn          |
| Good      | `#FFD700` | `SafetyGood`           | Decent conditions    |
| Moderate  | `#FFA500` | `SafetyModerate`       | Sideshore            |
| Excellent | `#00FF00` | `SafetyExcellent`      | Onshore 12-25 kn     |
| Danger    | `#FF4500` | `SafetyDanger`         | Offshore or >30 kn   |

### 5.3 Wind Speed Color Scale (for charts/gradient bar)

| Speed Range  | Hex       | Description       |
|-------------|-----------|-------------------|
| 0-5 kn      | `#87CEEB` | Light blue - calm |
| 5-10 kn     | `#00CED1` | Teal              |
| 10-15 kn    | `#00FF00` | Green - great     |
| 15-20 kn    | `#FFD700` | Yellow - good     |
| 20-25 kn    | `#FFA500` | Orange - strong   |
| 25-30 kn    | `#FF4500` | Red-orange        |
| 30+ kn      | `#8B0000` | Dark red - danger |

### 5.4 Implementation

```swift
// Color+Wind.swift
extension Color {
    static func windSpeed(_ knots: Double) -> Color {
        switch knots {
        case ..<5:  return Color(hex: "87CEEB")
        case ..<10: return Color(hex: "00CED1")
        case ..<15: return Color(hex: "00FF00")
        case ..<20: return Color(hex: "FFD700")
        case ..<25: return Color(hex: "FFA500")
        case ..<30: return Color(hex: "FF4500")
        default:    return Color(hex: "8B0000")
        }
    }

    init(hex: String) {
        // Standard hex init
    }
}
```

---

## 6. Animations

### 6.1 Wind Arrow Rotation

```swift
// WindDirectionCompassView.swift
struct WindDirectionCompassView: View {
    let direction: Double  // degrees 0-360
    let speed: Double

    @State private var animatedDirection: Double = 0

    var body: some View {
        ZStack {
            // Compass ring
            CompassRingView()

            // Wind arrow - smoothly animated
            Image(systemName: "location.north.fill")
                .font(.system(size: 40))
                .foregroundStyle(Color.windSpeed(speed))
                .rotationEffect(.degrees(animatedDirection))
                .shadow(color: Color.windSpeed(speed).opacity(0.5), radius: 8)
        }
        .onChange(of: direction) { oldValue, newValue in
            withAnimation(.spring(duration: 0.8, bounce: 0.2)) {
                // Calculate shortest rotation path
                let delta = shortestAngleDelta(from: animatedDirection, to: newValue)
                animatedDirection += delta
            }
        }
    }

    private func shortestAngleDelta(from: Double, to: Double) -> Double {
        var delta = (to - from).truncatingRemainder(dividingBy: 360)
        if delta > 180 { delta -= 360 }
        if delta < -180 { delta += 360 }
        return delta
    }
}
```

### 6.2 Speed Number Transition

```swift
// AnimatedNumberView.swift
struct AnimatedNumberView: View {
    let value: Double
    let format: String  // "%.1f"
    let font: Font

    @State private var animatedValue: Double = 0

    var body: some View {
        Text(String(format: format, animatedValue))
            .font(font)
            .contentTransition(.numericText(value: animatedValue))
            .onChange(of: value) { _, newValue in
                withAnimation(.spring(duration: 0.6)) {
                    animatedValue = newValue
                }
            }
            .onAppear {
                animatedValue = value
            }
    }
}
```

### 6.3 Safety Badge Color Transition

```swift
// SafetyBadgeView.swift
struct SafetyBadgeView: View {
    let safety: WindSafetyAssessment

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(safety.level.color)
                .frame(width: 10, height: 10)
                .shadow(color: safety.level.color, radius: 4)

            Text(safety.level.localizedKey)
                .fontWeight(.semibold)

            Text("•")

            Text(windTypeKey)
                .foregroundStyle(safety.level.color)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Capsule()
                .fill(safety.level.color.opacity(0.15))
                .overlay(
                    Capsule()
                        .strokeBorder(safety.level.color.opacity(0.3), lineWidth: 1)
                )
        )
        .animation(.easeInOut(duration: 0.5), value: safety.level)
    }

    private var windTypeKey: LocalizedStringKey {
        switch safety.windType {
        case .offshore:  return "info.dangerOffshore"
        case .onshore:   return "info.onshore"
        case .sideshore: return "info.sideshore"
        }
    }
}
```

---

## 7. Haptic Feedback

```swift
// Haptic triggers in the app:

// 1. Safety level changes (in DashboardViewModel)
//    - .danger -> UINotificationFeedbackGenerator .error (double buzz)
//    - .high   -> UINotificationFeedbackGenerator .success (triple tap)
//    - other   -> UIImpactFeedbackGenerator .medium

// 2. Pull-to-refresh (in DashboardView)
//    - UIImpactFeedbackGenerator .light on pull start

// 3. Kite size selection (in KiteSizeSliderView)
//    - UISelectionFeedbackGenerator on optimal size highlight

// 4. Tab switches
//    - UISelectionFeedbackGenerator .selectionChanged
```

---

## 8. Pull-to-Refresh

```swift
// DashboardView.swift
struct DashboardView: View {
    @Environment(DashboardViewModel.self) var viewModel

    var body: some View {
        ScrollView {
            dashboardContent
        }
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadInitialData()
            viewModel.connectToStream()
        }
    }
}
```

---

## 9. Deep Linking (Widget Taps)

```swift
// JollyKiteApp.swift
@main
struct JollyKiteApp: App {
    @State private var selectedTab: AppTab = .dashboard

    var body: some Scene {
        WindowGroup {
            ContentView(selectedTab: $selectedTab)
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }

    private func handleDeepLink(_ url: URL) {
        // URL scheme: jollykite://
        // jollykite://dashboard      -> Dashboard tab
        // jollykite://forecast       -> Forecast tab
        // jollykite://map            -> Map tab
        // jollykite://settings       -> Settings tab
        // jollykite://timeline/today -> Timeline (today)
        // jollykite://timeline/week  -> Timeline (week)
        guard url.scheme == "jollykite" else { return }

        switch url.host {
        case "dashboard":  selectedTab = .dashboard
        case "forecast":   selectedTab = .forecast
        case "map":        selectedTab = .map
        case "settings":   selectedTab = .settings
        default: break
        }
    }
}
```

---

## 10. Dependency Injection Pattern

```swift
// JollyKiteApp.swift
@main
struct JollyKiteApp: App {
    // Shared state
    @State private var settings = UserSettings()

    // Services (created once)
    @State private var apiService: WindAPIService
    @State private var sseService = WindSSEService()

    // ViewModels (created once, shared across tabs)
    @State private var dashboardVM: DashboardViewModel
    @State private var forecastVM: ForecastViewModel
    @State private var mapVM: MapViewModel
    @State private var timelineVM: TimelineViewModel
    @State private var settingsVM: SettingsViewModel

    init() {
        let settings = UserSettings()
        let api = WindAPIService(baseURL: URL(string: settings.serverBaseURL)!)
        let sse = WindSSEService()

        _settings = State(initialValue: settings)
        _apiService = State(initialValue: api)
        _sseService = State(initialValue: sse)

        _dashboardVM = State(initialValue: DashboardViewModel(apiService: api, sseService: sse, settings: settings))
        _forecastVM = State(initialValue: ForecastViewModel(apiService: api, settings: settings))
        _mapVM = State(initialValue: MapViewModel())
        _timelineVM = State(initialValue: TimelineViewModel(apiService: api, settings: settings))
        _settingsVM = State(initialValue: SettingsViewModel(settings: settings))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(settings)
                .environment(dashboardVM)
                .environment(forecastVM)
                .environment(mapVM)
                .environment(timelineVM)
                .environment(settingsVM)
        }
    }
}
```

---

## 11. Key Design Decisions

### Why @Observable (not ObservableObject)?
- iOS 17+ target allows using the Observation framework
- Finer-grained view updates (only re-renders views that read changed properties)
- No need for `@Published` property wrappers - cleaner code
- No need for `@StateObject` / `@ObservedObject` distinction - just `@Environment`

### Why actor for WindAPIService?
- Network calls are inherently concurrent
- Actor isolation prevents data races on URL session state
- Clean async/await integration with SwiftUI .task modifiers

### Why manual SSE instead of AsyncStream?
- URLSession's EventSource pattern requires fine control over reconnection
- Background task handling needs explicit lifecycle management
- Can be wrapped in AsyncStream later if needed

### Why Swift Charts instead of custom drawing?
- Native framework, optimized for Apple platforms
- Automatic accessibility support (VoiceOver reads chart data)
- Built-in gesture support for scrubbing through data points
- Consistent with Apple HIG

### Why single UserSettings shared across all VMs?
- Ensures unit/language changes immediately reflect everywhere
- @Observable propagation is efficient
- Backed by UserDefaults with App Group for widget sharing

### Working hours (6:00-19:00 Bangkok time)
- Wind station only operates during daytime
- App hides real-time data outside these hours
- Shows offline notice with next available time
- SSE connection only established during working hours
