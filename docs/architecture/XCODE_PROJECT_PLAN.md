# JollyKite Apple App - Xcode Project Plan

## Project Overview

Native Apple ecosystem app for kitesurfers at Pak Nam Pran, Thailand.
Real-time wind data, forecasts, safety indicators, and kite size recommendations.

**Platforms:** iOS 17+, watchOS 10+
**Language:** Swift 5.9+, SwiftUI
**Architecture:** MVVM with @Observable

---

## 1. Xcode Project Structure

```
JollyKite.xcodeproj
│
├── JollyKite/                          # iOS App Target
│   ├── JollyKiteApp.swift              # @main entry point
│   ├── ContentView.swift               # Root TabView (4 tabs)
│   │
│   ├── Config/
│   │   ├── AppConstants.swift          # API URLs, locations, thresholds
│   │   ├── WindSafetyConfig.swift      # Direction ranges, speed levels
│   │   └── KiteSizeConfig.swift        # Available sizes, calc factors
│   │
│   ├── ViewModels/
│   │   ├── DashboardViewModel.swift    # Current wind + safety + kite recs
│   │   ├── ForecastViewModel.swift     # 3-day forecast data
│   │   ├── MapViewModel.swift          # Map state, wind arrow
│   │   ├── TimelineViewModel.swift     # Today + week charts data
│   │   └── SettingsViewModel.swift     # User preferences
│   │
│   ├── Views/
│   │   ├── Dashboard/
│   │   │   ├── DashboardView.swift
│   │   │   ├── WindSpeedGaugeView.swift
│   │   │   ├── WindDirectionCompassView.swift
│   │   │   ├── SafetyBadgeView.swift
│   │   │   ├── WindDetailsCardView.swift
│   │   │   ├── KiteSizeSliderView.swift
│   │   │   └── KiteSizeChipView.swift
│   │   ├── Forecast/
│   │   │   ├── ForecastView.swift
│   │   │   ├── ForecastDayCardView.swift
│   │   │   └── ForecastChartView.swift     # Swift Charts
│   │   ├── Map/
│   │   │   ├── MapView.swift               # MapKit
│   │   │   ├── WindArrowAnnotation.swift
│   │   │   └── SpotAnnotationView.swift
│   │   ├── Timeline/
│   │   │   ├── TimelineTabView.swift
│   │   │   ├── TodayTimelineChartView.swift
│   │   │   └── WeekHistoryChartView.swift
│   │   ├── Settings/
│   │   │   ├── SettingsView.swift
│   │   │   ├── LanguagePickerView.swift
│   │   │   ├── UnitPickerView.swift
│   │   │   ├── RiderSettingsView.swift
│   │   │   └── ServerURLView.swift
│   │   └── Shared/
│   │       ├── WindColorScale.swift
│   │       ├── AnimatedNumberView.swift
│   │       ├── GradientBarView.swift
│   │       └── LoadingStateView.swift
│   │
│   ├── Services/
│   │   ├── WindSSEService.swift         # SSE real-time stream client
│   │   └── HapticService.swift          # UIFeedbackGenerator wrappers
│   │
│   ├── Localization/
│   │   └── Localizable.xcstrings        # String Catalog (en, ru, de, th)
│   │
│   ├── Resources/
│   │   ├── Assets.xcassets/
│   │   │   ├── AppIcon.appiconset/
│   │   │   ├── Colors/                  # Safety & background colors
│   │   │   └── WindIcons/
│   │   └── LaunchScreen.storyboard
│   │
│   ├── Extensions/
│   │   └── Color+Wind.swift             # Wind speed color scale
│   │
│   └── Info.plist
│
├── JollyKiteWatch/                      # watchOS App Target
│   ├── JollyKiteWatchApp.swift          # @main entry, TabView
│   │
│   ├── ViewModels/
│   │   ├── WindViewModel.swift          # Main screen state
│   │   └── ForecastViewModel.swift      # Forecast list state
│   │
│   ├── Views/
│   │   ├── MainWindView.swift           # Primary glance: compass + speed
│   │   ├── ForecastListView.swift       # 6-hour forecast list
│   │   ├── SafetyAlertView.swift        # Full-screen danger overlay
│   │   ├── AlwaysOnWindView.swift       # Dimmed Always-On Display
│   │   └── Components/
│   │       ├── CompassRoseView.swift
│   │       ├── WindGaugeView.swift
│   │       └── SafetyBadgeView.swift
│   │
│   ├── Services/
│   │   ├── WatchConnectivityService.swift  # WCSession iPhone<->Watch
│   │   ├── WindAPIService.swift             # Standalone API client
│   │   ├── DataStore.swift                  # App Group persistence
│   │   └── HapticManager.swift              # WKInterfaceDevice haptics
│   │
│   ├── Background/
│   │   └── BackgroundTaskHandler.swift  # WKApplicationRefreshBackgroundTask
│   │
│   ├── Resources/
│   │   └── Assets.xcassets/
│   │       ├── AppIcon.appiconset/
│   │       └── ComplicationColors/
│   │
│   └── Info.plist
│
├── JollyKiteWatchWidgets/               # watchOS Widget Extension
│   ├── JollyKiteWatchWidgets.swift      # @main WidgetBundle
│   ├── WindComplicationProvider.swift    # TimelineProvider
│   ├── ComplicationViews/
│   │   ├── CircularComplicationView.swift
│   │   ├── RectangularComplicationView.swift
│   │   ├── CornerGaugeComplicationView.swift
│   │   └── InlineComplicationView.swift
│   └── Info.plist
│
├── JollyKiteWidgets/                    # iOS WidgetKit Extension
│   ├── JollyKiteWidgets.swift           # @main WidgetBundle
│   ├── Providers/
│   │   └── WindTimelineProvider.swift
│   ├── Views/
│   │   ├── WindWidgetEntryView.swift    # Router by family
│   │   ├── WindSmallView.swift          # systemSmall (2x2)
│   │   ├── WindMediumView.swift         # systemMedium (4x2)
│   │   ├── WindLargeView.swift          # systemLarge (4x4) + StandBy
│   │   ├── WindCircularView.swift       # accessoryCircular
│   │   ├── WindRectangularView.swift    # accessoryRectangular
│   │   ├── WindInlineView.swift         # accessoryInline
│   │   └── Components/
│   │       ├── ForecastBarView.swift
│   │       ├── SafetyBadgeView.swift
│   │       └── DirectionArrowView.swift
│   ├── Intents/
│   │   ├── JollyKiteWidgetConfigurationIntent.swift
│   │   ├── ToggleWindUnitIntent.swift
│   │   ├── WindUnit.swift               # AppEnum
│   │   └── DisplayMode.swift            # AppEnum
│   ├── Models/
│   │   ├── WindEntry.swift              # TimelineEntry
│   │   ├── ForecastPoint.swift
│   │   └── SafetyLevel.swift
│   ├── Services/
│   │   ├── WindAPIService.swift
│   │   └── WindCacheManager.swift       # App Group cache
│   ├── Utilities/
│   │   ├── WindUtils.swift
│   │   ├── KiteSizeCalculator.swift
│   │   └── ColorExtensions.swift
│   ├── Resources/
│   │   └── Localizable.xcstrings
│   └── Info.plist
│
├── JollyKiteShared/                     # Local Swift Package
│   ├── Package.swift
│   ├── Sources/JollyKiteShared/
│   │   ├── Models/
│   │   │   ├── WindData.swift
│   │   │   ├── WindForecast.swift
│   │   │   ├── WindTrend.swift
│   │   │   ├── WindStatistics.swift
│   │   │   ├── WaveData.swift
│   │   │   ├── SafetyLevel.swift
│   │   │   ├── WindDirection.swift
│   │   │   ├── WindUnit.swift
│   │   │   ├── WindHistory.swift
│   │   │   └── KiteSize.swift
│   │   ├── Networking/
│   │   │   ├── APIClient.swift          # Protocol + implementation
│   │   │   ├── SSEClient.swift          # Actor for SSE streams
│   │   │   ├── OpenMeteoClient.swift    # Direct forecast fallback
│   │   │   ├── AmbientWeatherClient.swift
│   │   │   └── APIError.swift
│   │   ├── Services/
│   │   │   ├── WindSafetyService.swift
│   │   │   ├── KiteSizeService.swift
│   │   │   ├── WorkingHoursService.swift
│   │   │   └── WindDataService.swift    # Orchestrator
│   │   ├── Utils/
│   │   │   ├── UnitConverter.swift
│   │   │   ├── SharedDataStore.swift    # App Group UserDefaults
│   │   │   ├── WindDataCache.swift      # File-based JSON cache
│   │   │   ├── PreferencesStore.swift
│   │   │   └── WatchConnectivityManager.swift
│   │   └── Extensions/
│   │       ├── Color+Hex.swift
│   │       ├── Date+Bangkok.swift
│   │       └── Double+Formatting.swift
│   └── Tests/JollyKiteSharedTests/
│       └── JollyKiteSharedTests.swift   # 17 tests
│
└── JollyKiteNotificationService/        # Notification Service Extension
    ├── NotificationService.swift
    └── Info.plist
```

