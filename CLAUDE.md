# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**JollyKite** — full-stack kitesurfing weather platform for Pak Nam Pran, Thailand. Real-time wind data, forecasts, safety indicators, and push notifications across PWA and native iOS app.

**Location:** Pak Nam Pran, Thailand (12.346596°N, 99.998179°E)
**Language:** UI in Russian (Cyrillic). Primary audience — Russian-speaking kitesurfers.
**Working hours:** 6:00–19:00 Bangkok time (data collection active only during this window).

**Platform components:**

| Component | Tech | Directory |
|-----------|------|-----------|
| Backend API | Node.js 20, Express, PostgreSQL (pg), SSE | `backend/` |
| PWA Frontend | Vanilla JS ES6, Leaflet.js, Tailwind CSS | `frontend/` |
| iOS App | SwiftUI, iOS 17+, @Observable | `apple/JollyKite/` |
| iOS Widgets | WidgetKit, AppIntents | `apple/JollyKiteWidgets/` |
| Shared iOS Library | Swift Package | `apple/JollyKiteShared/` |
| Deployment | Docker, k3s, ArgoCD, nginx | `k8s/`, `Dockerfile*`, `docker-compose*` |

**Production URL:** `https://pnp.miko.ru`
**API base:** `https://pnp.miko.ru/api`

---

## Project Structure

```
JollyKite/
├── backend/                    # Node.js REST API + SSE
│   ├── server.js               # Entry point (port 3000)
│   ├── src/
│   │   ├── ApiRouter.js        # All API endpoints
│   │   ├── PostgresPool.js     # Shared PG connection pool (singleton)
│   │   ├── DatabaseManager.js  # Real-time wind DB (PostgreSQL)
│   │   ├── ArchiveManager.js   # Historical hourly aggregated data (PostgreSQL)
│   │   ├── WindDataCollector.js # Ambient Weather fetcher (4 stations)
│   │   ├── ForecastCollector.js # Open-Meteo fetcher (single model)
│   │   ├── ForecastModelManager.js # Multi-model orchestration, snapshots & accuracy (PostgreSQL)
│   │   ├── NotificationManager.js # Web Push + APNs coordinator
│   │   ├── APNsProvider.js     # Apple Push (HTTP/2, JWT)
│   │   └── CalibrationManager.js # Wind direction offset
│   ├── package.json
│   └── data/                   # JSON state files only (gitignored)
├── frontend/                   # PWA
│   ├── index.html              # Main entry
│   ├── sw.js                   # Service Worker
│   ├── manifest.json           # PWA manifest
│   ├── version.json            # Single source of truth for version
│   ├── js/
│   │   ├── App.js              # Main coordinator
│   │   ├── WindDataManager.js, MapController.js, ForecastManager.js ...
│   │   ├── settings/           # SettingsManager, LocalStorageManager, MenuController
│   │   ├── utils/              # UnitConverter, WindUtils, KiteSizeCalculator
│   │   └── i18n/               # Internationalization
│   ├── css/main.css
│   └── icons/
├── apple/                      # iOS (XcodeGen)
│   ├── project.yml             # XcodeGen spec → generates .xcodeproj
│   ├── JollyKite/              # iOS app target
│   │   ├── JollyKiteApp.swift  # @main entry + AppDelegate (APNs)
│   │   ├── ContentView.swift   # TabView (5 tabs)
│   │   ├── Config/AppConstants.swift
│   │   ├── Services/           # WindSSEService, PushNotificationService, HapticService
│   │   ├── ViewModels/         # 5 @Observable view models
│   │   └── Views/              # Dashboard/, Forecast/, Timeline/, Map/, Settings/, Shared/
│   ├── JollyKiteWidgets/       # WidgetKit extension
│   │   ├── JollyKiteWidgets.swift  # Widget bundle (3 widgets)
│   │   ├── Providers/, Views/, Intents/, Models/, Services/
│   │   └── Info.plist
│   └── JollyKiteShared/        # Swift Package (shared models & services)
│       ├── Package.swift
│       ├── Sources/JollyKiteShared/
│       │   ├── Models/         # WindData, SafetyLevel, WindForecast, KiteSize, WindUnit ...
│       │   ├── Networking/     # APIClient, SSEClient, AmbientWeatherClient, OpenMeteoClient
│       │   ├── Services/       # WindSafetyService, KiteSizeService, WorkingHoursService
│       │   ├── Utils/          # PreferencesStore, SharedDataStore, UnitConverter, WindDataCache
│       │   └── Extensions/     # Color+Hex, Date+Bangkok, Double+Formatting
│       └── Tests/
├── k8s/                        # Kubernetes deployment
│   ├── argocd/
│   │   ├── backend.yaml        # Backend Deployment + Service (APNs secrets)
│   │   ├── nginx.yaml          # Nginx Deployment + Service
│   │   └── kustomization.yaml
│   └── jollykite.yaml.template # Full manifest template
├── config/nginx.conf           # Nginx reverse proxy config
├── Dockerfile                  # Backend (node:20-alpine)
├── Dockerfile.nginx            # Frontend (nginx:alpine)
├── docker-compose.yml          # Local dev
├── docker-compose.prod.yml     # Production
└── .github/                    # GitHub Actions CI/CD
```

