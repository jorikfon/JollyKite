# JollyKite Apple Watch App - Complete Design Document

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure](#2-file-structure)
3. [Data Models](#3-data-models)
4. [Watch Connectivity (WCSession)](#4-watch-connectivity)
5. [Complications (WidgetKit)](#5-complications)
6. [Watch Screens](#6-watch-screens)
7. [Interactions](#7-interactions)
8. [Background Refresh](#8-background-refresh)
9. [Always-On Display](#9-always-on-display)
10. [Battery Optimization](#10-battery-optimization)
11. [Standalone Mode](#11-standalone-mode)
12. [Data Flow Diagrams](#12-data-flow-diagrams)

---

## 1. Architecture Overview

**Target:** watchOS 10+, SwiftUI-native
**Minimum Hardware:** Apple Watch Series 6 (for Always-On Display)
**Companion:** JollyKite iPhone app (primary data source)
**Standalone:** Direct API calls when iPhone unavailable

### Design Principles

- **Glanceable**: All critical info visible within 2 seconds
- **Battery-first**: Minimize network calls from Watch; prefer iPhone relay
- **Safety-critical**: Offshore wind alerts must always work, even standalone
- **Time-aware**: Reduce updates outside 6:00-19:00 Bangkok time (UTC+7)

### Module Dependency Graph

```
JollyKiteWatch (watchOS App)
├── JollyKiteWatchApp.swift          -- App entry point
├── Models/
│   ├── WindData.swift               -- Core wind data model (shared)
│   ├── SafetyLevel.swift            -- Safety level enum + colors
│   └── ForecastEntry.swift          -- Hourly forecast model
├── Services/
│   ├── WatchConnectivityService.swift -- WCSession management
│   ├── WindAPIService.swift          -- Direct API client (standalone)
│   ├── DataStore.swift               -- Local persistence (@AppStorage + UserDefaults suite)
│   └── HapticManager.swift           -- Haptic feedback orchestration
├── ViewModels/
│   ├── WindViewModel.swift           -- Main screen state
│   └── ForecastViewModel.swift       -- Forecast list state
├── Views/
│   ├── MainWindView.swift            -- Primary glance screen
│   ├── ForecastListView.swift        -- Hourly forecast
│   ├── SafetyAlertView.swift         -- Full-screen danger overlay
│   └── Components/
│       ├── CompassRoseView.swift     -- Wind direction compass
│       ├── WindGaugeView.swift       -- Circular speed gauge
│       └── SafetyBadgeView.swift     -- Colored safety indicator
├── Complications/
│   └── WindComplicationProvider.swift -- WidgetKit timeline provider
└── Background/
    └── BackgroundTaskHandler.swift   -- WKApplicationRefreshBackgroundTask

JollyKiteWatchWidgets (Widget Extension)
├── JollyKiteWatchWidgets.swift       -- Widget bundle entry
├── WindComplicationProvider.swift     -- TimelineProvider
└── ComplicationViews/
    ├── CircularComplicationView.swift
    ├── RectangularComplicationView.swift
    ├── CornerGaugeComplicationView.swift
    └── InlineComplicationView.swift
```

---

## 2. File Structure

```
JollyKite/
├── JollyKiteWatch/                          # watchOS App Target
│   ├── JollyKiteWatchApp.swift
│   ├── Info.plist
│   ├── Assets.xcassets/
│   │   ├── AppIcon.appiconset/
│   │   ├── AccentColor.colorset/
│   │   └── ComplicationColors/
│   │       ├── SafetyLow.colorset/          # #87CEEB
│   │       ├── SafetyGood.colorset/         # #FFD700
│   │       ├── SafetyMedium.colorset/       # #FFA500
│   │       ├── SafetyHigh.colorset/         # #00FF00
│   │       └── SafetyDanger.colorset/       # #FF4500
│   │
│   ├── Models/
│   │   ├── WindData.swift
│   │   ├── SafetyLevel.swift
│   │   └── ForecastEntry.swift
│   │
│   ├── Services/
│   │   ├── WatchConnectivityService.swift
│   │   ├── WindAPIService.swift
│   │   ├── DataStore.swift
│   │   └── HapticManager.swift
│   │
│   ├── ViewModels/
│   │   ├── WindViewModel.swift
│   │   └── ForecastViewModel.swift
│   │
│   ├── Views/
│   │   ├── MainWindView.swift
│   │   ├── ForecastListView.swift
│   │   ├── SafetyAlertView.swift
│   │   └── Components/
│   │       ├── CompassRoseView.swift
│   │       ├── WindGaugeView.swift
│   │       └── SafetyBadgeView.swift
│   │
│   └── Background/
│       └── BackgroundTaskHandler.swift
│
├── JollyKiteWatchWidgets/                   # Widget Extension Target
│   ├── JollyKiteWatchWidgets.swift
│   ├── WindComplicationProvider.swift
│   ├── ComplicationViews/
│   │   ├── CircularComplicationView.swift
│   │   ├── RectangularComplicationView.swift
│   │   ├── CornerGaugeComplicationView.swift
│   │   └── InlineComplicationView.swift
│   └── Info.plist
│
└── Shared/                                  # Shared between iPhone + Watch
    ├── Models/
    │   ├── WindData.swift
    │   ├── SafetyLevel.swift
    │   └── ForecastEntry.swift
    ├── Config/
    │   └── AppConstants.swift
    └── Utilities/
        ├── WindCalculations.swift
        └── UnitConverter.swift
```

---

## 3. Data Models

### WindData (Shared)

```swift
import Foundation

/// Core wind data model shared between iPhone and Watch
struct WindData: Codable, Equatable {
    let windSpeedKnots: Double
    let windGustKnots: Double?
    let maxGustKnots: Double?
    let windDir: Int
    let windDirAvg: Int?
    let temperature: Double?
    let humidity: Double?
    let pressure: Double?
    let timestamp: Date

    /// Computed safety assessment
    var safety: SafetyLevel {
        SafetyLevel.calculate(direction: windDir, speedKnots: windSpeedKnots)
    }

    /// Cardinal direction string (N, NE, E, SE, S, SW, W, NW)
    var cardinalDirection: String {
        WindCalculations.degreesToCardinal(windDir)
    }

    /// Direction arrow character for compact display
    var directionArrow: String {
        WindCalculations.degreesToArrow(windDir)
    }

    /// Speed in m/s (for unit toggle)
    var windSpeedMs: Double {
        windSpeedKnots / 1.944
    }
}
```

### SafetyLevel (Shared)

```swift
import SwiftUI

/// Wind safety levels matching backend config
enum SafetyLevel: String, Codable, CaseIterable {
    case low      // <5 kn - too weak
    case good     // 8-15 kn sideshore or 5-12 kn onshore
    case medium   // moderate conditions
    case high     // 12-25 kn onshore - excellent
    case danger   // offshore or >30 kn

    /// Safety color matching config.windSafety.levels
    var color: Color {
        switch self {
        case .low:    return Color(hex: "#87CEEB") // Light blue
        case .good:   return Color(hex: "#FFD700") // Gold
        case .medium: return Color(hex: "#FFA500") // Orange
        case .high:   return Color(hex: "#00FF00") // Green
        case .danger: return Color(hex: "#FF4500") // Red-orange
        }
    }

    /// Darker variant for Always-On Display
    var dimmedColor: Color {
        color.opacity(0.4)
    }

    /// Whether this level should trigger haptic alert
    var requiresHaptic: Bool {
        self == .danger || self == .high
    }

    /// Whether this is an offshore danger condition
    var isDangerous: Bool {
        self == .danger
    }

    /// Russian-language label (matching web app)
    var localizedText: String {
        switch self {
        case .low:    return "Слабый ветер"
        case .good:   return "Хорошие условия"
        case .medium: return "Умеренно"
        case .high:   return "Отличные условия!"
        case .danger: return "Опасно!"
        }
    }

    /// Short label for complications
    var shortText: String {
        switch self {
        case .low:    return "Слабо"
        case .good:   return "Хорошо"
        case .medium: return "Средне"
        case .high:   return "Отлично"
        case .danger: return "Опасно"
        }
    }

    /// Calculate safety level from direction and speed
    /// Logic mirrors WindUtils.getWindSafety() and ApiRouter.calculateSafety()
    static func calculate(direction: Int, speedKnots: Double) -> SafetyLevel {
        let isOffshore = direction >= 225 && direction <= 315
        let isOnshore  = direction >= 45  && direction <= 135

        if speedKnots < 5 {
            return .low
        } else if isOffshore || speedKnots > 30 {
            return .danger
        } else if isOnshore && speedKnots >= 12 && speedKnots <= 25 {
            return .high
        } else if isOnshore && speedKnots >= 5 && speedKnots < 12 {
            return .good
        } else if speedKnots >= 8 && speedKnots <= 15 {
            return .good
        } else {
            return .medium
        }
    }
}
```

### ForecastEntry

```swift
import Foundation

/// Single hourly forecast entry
struct ForecastEntry: Codable, Identifiable {
    var id: Date { date }
    let date: Date
    let windSpeedKnots: Double
    let windGustKnots: Double?
    let windDir: Int

    var safety: SafetyLevel {
        SafetyLevel.calculate(direction: windDir, speedKnots: windSpeedKnots)
    }

    var cardinalDirection: String {
        WindCalculations.degreesToCardinal(windDir)
    }

    var hourString: String {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "Asia/Bangkok")
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}
```

### AppConstants (Shared)

```swift
import Foundation

enum AppConstants {
    /// Backend API base URL
    static let apiBaseURL = "https://jollykite.app/api"

    /// Working hours in Bangkok time (UTC+7)
    static let workingHourStart = 6   // 6:00 AM
    static let workingHourEnd   = 19  // 7:00 PM

    /// Bangkok timezone
    static let bangkokTimeZone = TimeZone(identifier: "Asia/Bangkok")!

    /// Wind speed gauge range
    static let gaugeMinKnots: Double = 0
    static let gaugeMaxKnots: Double = 30

    /// Background refresh interval (seconds)
    static let backgroundRefreshInterval: TimeInterval = 15 * 60 // 15 minutes

    /// Off-hours refresh interval (reduced for battery)
    static let offHoursRefreshInterval: TimeInterval = 60 * 60 // 1 hour

    /// Forecast hours to show
    static let forecastHoursCount = 6

    /// WatchConnectivity keys
    enum WCKeys {
        static let windData = "windData"
        static let forecast = "forecast"
        static let lastUpdate = "lastUpdate"
        static let requestRefresh = "requestRefresh"
        static let complicationData = "complicationData"
    }

    /// UserDefaults suite for shared data (app group)
    static let appGroupID = "group.com.jollykite.shared"

    /// Conversion factors
    static let knotsToMs: Double = 1.0 / 1.944
    static let msToKnots: Double = 1.944
}
```

---

## 4. Watch Connectivity (WCSession)

### WatchConnectivityService

```swift
import WatchConnectivity
import Combine

/// Manages bidirectional communication between iPhone and Watch
final class WatchConnectivityService: NSObject, ObservableObject {
    static let shared = WatchConnectivityService()

    @Published var latestWindData: WindData?
    @Published var forecast: [ForecastEntry] = []
    @Published var isReachable: Bool = false
    @Published var isPhoneConnected: Bool = false

    private var session: WCSession?
    private let dataStore = DataStore.shared

    private override init() {
        super.init()
    }

    /// Activate WCSession - call from app init
    func activate() {
        guard WCSession.isSupported() else { return }
        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    /// Request fresh data from iPhone
    func requestRefresh() {
        guard let session = session, session.isReachable else {
            // iPhone not reachable - fall back to standalone
            return
        }

        session.sendMessage(
            [AppConstants.WCKeys.requestRefresh: true],
            replyHandler: { response in
                self.processReceivedData(response)
            },
            errorHandler: { error in
                print("WC request failed: \(error.localizedDescription)")
            }
        )
    }

    /// Process incoming data from iPhone
    private func processReceivedData(_ data: [String: Any]) {
        // Decode wind data
        if let windJSON = data[AppConstants.WCKeys.windData] as? Data {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            if let windData = try? decoder.decode(WindData.self, from: windJSON) {
                DispatchQueue.main.async {
                    self.latestWindData = windData
                    self.dataStore.saveWindData(windData)
                }
            }
        }

        // Decode forecast
        if let forecastJSON = data[AppConstants.WCKeys.forecast] as? Data {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            if let entries = try? decoder.decode([ForecastEntry].self, from: forecastJSON) {
                DispatchQueue.main.async {
                    self.forecast = entries
                    self.dataStore.saveForecast(entries)
                }
            }
        }
    }
}

// MARK: - WCSessionDelegate
extension WatchConnectivityService: WCSessionDelegate {

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        DispatchQueue.main.async {
            self.isPhoneConnected = activationState == .activated
        }
    }

    /// Receive application context (latest snapshot from iPhone)
    /// This is the PRIMARY data transfer mechanism - survives app kills
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        processReceivedData(applicationContext)
    }

    /// Receive real-time message (when both apps are active)
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        processReceivedData(message)
    }

    /// Receive message with reply handler
    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        processReceivedData(message)
        replyHandler(["received": true])
    }

    /// Receive complication user info transfers (guaranteed delivery)
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        if userInfo[AppConstants.WCKeys.complicationData] != nil {
            processReceivedData(userInfo)
            // Trigger complication timeline reload
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    /// Reachability changed
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }
}
```

### iPhone-side WCSession Handler (in iPhone app)

```swift
/// iPhone sends wind updates to Watch via application context
func sendWindUpdateToWatch(windData: WindData, forecast: [ForecastEntry]) {
    guard WCSession.default.activationState == .activated else { return }

    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601

    var context: [String: Any] = [:]

    if let windJSON = try? encoder.encode(windData) {
        context[AppConstants.WCKeys.windData] = windJSON
    }
    if let forecastJSON = try? encoder.encode(forecast) {
        context[AppConstants.WCKeys.forecast] = forecastJSON
    }

    // Application context: latest data survives app termination
    try? WCSession.default.updateApplicationContext(context)

    // If complication is active, use transferCurrentComplicationUserInfo
    // for guaranteed delivery (limited to 50/day by system)
    if WCSession.default.isComplicationEnabled {
        WCSession.default.transferCurrentComplicationUserInfo(context)
    }
}
```

### Data Flow Summary

```
iPhone (primary data source)
  │
  ├── Every 30s: fetch /api/wind/current
  ├── Every 5min: fetch /api/wind/forecast
  │
  ├─── updateApplicationContext() ──────> Watch receives in background
  │    (latest snapshot, overwrites)       via didReceiveApplicationContext
  │
  ├─── sendMessage() ─────────────────> Watch receives in real-time
  │    (when both apps are active)       via didReceiveMessage
  │
  └─── transferCurrentComplicationUserInfo() ──> Watch complication update
       (guaranteed delivery, 50/day limit)       via didReceiveUserInfo

Watch (consumer + standalone fallback)
  │
  ├── Receives data passively from iPhone
  ├── Requests refresh via sendMessage (reply handler)
  └── Falls back to direct API calls when iPhone unavailable
```

---

## 5. Complications (WidgetKit-based, watchOS 10+)

### TimelineProvider

```swift
import WidgetKit
import SwiftUI

struct WindComplicationProvider: TimelineProvider {
    let dataStore = DataStore.shared

    /// Placeholder for first render
    func placeholder(in context: Context) -> WindTimelineEntry {
        WindTimelineEntry(
            date: Date(),
            windData: WindData.placeholder,
            relevance: .init(score: 0)
        )
    }

    /// Snapshot for gallery preview
    func getSnapshot(in context: Context, completion: @escaping (WindTimelineEntry) -> Void) {
        let windData = dataStore.loadWindData() ?? WindData.placeholder
        completion(WindTimelineEntry(date: Date(), windData: windData, relevance: nil))
    }

    /// Timeline: current + future entries
    func getTimeline(in context: Context, completion: @escaping (Timeline<WindTimelineEntry>) -> Void) {
        let windData = dataStore.loadWindData() ?? WindData.placeholder
        let now = Date()

        // Current entry
        let currentEntry = WindTimelineEntry(
            date: now,
            windData: windData,
            relevance: TimelineEntryRelevance(score: safetyRelevanceScore(windData.safety))
        )

        // Request refresh in 15 minutes (or 1 hour outside working hours)
        let refreshInterval = isWithinWorkingHours()
            ? AppConstants.backgroundRefreshInterval
            : AppConstants.offHoursRefreshInterval

        let nextUpdate = now.addingTimeInterval(refreshInterval)

        let timeline = Timeline(
            entries: [currentEntry],
            policy: .after(nextUpdate)
        )
        completion(timeline)
    }

    /// Higher relevance score = more likely to be shown on watch face
    private func safetyRelevanceScore(_ safety: SafetyLevel) -> Float {
        switch safety {
        case .danger: return 1.0    // Always show danger
        case .high:   return 0.9    // Excellent conditions = high priority
        case .good:   return 0.7
        case .medium: return 0.5
        case .low:    return 0.2
        }
    }

    private func isWithinWorkingHours() -> Bool {
        let calendar = Calendar.current
        let bangkokDate = Date().convertToTimeZone(AppConstants.bangkokTimeZone)
        let hour = calendar.component(.hour, from: bangkokDate)
        return hour >= AppConstants.workingHourStart && hour < AppConstants.workingHourEnd
    }
}

struct WindTimelineEntry: TimelineEntry {
    let date: Date
    let windData: WindData
    let relevance: TimelineEntryRelevance?
}
```

### Complication Views

#### Circular Complication

```
  ASCII Mockup:
  ┌─────────────┐
  │  ╭───────╮  │
  │  │  ↗    │  │    Arrow: wind direction
  │  │  12   │  │    Number: speed in knots
  │  │  kn   │  │    Background: safety color
  │  ╰───────╯  │
  └─────────────┘

  Danger state:
  ┌─────────────┐
  │  ╭───────╮  │
  │  │  ⚠    │  │    Warning icon replaces arrow
  │  │  28   │  │    Red background
  │  │  kn   │  │
  │  ╰───────╯  │
  └─────────────┘
```

```swift
struct CircularComplicationView: View {
    let windData: WindData

    var body: some View {
        ZStack {
            // Safety color background
            AccessoryWidgetBackground()
                .tint(windData.safety.color)

            VStack(spacing: -2) {
                // Direction arrow (or warning icon for danger)
                if windData.safety.isDangerous {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                } else {
                    Image(systemName: "location.north.fill")
                        .font(.system(size: 10))
                        .rotationEffect(.degrees(Double(windData.windDir)))
                        .foregroundStyle(.white)
                }

                // Wind speed
                Text("\(Int(windData.windSpeedKnots.rounded()))")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Text("kn")
                    .font(.system(size: 8, weight: .medium))
                    .foregroundStyle(.white.opacity(0.8))
            }
        }
        .widgetAccentable()
    }
}
```

#### Rectangular Complication

```
  ASCII Mockup (normal):
  ┌──────────────────────────────┐
  │ 🟢 12 kn  SE ↗   gust 18   │
  │ ████████████░░░░░░░░░░░░░░░ │  <- safety color bar
  │ Отличные условия!            │
  └──────────────────────────────┘

  ASCII Mockup (danger):
  ┌──────────────────────────────┐
  │ 🔴 28 kn  W ←    gust 35   │
  │ ████████████████████████████ │  <- red bar (full)
  │ ⚠ ОПАСНО - оффшор!          │
  └──────────────────────────────┘
```

```swift
struct RectangularComplicationView: View {
    let windData: WindData

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            // Top row: speed + direction + gust
            HStack {
                // Safety dot
                Circle()
                    .fill(windData.safety.color)
                    .frame(width: 8, height: 8)

                // Speed
                Text("\(Int(windData.windSpeedKnots.rounded())) kn")
                    .font(.system(size: 16, weight: .bold, design: .rounded))

                // Direction
                Text("\(windData.cardinalDirection) \(windData.directionArrow)")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)

                Spacer()

                // Gust
                if let gust = windData.windGustKnots {
                    Text("gust \(Int(gust.rounded()))")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }

            // Safety color bar (proportional to wind speed)
            GeometryReader { geo in
                RoundedRectangle(cornerRadius: 2)
                    .fill(windData.safety.color)
                    .frame(
                        width: geo.size.width * min(windData.windSpeedKnots / 30.0, 1.0),
                        height: 3
                    )
            }
            .frame(height: 3)

            // Safety text
            HStack(spacing: 4) {
                if windData.safety.isDangerous {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(windData.safety.color)
                }
                Text(windData.safety.shortText)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        }
    }
}
```

#### Corner/Gauge Complication

```
  ASCII Mockup:
       0
      ╱│╲
    ╱  │  ╲
  5 ───┼─── 30      Gauge arc from 0-30 knots
    ╲  │  ╱          Filled portion = current speed
      ╲│╱            Color = safety level
      15
     12kn            Speed label below
      SE              Direction below
```

```swift
struct CornerGaugeComplicationView: View {
    let windData: WindData

    var body: some View {
        Gauge(
            value: min(windData.windSpeedKnots, AppConstants.gaugeMaxKnots),
            in: AppConstants.gaugeMinKnots...AppConstants.gaugeMaxKnots
        ) {
            // Gauge label (below)
            Text("\(windData.cardinalDirection)")
                .font(.system(size: 9))
        } currentValueLabel: {
            // Center value
            Text("\(Int(windData.windSpeedKnots.rounded()))")
                .font(.system(size: 14, weight: .bold, design: .rounded))
        } minimumValueLabel: {
            Text("0")
                .font(.system(size: 8))
        } maximumValueLabel: {
            Text("30")
                .font(.system(size: 8))
        }
        .gaugeStyle(.accessoryCircular)
        .tint(Gradient(colors: [
            Color(hex: "#87CEEB"),  // 0 kn: blue (low)
            Color(hex: "#FFD700"),  // ~10 kn: gold (good)
            Color(hex: "#00FF00"),  // ~15 kn: green (high)
            Color(hex: "#FFA500"),  // ~22 kn: orange (medium)
            Color(hex: "#FF4500")   // 30 kn: red (danger)
        ]))
    }
}
```

#### Inline Complication

```
  ASCII Mockup:
  ┌──────────────────────────────────────┐
  │  12kn SE ↗                           │
  └──────────────────────────────────────┘

  Danger:
  ┌──────────────────────────────────────┐
  │  ⚠ 28kn W ← OFFSHORE                │
  └──────────────────────────────────────┘
```

```swift
struct InlineComplicationView: View {
    let windData: WindData

    var body: some View {
        if windData.safety.isDangerous {
            Label {
                Text("\(Int(windData.windSpeedKnots.rounded()))kn \(windData.cardinalDirection) \(windData.directionArrow) OFFSHORE")
            } icon: {
                Image(systemName: "exclamationmark.triangle.fill")
            }
        } else {
            Text("\(Int(windData.windSpeedKnots.rounded()))kn \(windData.cardinalDirection) \(windData.directionArrow)")
        }
    }
}
```

### Widget Bundle

```swift
import WidgetKit
import SwiftUI

@main
struct JollyKiteWatchWidgets: WidgetBundle {
    var body: some Widget {
        // Circular family
        JollyKiteCircularWidget()
        // Rectangular family
        JollyKiteRectangularWidget()
        // Corner/Gauge family
        JollyKiteCornerWidget()
        // Inline family
        JollyKiteInlineWidget()
    }
}

struct JollyKiteCircularWidget: Widget {
    let kind = "JollyKiteCircular"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WindComplicationProvider()) { entry in
            CircularComplicationView(windData: entry.windData)
        }
        .configurationDisplayName("JollyKite Wind")
        .description("Current wind speed and direction")
        .supportedFamilies([.accessoryCircular])
    }
}

struct JollyKiteRectangularWidget: Widget {
    let kind = "JollyKiteRectangular"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WindComplicationProvider()) { entry in
            RectangularComplicationView(windData: entry.windData)
        }
        .configurationDisplayName("JollyKite Wind Detail")
        .description("Wind speed, direction, gust, and safety")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct JollyKiteCornerWidget: Widget {
    let kind = "JollyKiteCorner"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WindComplicationProvider()) { entry in
            CornerGaugeComplicationView(windData: entry.windData)
        }
        .configurationDisplayName("JollyKite Gauge")
        .description("Wind speed gauge with direction")
        .supportedFamilies([.accessoryCorner])
    }
}

struct JollyKiteInlineWidget: Widget {
    let kind = "JollyKiteInline"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WindComplicationProvider()) { entry in
            InlineComplicationView(windData: entry.windData)
        }
        .configurationDisplayName("JollyKite Inline")
        .description("Compact wind info")
        .supportedFamilies([.accessoryInline])
    }
}
```

---

## 6. Watch Screens

### Screen 1: Main Wind View (Primary Glance)

```
  ┌─────────────────────────────────────┐
  │           JOLLYKITE                 │  Title bar
  ├─────────────────────────────────────┤
  │                                     │
  │            N                        │
  │         NW ╱ NE                     │  Compass rose
  │        W ──●── E                    │  with direction
  │         SW ╲ SE                     │  indicator line
  │            S                        │
  │         ↗ (arrow pointing SE)       │
  │                                     │
  │         ╔═══════════╗               │
  │         ║    12     ║               │  Large speed
  │         ║   knots   ║               │  (tap to toggle kn/ms)
  │         ╚═══════════╝               │
  │                                     │
  │    gust: 18 kn    max: 22 kn       │  Gust info
  │                                     │
  │  ┌─────────────────────────────┐    │
  │  │ ● ОТЛИЧНЫЕ УСЛОВИЯ!        │    │  Safety badge
  │  │   onshore SE                │    │  (colored background)
  │  └─────────────────────────────┘    │
  │                                     │
  │    Updated: 14:23                   │  Last update time
  └─────────────────────────────────────┘

  DANGER variant (red background pulse):
  ┌─────────────────────────────────────┐
  │ ╔═══════════════════════════════╗   │
  │ ║  ⚠  ОПАСНО! ОФФШОР!  ⚠     ║   │
  │ ║                               ║   │
  │ ║     28 kn  ←  W              ║   │
  │ ║     gust: 35 kn              ║   │
  │ ║                               ║   │
  │ ║   Ветер дует в море!         ║   │
  │ ╚═══════════════════════════════╝   │
  └─────────────────────────────────────┘
```

```swift
struct MainWindView: View {
    @StateObject private var viewModel = WindViewModel()
    @State private var showKnots = true
    @State private var showSafetyAlert = false

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Compass rose with wind direction
                CompassRoseView(direction: viewModel.windDir)
                    .frame(width: 100, height: 100)

                // Wind speed (tappable to toggle units)
                VStack(spacing: 0) {
                    Text(speedText)
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .foregroundStyle(viewModel.safetyColor)

                    Text(showKnots ? "knots" : "m/s")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                .onTapGesture {
                    showKnots.toggle()
                    HapticManager.shared.tap()
                }

                // Gust info
                HStack(spacing: 16) {
                    if let gust = viewModel.windGustKnots {
                        VStack {
                            Text("gust")
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)
                            Text("\(Int(gust.rounded()))")
                                .font(.system(size: 18, weight: .semibold, design: .rounded))
                        }
                    }
                    if let maxGust = viewModel.maxGustKnots {
                        VStack {
                            Text("max")
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)
                            Text("\(Int(maxGust.rounded()))")
                                .font(.system(size: 18, weight: .semibold, design: .rounded))
                        }
                    }
                }

                // Safety badge
                SafetyBadgeView(safety: viewModel.safety)

                // Last update
                if let timestamp = viewModel.lastUpdate {
                    Text("Updated: \(timestamp, style: .time)")
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("JollyKite")
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(isPresented: $showSafetyAlert) {
            SafetyAlertView(windData: viewModel.currentData)
        }
        .onChange(of: viewModel.safety) { _, newSafety in
            if newSafety.isDangerous {
                showSafetyAlert = true
                HapticManager.shared.dangerAlert()
            } else if newSafety == .high {
                HapticManager.shared.goodConditions()
            }
        }
    }

    private var speedText: String {
        let speed = showKnots
            ? viewModel.windSpeedKnots
            : viewModel.windSpeedKnots * AppConstants.knotsToMs
        return "\(Int(speed.rounded()))"
    }
}
```

### Screen 2: Forecast List

```
  ┌─────────────────────────────────────┐
  │           ПРОГНОЗ                   │  Title
  ├─────────────────────────────────────┤
  │  ┌───────────────────────────────┐  │
  │  │ 14:00   12kn  SE ↗   ● 🟢  │  │  Current hour (highlighted)
  │  └───────────────────────────────┘  │
  │  ┌───────────────────────────────┐  │
  │  │ 15:00   14kn  SE ↗   ● 🟢  │  │
  │  └───────────────────────────────┘  │
  │  ┌───────────────────────────────┐  │
  │  │ 16:00   16kn  E  →   ● 🟢  │  │
  │  └───────────────────────────────┘  │
  │  ┌───────────────────────────────┐  │
  │  │ 17:00   11kn  E  →   ● 🟡  │  │
  │  └───────────────────────────────┘  │
  │  ┌───────────────────────────────┐  │
  │  │ 18:00    8kn  NE ↗   ● 🟡  │  │
  │  └───────────────────────────────┘  │
  │  ┌───────────────────────────────┐  │
  │  │ 19:00    5kn  N  ↑   ● 🔵  │  │  (scrollable via Crown)
  │  └───────────────────────────────┘  │
  └─────────────────────────────────────┘
```

```swift
struct ForecastListView: View {
    @StateObject private var viewModel = ForecastViewModel()

    var body: some View {
        List {
            ForEach(viewModel.entries) { entry in
                HStack {
                    // Time
                    Text(entry.hourString)
                        .font(.system(size: 14, weight: .medium, design: .monospaced))
                        .frame(width: 45, alignment: .leading)

                    // Wind speed
                    Text("\(Int(entry.windSpeedKnots.rounded()))kn")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .frame(width: 38, alignment: .trailing)

                    // Direction
                    Text("\(entry.cardinalDirection) \(WindCalculations.degreesToArrow(entry.windDir))")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .frame(width: 40, alignment: .leading)

                    Spacer()

                    // Safety dot
                    Circle()
                        .fill(entry.safety.color)
                        .frame(width: 10, height: 10)
                }
                .listRowBackground(
                    entry.isCurrentHour
                        ? entry.safety.color.opacity(0.15)
                        : Color.clear
                )
            }
        }
        .navigationTitle("Прогноз")
        // Digital Crown scrolls through the list naturally
    }
}
```

### Screen 3: Safety Alert (Full-Screen Overlay)

```
  ┌─────────────────────────────────────┐
  │ ╔═══════════════════════════════╗   │
  │ ║                               ║   │
  │ ║        ⚠  ⚠  ⚠             ║   │
  │ ║                               ║   │
  │ ║     ОПАСНО!                  ║   │  Red pulsing background
  │ ║     ОФФШОР                   ║   │
  │ ║                               ║   │
  │ ║     28 kn  ←  W             ║   │
  │ ║     gust: 35 kn             ║   │
  │ ║                               ║   │
  │ ║   Ветер дует от берега      ║   │
  │ ║   в открытое море!          ║   │
  │ ║                               ║   │
  │ ║   Не выходите на воду!      ║   │
  │ ║                               ║   │
  │ ║     [ Понятно ]              ║   │  Dismiss button
  │ ║                               ║   │
  │ ╚═══════════════════════════════╝   │
  └─────────────────────────────────────┘
```

```swift
struct SafetyAlertView: View {
    let windData: WindData?
    @Environment(\.dismiss) private var dismiss
    @State private var isPulsing = false

    var body: some View {
        ZStack {
            // Pulsing red background
            Color(hex: "#FF4500")
                .opacity(isPulsing ? 0.8 : 0.5)
                .animation(.easeInOut(duration: 1.0).repeatForever(), value: isPulsing)
                .ignoresSafeArea()

            VStack(spacing: 12) {
                // Warning icons
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                    Image(systemName: "exclamationmark.triangle.fill")
                    Image(systemName: "exclamationmark.triangle.fill")
                }
                .font(.title2)
                .foregroundStyle(.yellow)

                // Title
                Text("ОПАСНО!")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)

                Text("ОФФШОР")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.9))

                // Wind data
                if let data = windData {
                    VStack(spacing: 4) {
                        Text("\(Int(data.windSpeedKnots.rounded())) kn  \(data.directionArrow)  \(data.cardinalDirection)")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)

                        if let gust = data.windGustKnots {
                            Text("gust: \(Int(gust.rounded())) kn")
                                .font(.system(size: 14))
                                .foregroundStyle(.white.opacity(0.8))
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Warning message
                VStack(spacing: 2) {
                    Text("Ветер дует от берега")
                        .font(.system(size: 12))
                    Text("в открытое море!")
                        .font(.system(size: 12))
                    Text("")
                    Text("Не выходите на воду!")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundStyle(.white.opacity(0.9))

                // Dismiss button
                Button("Понятно") {
                    dismiss()
                }
                .buttonStyle(.bordered)
                .tint(.white)
            }
            .padding()
        }
        .onAppear {
            isPulsing = true
        }
    }
}
```

### Tab-Based Navigation

```swift
@main
struct JollyKiteWatchApp: App {
    @StateObject private var connectivity = WatchConnectivityService.shared

    init() {
        WatchConnectivityService.shared.activate()
    }

    var body: some Scene {
        WindowGroup {
            TabView {
                MainWindView()
                ForecastListView()
            }
            .tabViewStyle(.verticalPage) // watchOS 10+ vertical paging
            .environmentObject(connectivity)
        }
        .backgroundTask(.appRefresh("windRefresh")) {
            await BackgroundTaskHandler.handleRefresh()
        }
    }
}
```

---

## 7. Interactions

### Digital Crown

The Digital Crown provides natural scrolling through the forecast list view. On the main screen, it is not explicitly overridden -- TabView vertical paging uses it to switch between Main and Forecast screens.

```swift
// Forecast view: Crown scrolls through hours naturally via List/ScrollView
// No custom .digitalCrownRotation needed -- standard List behavior suffices
```

### Haptic Feedback

```swift
import WatchKit

/// Centralized haptic feedback manager
final class HapticManager {
    static let shared = HapticManager()
    private let device = WKInterfaceDevice.current()
    private init() {}

    /// Light tap for UI interactions (unit toggle, etc.)
    func tap() {
        device.play(.click)
    }

    /// Strong alert for danger conditions (offshore wind)
    /// Plays 3 strong haptics in sequence
    func dangerAlert() {
        device.play(.notification)  // strong buzz
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            self.device.play(.notification)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            self.device.play(.notification)
        }
    }

    /// Subtle success haptic for good/excellent conditions
    func goodConditions() {
        device.play(.success)
    }

    /// Directional tick (used when scrolling forecast)
    func scrollTick() {
        device.play(.directionUp)
    }
}
```

### Tap to Toggle Units

On the main screen, tapping the wind speed value toggles between knots and m/s. This preference is persisted in `@AppStorage` so it survives app restarts.

```swift
// In MainWindView:
@AppStorage("showKnots", store: UserDefaults(suiteName: AppConstants.appGroupID))
private var showKnots = true

// Tap gesture on speed text triggers toggle + haptic
.onTapGesture {
    showKnots.toggle()
    HapticManager.shared.tap()
}
```

---

## 8. Background Refresh

```swift
import WatchKit
import WidgetKit

enum BackgroundTaskHandler {

    /// Handle background app refresh
    /// Called by system every ~15 min during working hours
    static func handleRefresh() async {
        // 1. Try to get data from iPhone first
        let connectivity = WatchConnectivityService.shared
        if connectivity.isPhoneConnected {
            connectivity.requestRefresh()
        } else {
            // 2. Standalone: fetch directly from API
            let apiService = WindAPIService()
            if let windData = try? await apiService.fetchCurrentWind() {
                DataStore.shared.saveWindData(windData)
            }
            if let forecast = try? await apiService.fetchForecast() {
                DataStore.shared.saveForecast(forecast)
            }
        }

        // 3. Reload complication timelines
        WidgetCenter.shared.reloadAllTimelines()

        // 4. Schedule next refresh
        scheduleNextRefresh()
    }

    /// Schedule the next background refresh based on working hours
    static func scheduleNextRefresh() {
        let interval: TimeInterval

        if isWithinWorkingHours() {
            interval = AppConstants.backgroundRefreshInterval     // 15 min
        } else {
            interval = AppConstants.offHoursRefreshInterval       // 1 hour
        }

        let preferredDate = Date().addingTimeInterval(interval)

        WKApplication.shared().scheduleBackgroundRefresh(
            withPreferredDate: preferredDate,
            userInfo: nil
        ) { error in
            if let error = error {
                print("Failed to schedule refresh: \(error)")
            }
        }
    }

    /// Check if current time is within working hours (6:00-19:00 Bangkok)
    private static func isWithinWorkingHours() -> Bool {
        var calendar = Calendar.current
        calendar.timeZone = AppConstants.bangkokTimeZone
        let hour = calendar.component(.hour, from: Date())
        return hour >= AppConstants.workingHourStart && hour < AppConstants.workingHourEnd
    }
}
```

### Complication Timeline Updates

When iPhone sends a complication update via `transferCurrentComplicationUserInfo`, the Watch receives it in `didReceiveUserInfo` and calls `WidgetCenter.shared.reloadAllTimelines()` to refresh all complication faces.

The timeline provider requests refresh at the next appropriate interval (15 min during working hours, 1 hour outside).

---

## 9. Always-On Display

watchOS 10+ supports Always-On Display via the `.isLuminanceReduced` environment variable. The view automatically switches to a dimmed version.

```swift
struct MainWindView: View {
    @Environment(\.isLuminanceReduced) var isLuminanceReduced

    var body: some View {
        // ...existing content...

        if isLuminanceReduced {
            // Always-On: simplified, dimmed version
            AlwaysOnWindView(windData: viewModel.currentData)
        } else {
            // Active: full interactive view
            // ...full view here...
        }
    }
}
```

```
  Always-On Display (dimmed):
  ┌─────────────────────────────────────┐
  │                                     │
  │                                     │
  │          12                         │  Large speed number
  │          kn                         │  (dimmed)
  │                                     │
  │          SE ↗                       │  Direction (dimmed)
  │                                     │
  │          ●                          │  Small safety dot
  │                                     │
  │                                     │
  └─────────────────────────────────────┘

  Danger Always-On (red tint persists):
  ┌─────────────────────────────────────┐
  │                                     │
  │                                     │
  │          28                         │  Speed (dimmed red tint)
  │          kn                         │
  │                                     │
  │          ⚠ W                       │  Warning + direction
  │                                     │
  │                                     │
  └─────────────────────────────────────┘
```

```swift
struct AlwaysOnWindView: View {
    let windData: WindData?

    var body: some View {
        VStack(spacing: 8) {
            Spacer()

            if let data = windData {
                // Speed (large, dimmed)
                Text("\(Int(data.windSpeedKnots.rounded()))")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(data.safety.dimmedColor)

                Text("kn")
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary.opacity(0.5))

                // Direction
                HStack(spacing: 4) {
                    if data.safety.isDangerous {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(SafetyLevel.danger.dimmedColor)
                    }
                    Text("\(data.cardinalDirection) \(data.directionArrow)")
                        .font(.system(size: 16))
                        .foregroundStyle(.secondary.opacity(0.5))
                }

                // Tiny safety dot
                Circle()
                    .fill(data.safety.dimmedColor)
                    .frame(width: 6, height: 6)
            } else {
                Text("--")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary.opacity(0.3))
            }

            Spacer()
        }
    }
}
```

---

## 10. Battery Optimization

### Strategy Summary

| Time Period | Refresh Interval | Data Source | Complications |
|---|---|---|---|
| Working hours (6-19 BKK) | 15 min | iPhone relay preferred | Updated each refresh |
| Off-hours (19-6 BKK) | 60 min | iPhone relay only | Minimal updates |
| iPhone unreachable | 15 min | Direct API (standalone) | Updated each refresh |
| No network at all | N/A | Cached data | Show stale indicator |

### Implementation Details

1. **Prefer iPhone Relay**: Watch avoids direct network calls when iPhone is reachable. iPhone fetches data every 30s and pushes to Watch via `updateApplicationContext`. This is significantly more power-efficient than Watch making its own HTTP requests.

2. **Time-Gated Refreshes**: Background refresh tasks check Bangkok time before scheduling. Off-hours refreshes are reduced from 15min to 60min.

3. **Batched Complication Updates**: Complication timelines are only reloaded when new data actually arrives. The `transferCurrentComplicationUserInfo` limit of 50/day is respected by only sending when data materially changes (speed delta > 2 knots or direction delta > 30 degrees).

4. **Minimal Standalone Networking**: When in standalone mode, the Watch makes a single combined API call rather than separate calls for current + forecast.

5. **App Group UserDefaults**: Data is shared between the main app and widget extension via a shared App Group, avoiding duplicate storage.

```swift
/// DataStore: shared persistence between app and widgets
final class DataStore {
    static let shared = DataStore()

    private let defaults: UserDefaults

    private init() {
        defaults = UserDefaults(suiteName: AppConstants.appGroupID) ?? .standard
    }

    func saveWindData(_ data: WindData) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        if let encoded = try? encoder.encode(data) {
            defaults.set(encoded, forKey: "latestWindData")
        }
    }

    func loadWindData() -> WindData? {
        guard let data = defaults.data(forKey: "latestWindData") else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(WindData.self, from: data)
    }

    func saveForecast(_ entries: [ForecastEntry]) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        if let encoded = try? encoder.encode(entries) {
            defaults.set(encoded, forKey: "forecast")
        }
    }

    func loadForecast() -> [ForecastEntry]? {
        guard let data = defaults.data(forKey: "forecast") else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode([ForecastEntry].self, from: data)
    }

    /// Check if data is stale (older than 30 minutes)
    var isDataStale: Bool {
        guard let data = loadWindData() else { return true }
        return Date().timeIntervalSince(data.timestamp) > 30 * 60
    }
}
```

---

## 11. Standalone Mode

When the iPhone is not reachable (Bluetooth out of range, iPhone off, etc.), the Watch falls back to direct API calls.

```swift
import Foundation

/// Direct API client for standalone Watch operation
actor WindAPIService {
    private let baseURL = URL(string: AppConstants.apiBaseURL)!
    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.waitsForConnectivity = false
        self.session = URLSession(configuration: config)
    }

    /// Fetch current wind data
    func fetchCurrentWind() async throws -> WindData {
        let url = baseURL.appendingPathComponent("wind/current")
        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw WindAPIError.serverError
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(WindData.self, from: data)
    }

    /// Fetch forecast for next N hours
    func fetchForecast() async throws -> [ForecastEntry] {
        let url = baseURL.appendingPathComponent("wind/forecast")
        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw WindAPIError.serverError
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let allEntries = try decoder.decode([ForecastEntry].self, from: data)

        // Filter to next 6 hours within working hours
        let now = Date()
        var calendar = Calendar.current
        calendar.timeZone = AppConstants.bangkokTimeZone

        return allEntries
            .filter { entry in
                entry.date > now &&
                calendar.component(.hour, from: entry.date) >= AppConstants.workingHourStart &&
                calendar.component(.hour, from: entry.date) < AppConstants.workingHourEnd
            }
            .prefix(AppConstants.forecastHoursCount)
            .map { $0 }
    }
}

enum WindAPIError: Error, LocalizedError {
    case serverError
    case noData

    var errorDescription: String? {
        switch self {
        case .serverError: return "Server unavailable"
        case .noData: return "No wind data"
        }
    }
}
```

### Standalone Mode Detection and Fallback

```swift
// In WindViewModel:
@MainActor
final class WindViewModel: ObservableObject {
    @Published var windSpeedKnots: Double = 0
    @Published var windGustKnots: Double?
    @Published var maxGustKnots: Double?
    @Published var windDir: Int = 0
    @Published var safety: SafetyLevel = .low
    @Published var lastUpdate: Date?
    @Published var isStandalone: Bool = false
    @Published var isStale: Bool = false

    var currentData: WindData? {
        DataStore.shared.loadWindData()
    }

    var safetyColor: Color {
        safety.color
    }

    private let connectivity = WatchConnectivityService.shared
    private let apiService = WindAPIService()
    private let dataStore = DataStore.shared

    init() {
        // Observe connectivity updates
        connectivity.$latestWindData
            .compactMap { $0 }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] data in
                self?.update(with: data)
                self?.isStandalone = false
            }
            .store(in: &cancellables)

        // Load cached data on init
        if let cached = dataStore.loadWindData() {
            update(with: cached)
            isStale = dataStore.isDataStale
        }

        // Check if iPhone is available
        connectivity.$isReachable
            .receive(on: DispatchQueue.main)
            .sink { [weak self] reachable in
                if !reachable {
                    self?.isStandalone = true
                    self?.fetchStandalone()
                }
            }
            .store(in: &cancellables)
    }

    private var cancellables = Set<AnyCancellable>()

    private func update(with data: WindData) {
        windSpeedKnots = data.windSpeedKnots
        windGustKnots = data.windGustKnots
        maxGustKnots = data.maxGustKnots
        windDir = data.windDir
        safety = data.safety
        lastUpdate = data.timestamp
        isStale = false
    }

    /// Fetch data directly from API when iPhone unavailable
    private func fetchStandalone() {
        Task {
            do {
                let data = try await apiService.fetchCurrentWind()
                dataStore.saveWindData(data)
                update(with: data)
            } catch {
                print("Standalone fetch failed: \(error)")
                isStale = true
            }
        }
    }
}
```

---

## 12. Data Flow Diagrams

### Normal Operation (iPhone Connected)

```
  ┌──────────────────────────────────────────────────────────────┐
  │                        iPhone App                            │
  │                                                              │
  │  Timer (30s) ──> fetch /api/wind/current ──> WindData        │
  │  Timer (5m)  ──> fetch /api/wind/forecast ──> [Forecast]     │
  │                                                              │
  │  On new data:                                                │
  │    ├── updateApplicationContext({windData, forecast})         │
  │    └── if complication active:                               │
  │        └── transferCurrentComplicationUserInfo({...})         │
  └──────────┬───────────────────────────────────┬───────────────┘
             │ WCSession (Bluetooth)             │
             ▼                                   ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                      Apple Watch                             │
  │                                                              │
  │  WatchConnectivityService                                    │
  │    ├── didReceiveApplicationContext ──> DataStore.save()      │
  │    ├── didReceiveUserInfo ──> DataStore.save()                │
  │    │                         └── WidgetCenter.reloadAll()    │
  │    └── didReceiveMessage (real-time) ──> ViewModel.update()  │
  │                                                              │
  │  DataStore (UserDefaults App Group)                          │
  │    ├── WindData ──> MainWindView                             │
  │    ├── Forecast ──> ForecastListView                         │
  │    └── WindData ──> Complications (via TimelineProvider)     │
  │                                                              │
  │  Safety Check:                                               │
  │    └── if .danger ──> SafetyAlertView + HapticManager        │
  └──────────────────────────────────────────────────────────────┘
```

### Standalone Operation (iPhone Unavailable)

```
  ┌──────────────────────────────────────────────────────────────┐
  │                      Apple Watch                             │
  │                                                              │
  │  WatchConnectivityService.isReachable == false               │
  │    └── triggers standalone mode                              │
  │                                                              │
  │  BackgroundTaskHandler (every 15 min)                        │
  │    └── WindAPIService                                        │
  │        ├── GET /api/wind/current ──> WindData                │
  │        └── GET /api/wind/forecast ──> [Forecast]             │
  │                    │                                         │
  │                    ▼                                         │
  │              DataStore.save()                                │
  │                    │                                         │
  │        ┌───────────┼───────────┐                             │
  │        ▼           ▼           ▼                             │
  │   MainView    ForecastView  Complications                    │
  │                                                              │
  │  WiFi/Cellular ──> JollyKite API Server                      │
  └──────────────────────────────────────────────────────────────┘
```

### Complication Update Flow

```
  New wind data arrives (via WCSession or standalone fetch)
         │
         ▼
  DataStore.saveWindData(data)
         │
         ▼
  WidgetCenter.shared.reloadAllTimelines()
         │
         ▼
  WindComplicationProvider.getTimeline()
         │
         ├── Read latest WindData from DataStore
         ├── Create WindTimelineEntry with safety relevance score
         ├── Set refresh policy: .after(15min or 1hr based on time)
         │
         ▼
  watchOS renders appropriate complication family:
    ├── .accessoryCircular  ──> CircularComplicationView
    ├── .accessoryRectangular ──> RectangularComplicationView
    ├── .accessoryCorner    ──> CornerGaugeComplicationView
    └── .accessoryInline    ──> InlineComplicationView
```

---

## Utility: WindCalculations (Shared)

```swift
import Foundation

enum WindCalculations {

    /// Convert degrees to cardinal direction string
    static func degreesToCardinal(_ degrees: Int) -> String {
        let normalized = ((degrees % 360) + 360) % 360
        let directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        let index = Int((Double(normalized) + 22.5) / 45.0) % 8
        return directions[index]
    }

    /// Convert degrees to Unicode arrow character
    static func degreesToArrow(_ degrees: Int) -> String {
        let normalized = ((degrees % 360) + 360) % 360
        // Arrows point in the direction wind is blowing TO
        let arrows = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"]
        let index = Int((Double(normalized) + 22.5) / 45.0) % 8
        return arrows[index]
    }

    /// Check if within working hours (Bangkok time)
    static func isWithinWorkingHours() -> Bool {
        var calendar = Calendar.current
        calendar.timeZone = AppConstants.bangkokTimeZone
        let hour = calendar.component(.hour, from: Date())
        return hour >= AppConstants.workingHourStart && hour < AppConstants.workingHourEnd
    }

    /// Convert knots to m/s
    static func knotsToMs(_ knots: Double) -> Double {
        knots * AppConstants.knotsToMs
    }

    /// Convert m/s to knots
    static func msToKnots(_ ms: Double) -> Double {
        ms * AppConstants.msToKnots
    }
}
```

---

## Summary of Key Design Decisions

1. **watchOS 10+ only**: Enables WidgetKit-based complications, vertical TabView paging, and modern SwiftUI APIs. No legacy ClockKit support needed.

2. **iPhone-first data flow**: Watch receives data passively via `updateApplicationContext` to minimize battery usage. Standalone API calls are the fallback, not the default.

3. **Safety-critical haptics**: Offshore wind detection triggers triple-buzz notification pattern. This works even in Always-On Display mode. The full-screen SafetyAlertView ensures the user cannot miss a danger condition change.

4. **Russian-language UI**: All user-facing strings are in Russian, matching the web app's primary audience. Safety labels match the backend's text values.

5. **Shared data via App Group**: Both the main Watch app and the widget extension read from the same `UserDefaults` suite, eliminating data duplication.

6. **Time-zone aware**: All working-hours logic explicitly uses `Asia/Bangkok` (UTC+7), matching the project's location-specific design.

7. **Gauge range 0-30 knots**: Matches the `extreme` threshold in `config.windSafety.speeds`, providing meaningful visual range for the corner gauge complication.