---

## 2. Targets Summary

| Target | Platform | Type | Dependencies |
|--------|----------|------|-------------|
| JollyKite | iOS 17+ | App | JollyKiteShared, MapKit, Charts, WidgetKit |
| JollyKiteWatch | watchOS 10+ | App | JollyKiteShared, WatchConnectivity |
| JollyKiteWatchWidgets | watchOS 10+ | Widget Extension | JollyKiteShared |
| JollyKiteWidgets | iOS 17+ | Widget Extension | JollyKiteShared, WidgetKit |
| JollyKiteNotificationService | iOS 17+ | App Extension | JollyKiteShared |
| JollyKiteShared | iOS 17+ / watchOS 10+ | Swift Package | Foundation, SwiftUI |

---

## 3. Capabilities & Entitlements

### JollyKite (iOS)
- **App Groups**: `group.com.jollykite.shared`
- **Push Notifications**: APNs for wind alerts
- **Background Modes**: Background fetch, Remote notifications
- **Associated Domains**: (future: universal links)

### JollyKiteWatch (watchOS)
- **App Groups**: `group.com.jollykite.shared`
- **Background Modes**: Background app refresh
- **Push Notifications**: Forwarded from iPhone

### JollyKiteWidgets (iOS Widget)
- **App Groups**: `group.com.jollykite.shared`