---

## Development Commands

### Backend

```bash
cd backend
npm install
npm start           # node server.js (port 3000)
npm run dev          # node --watch server.js (auto-reload)
```

Backend serves both REST API and static frontend files from `../frontend`.

### PWA Frontend

No build step. Open `http://localhost:3000` when backend is running, or:

```bash
cd frontend
python3 -m http.server 8000   # Static server (no API)
```

HTTPS or localhost required for Service Worker.

### iOS App

```bash
cd apple
xcodegen generate              # Generate .xcodeproj from project.yml
open JollyKite.xcodeproj       # Open in Xcode
```

Build: `Cmd+B` in Xcode, or:
```bash
xcodebuild build -scheme JollyKite -destination 'platform=iOS Simulator,name=iPhone 16 Pro'
```

XcodeGen must be installed: `brew install xcodegen`

After adding/removing Swift files, re-run `xcodegen generate`.

### Docker

```bash
docker compose up              # Local dev (postgres + backend + nginx)
docker compose -f docker-compose.prod.yml up   # Production
```

### Kubernetes (k3s + ArgoCD)

Push to `main` → GitHub Actions builds images → ArgoCD syncs from `k8s/argocd/`.

---

## Version Management

**Before EVERY commit, update version in TWO files:**
1. `frontend/version.json` — single source of truth
2. `frontend/sw.js` line 3 — `APP_VERSION` constant (must match)

```json
// frontend/version.json
{ "version": "2.7.0" }
```
```javascript
// frontend/sw.js (line 3)
const APP_VERSION = '2.7.0';
```

Version auto-propagates to: backend `/api/version`, frontend UI, Service Worker cache name (`jollykite-v{VERSION}`).

---

## Architecture

### Backend (Node.js)

**Database:** External PostgreSQL via `pg` (node-postgres). Connection pool in `PostgresPool.js`, config from env vars (`PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD` or `DATABASE_URL`).

**Entry:** `backend/server.js` initializes PG pool + 6 managers and sets up cron jobs.

**Cron schedule (Bangkok time):**
- Every 5 min (6:00–19:00): Wind data collection from Ambient Weather (4 stations)
- Every hour at :00: Archive hourly aggregates
- Every 3 hours (5:00–20:00): Forecast snapshots from 5 weather models
- Daily at 20:00: Forecast accuracy evaluation against actual data
- Daily at 00:05: Cleanup data older than 7 days
- Weekly (Sunday 01:00): Cleanup old forecast snapshots (>14 days)

**Managers:**

| Manager | Responsibility |
|---------|---------------|
| `DatabaseManager` | PostgreSQL, 1-minute wind data granularity |
| `ArchiveManager` | Historical hourly aggregated data |
| `WindDataCollector` | Ambient Weather API → knots conversion, multi-station averaging |
| `ForecastCollector` | Open-Meteo API → 3-day hourly forecast with correction factors |
| `ForecastModelManager` | Multi-model orchestration: 5 models (GFS Seamless, ECMWF, Météo-France, GFS, GEM), snapshots every 3h, daily accuracy evaluation, auto best-model selection |
| `NotificationManager` | Web Push (VAPID) + APNs, daily rate limit, 15-min wind stability check |
| `CalibrationManager` | Wind direction offset (persistent JSON) |