### JollyKiteWatchWidgets (watchOS Widget)
- **App Groups**: `group.com.jollykite.shared`

---

## 4. Apple Frameworks Used (No 3rd-Party Dependencies)

| Framework | Usage |
|-----------|-------|
| SwiftUI | All UI across all targets |
| Charts | Wind speed charts, forecast graphs, timeline |
| MapKit | Interactive map with wind direction arrow |
| WidgetKit | iOS widgets (6 families) + watchOS complications (4 families) |
| WatchConnectivity | iPhone <-> Watch data sync |
| UserNotifications | Push notifications for wind alerts |
| BackgroundTasks | BGTaskScheduler for periodic refresh |
| WatchKit | Haptic feedback on Watch |
| Observation | @Observable MVVM pattern (iOS 17+) |
| SwiftData | (optional) Local history persistence |

**Zero 3rd-party SPM dependencies** - entirely native Apple frameworks.

---

## 5. Signing & Provisioning

### Required Apple Developer Certificates
- iOS Development / Distribution certificate
- watchOS Development / Distribution certificate (included in iOS cert)

### Provisioning Profiles (4 App IDs needed)
| App ID | Target |
|--------|--------|
| `com.jollykite.app` | iOS app |
| `com.jollykite.app.watchkitapp` | watchOS app |
| `com.jollykite.app.widgets` | iOS widgets |
| `com.jollykite.app.watchwidgets` | watchOS complications |

### App Group
- ID: `group.com.jollykite.shared`
- Must be registered in Apple Developer Portal
- Added to all 4 targets

---

## 6. URL Scheme & Deep Linking

```
jollykite://dashboard     -> Dashboard tab
jollykite://forecast      -> Forecast tab
jollykite://map           -> Map tab
jollykite://settings      -> Settings tab
jollykite://timeline/today -> Today timeline
jollykite://timeline/week  -> Week history
```

Widget taps use `widgetURL()` / `Link()` to deep-link into specific app screens.

---

## 7. Data Flow Architecture

```
                    Backend Server (Express.js)
                    /api/wind/* endpoints
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         iOS App      Widgets    Watch App
        (primary)    (timeline)  (companion)
              │            │            │
              │     App Group     │
              └──── SharedData ───┘
                (UserDefaults +
                 file cache)

         iOS App ──── WCSession ──── Watch App
                  (applicationContext,
                   complicationUserInfo,
                   sendMessage)

   Fallback: Open-Meteo API (forecast)
             Ambient Weather API (current)
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Create Xcode project with all 5 targets
2. Configure signing, App Groups, capabilities
3. Integrate JollyKiteShared package (already built, 17 tests passing)
4. Implement APIClient connection to backend
5. Create basic iOS Dashboard with current wind data
6. Test data flow: API -> ViewModel -> View

### Phase 2: iOS App Core (Week 3-4)
7. Dashboard complete: speed gauge, compass, safety badge, details card
8. Kite size slider with recommendations
9. Forecast view with Swift Charts (3-day hourly)
10. Map view with MapKit wind arrow annotation
11. Today Timeline + Week History charts
12. Settings screen (language, units, rider, server URL)
13. SSE real-time connection
14. Animations: arrow rotation, number transitions, safety badge
15. Haptic feedback on safety changes

### Phase 3: Widgets (Week 5)
16. iOS Widget: systemSmall (wind speed + direction)
17. iOS Widget: systemMedium (speed + mini forecast)
18. iOS Widget: systemLarge (dashboard + forecast + kite)
19. Lock Screen widgets (circular, rectangular, inline)
20. Interactive widget: tap to toggle knots/m/s
21. StandBy mode support
22. Timeline provider with smart refresh (15min / 1hr)

### Phase 4: Apple Watch (Week 6-7)
23. Watch main screen: compass + speed + safety
24. Watch forecast list (6 hours, Digital Crown scrolling)
25. Safety Alert full-screen overlay for offshore
26. Always-On Display (dimmed view)
27. WatchConnectivity: iPhone pushes data to Watch
28. Watch standalone mode (direct API fallback)
29. Background refresh handler (time-gated)
30. Watch complications: circular, rectangular, gauge, inline
31. Haptic feedback: triple-buzz danger, success for good

### Phase 5: Polish & Launch (Week 8)
32. Push notifications (wind stable >= 10kn for 20min)
33. Localization: complete String Catalogs (en, ru, de, th)
34. Dark/Light theme refinement
35. Accessibility: VoiceOver labels on all views
36. App icons (all sizes for iOS + watchOS)
37. App Store screenshots & metadata
38. TestFlight beta distribution
39. App Store submission

---

## 9. File Creation Order

For efficient implementation, create files in this dependency order:

```
1. JollyKiteShared/                    ✅ DONE (already built)
   └── All models, networking, services