**APNs Provider** (`backend/src/APNsProvider.js`):
- HTTP/2 + JWT auth using Node.js built-in `http2` and `crypto` (zero npm deps)
- Reads `.p8` key from `APNS_KEY_FILE` env var
- JWT cached for 50 minutes
- Gracefully disabled if no key configured

### PWA Frontend

**Coordinator pattern:** `App.js` orchestrates all managers.

```
App.js
├── WindDataManager.js     # API fetching (30s interval)
├── MapController.js       # Leaflet map + markers
├── ForecastManager.js     # 3-day forecast display
├── WindArrowController.js # Wind direction arrow
├── HistoryManager.js      # LocalStorage persistence
├── WindStatistics.js      # Trend calculations
├── TodayWindTimeline.js   # Today's hourly chart
├── WeekWindHistory.js     # Weekly history charts
└── NotificationManager.js # Web Push subscription
```

**Config:** All constants in `frontend/js/config.js`. Do NOT hardcode values elsewhere.

**Service Worker caching:**
- Core assets: Cache-first
- API requests: Network-first with 24h fallback
- Map tiles: Network only

### iOS App (SwiftUI)

**Target:** iOS 17.0+, uses `@Observable` pattern.

**App structure:**
- `JollyKiteApp.swift` — entry point with `UIApplicationDelegateAdaptor` for APNs token handling
- `ContentView.swift` — `TabView` with 5 tabs (Dashboard, Forecast, Timeline, Map, Settings)
- 5 `@Observable` ViewModels (Dashboard, Forecast, Map, Timeline, Settings)
- `PushNotificationService` — APNs registration, permission flow, server token sync
- `WindSSEService` — wraps `SSEClient` actor for real-time streaming
- `HapticService` — UIKit haptic feedback

**JollyKiteShared (Swift Package):**
Shared between app and widgets. Contains all models, networking, services, and utilities.
Key types: `WindData`, `SafetyLevel`, `WindForecast`, `WindUnit`, `KiteSizeRecommendation`, `PreferencesStore`, `SharedDataStore`, `JollyKiteAPIClient`, `SSEClient`.

**Widgets (WidgetKit):**
3 widget families: home screen (small/medium/large), lock screen (circular/rectangular/inline).
`WindTimelineProvider` with smart refresh (15min during working hours, 1hr off-hours).
App Group `group.com.jollykite.shared` for data sharing.

**Bundle IDs:** `com.jollykite.app`, `com.jollykite.app.widgets`

---

## API Endpoints

All endpoints prefixed with `/api`.

### Wind Data
| Method | Path | Description |
|--------|------|-------------|
| GET | `/wind/current` | Latest wind measurement |
| GET | `/wind/stream` | SSE real-time stream |
| GET | `/wind/history/:hours?` | Last N hours (default 24) |
| GET | `/wind/history/week?days=7` | Weekly grouped by day |
| GET | `/wind/today/gradient?start=6&end=20&interval=5` | Today's aggregated data |
| GET | `/wind/statistics/:hours?` | Min/max/avg/trend stats |
| GET | `/wind/trend` | Trend direction |
| GET | `/wind/forecast` | 3-day forecast (best model, supports `?model=` query) |
| GET | `/wind/forecast/models` | List all 5 models with accuracy metrics |
| GET | `/wind/forecast/compare` | All models side-by-side comparison |
| POST | `/wind/forecast/snapshot` | Force save snapshots from all models |
| POST | `/wind/forecast/evaluate` | Force accuracy evaluation |
| GET | `/wind/today/full` | History + forecast combined |
| POST | `/wind/collect` | Force immediate collection |

### Calibration
| Method | Path | Description |
|--------|------|-------------|
| GET | `/calibration` | Current direction offset |
| POST | `/calibration` | Set offset (body: `{ offset: number }`, ±180°) |