2. JollyKite/ (iOS App)
   a. JollyKiteApp.swift + ContentView.swift
   b. Config/AppConstants.swift
   c. Services/WindSSEService.swift
   d. Services/HapticService.swift
   e. Extensions/Color+Wind.swift
   f. ViewModels/ (all 5)
   g. Views/Shared/ (reusable components)
   h. Views/Dashboard/ (main screen)
   i. Views/Forecast/
   j. Views/Map/
   k. Views/Timeline/
   l. Views/Settings/
   m. Localization/Localizable.xcstrings
   n. Resources/Assets.xcassets

3. JollyKiteWidgets/ (iOS Widgets)
   a. Models/ (WindEntry, ForecastPoint, SafetyLevel)
   b. Intents/ (configuration + toggle)
   c. Services/ (WindAPIService, WindCacheManager)
   d. Utilities/ (WindUtils, KiteSizeCalculator)
   e. Views/Components/ (reusable bar, badge, arrow)
   f. Views/ (Small, Medium, Large, Circular, Rectangular, Inline)
   g. Providers/WindTimelineProvider.swift
   h. JollyKiteWidgets.swift (bundle entry)

4. JollyKiteWatch/ (Watch App)
   a. Services/ (WatchConnectivity, DataStore, HapticManager, WindAPI)
   b. Background/BackgroundTaskHandler.swift
   c. Views/Components/ (compass, gauge, badge)
   d. ViewModels/ (WindViewModel, ForecastViewModel)
   e. Views/ (MainWind, ForecastList, SafetyAlert, AlwaysOn)
   f. JollyKiteWatchApp.swift

5. JollyKiteWatchWidgets/ (Watch Complications)
   a. WindComplicationProvider.swift
   b. ComplicationViews/ (Circular, Rectangular, Corner, Inline)
   c. JollyKiteWatchWidgets.swift (bundle entry)

6. JollyKiteNotificationService/
   a. NotificationService.swift
```

---

## 10. App Store Metadata

### App Name
**JollyKite - Pak Nam Pran Wind**

### Category
Weather / Sports

### Subtitle
Real-time wind data for kitesurfers

### Keywords
kitesurfing, wind, Pak Nam Pran, Thailand, kitesurf, forecast, weather, offshore, safety

### Age Rating
4+ (no objectionable content)

### Privacy
- No user data collected
- No analytics or tracking
- Wind data from public APIs only

### Supported Languages
English, Russian, German, Thai

### Screenshots Needed
- iPhone: 6.7" (iPhone 15 Pro Max), 6.1" (iPhone 15 Pro)
- Apple Watch: 49mm (Ultra), 45mm (Series 9)
- iPad: 12.9" (optional, if universal)

---

## 11. Key Architecture Documents

| Document | Location |
|----------|----------|
| iPhone App Architecture | `docs/architecture/IPHONE_APP_ARCHITECTURE.md` |
| Apple Watch Design | `docs/WATCH_APP_DESIGN.md` |
| Widget Design | Widget-architect report (in conversation) |
| Shared Data Layer | `apple/JollyKiteShared/` (Swift Package, built) |
| This Project Plan | `docs/architecture/XCODE_PROJECT_PLAN.md` |

---

## 12. Quick Start

```bash
# 1. Open Xcode project
open JollyKite.xcodeproj

# 2. Select signing team for all targets
# 3. Register App Group: group.com.jollykite.shared
# 4. Add JollyKiteShared as local Swift Package dependency

# 5. Build & run on simulator
# iOS: iPhone 15 Pro simulator
# watchOS: Apple Watch Series 9 (45mm) simulator paired with iPhone

# 6. For real device testing:
# - Enable Developer Mode on iPhone and Apple Watch
# - Pair Apple Watch with iPhone in Xcode
# - Run JollyKite scheme (auto-installs watch app)
```