### Archive
| Method | Path | Description |
|--------|------|-------------|
| GET | `/archive/days/:days?` | Archived data (default 30) |
| GET | `/archive/day/:date` | Specific day (YYYY-MM-DD) |
| GET | `/archive/statistics/:days?` | Archive statistics |
| GET | `/archive/patterns/:days?` | Wind patterns by hour |
| POST | `/archive/hourly` | Force archiving |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| POST | `/notifications/subscribe` | Web Push subscription |
| POST | `/notifications/unsubscribe` | Web Push unsubscribe |
| GET | `/notifications/stats` | Notification statistics |
| POST | `/notifications/test` | Send test notification |
| GET | `/notifications/check-conditions` | Debug wind stability |
| POST | `/notifications/apns/register` | Register iOS device token |
| POST | `/notifications/apns/unregister` | Unregister iOS device |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/version` | App version + SW version |
| GET | `/debug/db-stats` | Database statistics |

---

## Wind Safety Logic

**Critical for kitesurfing safety (Pak Nam Pran beach orientation):**

| Direction | Range | Level | Meaning |
|-----------|-------|-------|---------|
| Offshore | 225°–315° | DANGEROUS (red) | Wind blows from land to sea. Risk of being blown offshore. |
| Onshore | 45°–135° | SAFE (green) | Wind blows from sea to land. Safe return to shore. |
| Sideshore | other | MODERATE (yellow/orange) | Wind parallel to beach. |

**Notification trigger:** Wind stable above 8 knots for 15 minutes (3 consecutive measurements at 5-min intervals), direction stable (variance ≤45°), gusts not critical (max−avg ≤8kn), trend not decreasing sharply. Max 1 notification per day per subscription.

Safety calculations: `frontend/js/utils/WindUtils.js`, `apple/JollyKiteShared/Sources/.../WindSafetyService.swift`.

---

## External APIs

### Ambient Weather Network (4 stations)
- **Endpoint:** `https://lightning.ambientweather.net/devices?public.slug=<slug>`
- Public slugs, no auth required
- 4 stations around Pak Nam Pran, data averaged per collection cycle
- Returns device array with `lastData` object
- **Speeds in MPH** → must convert to knots
- Per-station data stored with `station_id` column in DB

### Open-Meteo Forecast (5 models)
- Free tier, no auth
- Parameters: `latitude`, `longitude`, `hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability`
- **Speeds in km/h** → must convert to knots

| Model | Endpoint | Notes |
|-------|----------|-------|
| GFS Seamless (best_match) | `/v1/forecast` | Auto-selects best model for location |
| ECMWF IFS | `/v1/ecmwf` | European model, good global coverage |
| Météo-France | `/v1/meteofrance` | ARPEGE global, no precipitation_probability |
| GFS | `/v1/gfs` | NOAA model |
| GEM | `/v1/gem` | Canadian model, all variables available |

Snapshots stored in PostgreSQL (`forecast_snapshots` table). Accuracy evaluated daily against archive data over 14-day rolling window. Best model auto-selected when ≥10 evaluation points.

---

## Deployment

### Production Stack (k3s)

```
Internet → Nginx (NodePort) → Backend (ClusterIP:3000)
                                ├── /api/* → Express API
                                └── /* → static frontend
```

**Namespace:** `jollykite`
**Images:** `ghcr.io/jorikfon/jollykite/backend:latest`, `ghcr.io/jorikfon/jollykite/nginx:latest`
**Persistent storage:** 1Gi PVC at `/app/data` (JSON state files: subscriptions, calibration, device tokens)
**Database:** External PostgreSQL, credentials in `pg-credentials` k8s secret

**Secrets in k3s:**
```bash
# PostgreSQL credentials
kubectl -n jollykite create secret generic pg-credentials \
  --from-literal=PG_HOST=<host> \
  --from-literal=PG_PORT=5432 \
  --from-literal=PG_DATABASE=jollykite \
  --from-literal=PG_USER=jollykite \
  --from-literal=PG_PASSWORD=<password>

# APNs credentials
kubectl -n jollykite create secret generic apns-credentials \
  --from-file=apns-key=AuthKey_XXXXXXXX.p8 \
  --from-literal=APNS_KEY_ID=XXXXXXXX \
  --from-literal=APNS_TEAM_ID=XXXXXXXXXX \
  --from-literal=APNS_BUNDLE_ID=com.jollykite.app
```

**Deploy flow:** push to `main` → GitHub Actions builds Docker images → ArgoCD syncs `k8s/argocd/`.

### Nginx Config (`config/nginx.conf`)

- `/` → frontend static files (no-cache)
- `/api/wind/stream` → SSE proxy (buffering off, 24h timeout)
- `/api/*` → backend proxy
- Images/fonts: 1-year cache
- JS/CSS: no-cache (version-controlled via SW)

---

## Key Conventions

### Code Style

**JavaScript (PWA + Backend):**
- ES6 modules with explicit imports/exports
- Class-based architecture
- Async/await (not raw promises)
- Config-driven — no hardcoded values

**Swift (iOS):**
- SwiftUI with `@Observable` (not `ObservableObject`)
- `@EnvironmentObject` for `PreferencesStore`
- `@Environment` for `PushNotificationService`
- Shared models in `JollyKiteShared` package

### Naming

| Context | Convention | Example |
|---------|-----------|---------|
| JS classes | PascalCase | `WindDataManager` |
| JS methods | camelCase | `fetchCurrentWindData` |
| JS files | PascalCase (classes), kebab-case (other) | `WindUtils.js` |
| Swift types | PascalCase | `DashboardViewModel` |
| Swift files | PascalCase | `WindSpeedGaugeView.swift` |
| API endpoints | kebab-case | `/api/wind/current` |

### Error Handling
- All API calls in try/catch
- Errors logged to console
- UI shows Russian error messages
- PWA: offline fallback to cached data (up to 24h)
- iOS: `LoadingStateView` for loading/error states

---

## Common Tasks

### Adding a new backend endpoint
1. Add route in `backend/src/ApiRouter.js`
2. Implement logic in the appropriate manager
3. Test: `curl http://localhost:3000/api/your-endpoint`

### Adding a new iOS view
1. Create `.swift` file in appropriate `Views/` subdirectory
2. Re-run `xcodegen generate` in `apple/`
3. Wire to ViewModel and navigation in `ContentView.swift`

### Modifying wind safety thresholds
- PWA: `frontend/js/config.js` → `windSafety` section
- iOS: `apple/JollyKiteShared/Sources/.../WindSafetyService.swift`
- Backend notifications: `backend/src/NotificationManager.js` → `checkWindStability()`

### Updating Service Worker
1. Bump version in `frontend/version.json` and `frontend/sw.js` (`APP_VERSION`)
2. Update `CORE_ASSETS` if adding new files
3. Test: DevTools → Application → Service Workers → Unregister → Hard refresh

### Updating iOS app after file changes
```bash
cd apple && xcodegen generate
```

---

## Debugging

### Backend
- Health check: `GET /health`
- DB stats: `GET /api/debug/db-stats`
- Notification debug: `GET /api/notifications/check-conditions`
- Logs use markers: `✓` success, `⚠` warning, `✗`/`❌` error

### PWA
- DevTools → Application: Manifest, Service Workers, Cache Storage, LocalStorage
- Console markers: `✓` init success, `⚠` warning, `❌` error
- Service Worker issues: increment `APP_VERSION`, unregister old SW, hard refresh

### iOS
- Xcode Console for SSE connection logs
- Push notifications: check `PushNotificationService` authorization state in Settings
- Widget: check `SharedDataStore` data via App Group container

---

## Important Notes

- **No automated tests for PWA/backend.** Manual browser testing. iOS shared package has unit tests (`swift test` in `apple/JollyKiteShared/`).
- **Location-specific.** Hardcoded for Pak Nam Pran — wind safety directions are beach-orientation dependent.
- **No build process for PWA.** Pure vanilla JS, no bundler.
- **Mobile-first.** Designed for use on the beach.
- **APNs is optional.** Backend works without `.p8` key — `APNsProvider` gracefully disables itself.

---

## Resources

- **Wind Safety:** `docs/WIND_DIRECTION.md`
- **Deployment:** `DEPLOY.md`
- **Contact:** Telegram @gypsy_mermaid
