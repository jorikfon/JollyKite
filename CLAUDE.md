# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**JollyKite** is a Progressive Web Application (PWA) for kitesurfers in Pak Nam Pran, Thailand. It provides real-time wind data, forecasts, and safety indicators for kitesurfing conditions.

**Tech Stack:**
- Vanilla JavaScript ES6 modules (class-based architecture)
- Leaflet.js for interactive maps
- Tailwind CSS (CDN-based)
- Service Worker for offline capabilities
- Ambient Weather Network API (real-time data)
- Open-Meteo API (forecasts)

**Location:** Pak Nam Pran, Thailand (12.346596°N, 99.998179°E)

---

## Development Commands

### IMPORTANT: Version Management

**Before EVERY commit, update version in TWO files:**
1. `frontend/version.json` — single source of truth for the entire app
2. `frontend/sw.js` line 3 — `APP_VERSION` constant (must match version.json)

**Version format:** `X.Y.Z` (e.g., `2.6.0` → `2.6.1`)
- Patch (Z): bugfixes and minor changes
- Minor (Y): new features

**All other components read version automatically:**
- Backend `/api/version` endpoint reads `version.json` on startup
- Frontend UI fetches `/version.json` for display
- VersionManager triggers cache invalidation via `/api/version`
- `SettingsManager.js` has a fallback version (update if needed)

**Example:**
```json
// frontend/version.json
{ "version": "2.6.1" }
```
```javascript
// frontend/sw.js (line 3)
const APP_VERSION = '2.6.1';
```

### Local Development Server

```bash
# Node.js server (recommended for PWA testing)
npm start

# Alternative: Python HTTP server
python3 -m http.server 8000

# Alternative: PHP server
php -S localhost:8000
```

Server runs at: `http://localhost:8000`

**Note:** HTTPS or localhost is required for Service Worker and PWA features to work.

### Testing

There are no automated tests in this project. Testing is done manually in browsers:
- Chrome/Edge: Full PWA support
- Safari (iOS): Add to Home Screen support
- Firefox: Basic PWA support

**PWA Testing Checklist:**
1. Open DevTools → Application → Manifest (verify manifest.json)
2. Check Service Workers registration
3. Test offline mode (disconnect network)
4. Run Lighthouse audit (target: 95+ score)
5. Test "Add to Home Screen" on mobile devices

---

## Architecture

### Core Module Pattern

The application follows a **class-based coordinator pattern** where `App.js` orchestrates all managers:

```
App.js (main coordinator)
├── WindDataManager.js    - Fetches wind data from APIs
├── MapController.js      - Manages Leaflet map and markers
├── ForecastManager.js    - Displays 3-day wind forecast
├── WindArrowController.js - Visual wind direction indicator
├── HistoryManager.js     - LocalStorage for historical data
└── WindStatistics.js     - Calculates wind trends
```

**Data Flow:**
1. `App.init()` initializes all managers
2. `WindDataManager` fetches data every 30 seconds
3. `App.updateWindData()` receives data and updates:
   - UI display (`updateWindDisplay`)
   - Map wind arrow (`WindArrowController.updateWind`)
   - Statistics cache (`WindStatistics.addMeasurement`)
   - LocalStorage history (`HistoryManager.saveWindData`)

### Configuration System

**All constants centralized in `js/config.js`:**
- API endpoints and locations
- Wind safety thresholds (offshore: 225°-315°, onshore: 45°-135°)
- Update intervals (30s for data, 5min for trend)
- Map settings, conversions, and UI constants

**To change behavior, edit `config.js` - DO NOT hardcode values elsewhere.**

### Wind Safety Logic

**Critical for kitesurfing safety:**
- **Offshore (225°-315°)**: DANGEROUS - wind blowing from land to sea (red warning). Risk of being blown offshore.
- **Onshore (45°-135°)**: SAFE - wind blowing from sea to land (green). Safe conditions.
- **Sideshore**: Moderate - wind parallel to beach (yellow/orange)

Wind safety calculations are centralized in `WindUtils.js` (lines 74-125) and referenced throughout.

### Service Worker (sw.js)

**Caching Strategy:**
- Core assets: Cache-first (HTML, CSS, JS, icons)
- API requests: Network-first with 24h cache fallback
- Map tiles: Always network (no caching to save space)

**Cache versioning:** Update `APP_VERSION` in `sw.js` and `frontend/version.json` when deploying changes. Cache names are derived automatically as `jollykite-v{APP_VERSION}`.

---

## Common Development Tasks

### Adding New Wind Data Sources

1. Add API endpoint to `config.js` → `api` section
2. Create fetch method in `WindDataManager.js`
3. Ensure data is converted to knots using `WindUtils` conversion methods
4. Update `App.updateWindData()` to handle new data source

### Modifying Wind Safety Rules

1. Edit thresholds in `config.js` → `windSafety` section
2. Wind safety logic is in `WindUtils.getWindSafety()`
3. Color mappings in `config.windSafety.levels`

### Updating Service Worker

1. Increment version in `frontend/version.json` and `APP_VERSION` in `sw.js`
2. Update `CORE_ASSETS` array if adding new files
3. Test by unregistering old SW: DevTools → Application → Service Workers → Unregister

### Adding New Locations

1. Add coordinates to `config.js` → `locations`
2. Add marker in `MapController.addMarkers()`
3. Use Leaflet's `L.marker()` with custom `divIcon` for emoji markers

### Changing Update Intervals

Edit `config.js` → `intervals`:
- `autoUpdate`: Wind data refresh (default: 30s)
- `trendAnalysis`: Statistics window (default: 5min)

---

## API Integration

### Ambient Weather Network

**Endpoint:** Configured in `config.api.ambientWeather`
**Usage:** Real-time wind speed, direction, gusts, temperature
**Rate Limit:** Public slug, no authentication required
**Data Format:** Returns device array with `lastData` object

**Important:** All speeds from API are in MPH - MUST convert to knots using `WindUtils.mphToKnots()`

### Open-Meteo Forecast API

**Endpoint:** Configured in `config.api.openMeteo`
**Usage:** 3-day hourly wind forecast
**Parameters:** `latitude`, `longitude`, `hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m`
**Data Format:** Returns hourly arrays indexed by hour

**Important:** Wind speeds from API are in km/h - MUST convert to knots using `WindUtils.kmhToKnots()`

---

## PWA Deployment

### GitHub Pages (Recommended)

**Important:** When deploying, remember to increment the Service Worker cache version in `sw.js` to ensure users get the latest updates.

```bash
# 1. Update cache version in sw.js (e.g., jollykite-v1.1.9)
# 2. Commit and push to GitHub
git add .
git commit -m "Update JollyKite PWA"
git push origin main

# 3. Enable in repo Settings → Pages → Source: main branch (if not already enabled)
# URL: https://YOUR_USERNAME.github.io/JollyKite/
```

### Other Options

- **Vercel**: `vercel` (auto-deploy)
- **Netlify**: Drag & drop or `netlify deploy --prod`
- **Cloudflare Pages**: Connect GitHub repo

**HTTPS is required for PWA features (Service Worker, Add to Home Screen).**

---

## Key Conventions

### Code Style

- ES6 modules with explicit imports/exports
- Class-based architecture (no functional components)
- Async/await for API calls (not promises)
- Config-driven (avoid hardcoded values)

### Naming Conventions

- Classes: PascalCase (`WindDataManager`)
- Methods: camelCase (`fetchCurrentWindData`)
- Config constants: camelCase objects (`config.windSafety`)
- Files: PascalCase for classes, kebab-case for others

### Wind Data Format

**Standard wind data object:**
```javascript
{
  windSpeedKnots: number,      // Current speed in knots
  windGustKnots: number,       // Current gust in knots
  maxGustKnots: number,        // Max daily gust
  windDir: number,             // Direction in degrees (0-360)
  windDirAvg: number,          // 10-min average direction
  temperature: number,         // Temperature (Fahrenheit)
  humidity: number,            // Humidity percentage
  pressure: number,            // Barometric pressure
  timestamp: Date,             // Data timestamp
  safety: {                    // Added by getWindSafety()
    level: string,
    text: string,
    color: string,
    isOffshore: boolean,
    isOnshore: boolean
  }
}
```

### Error Handling

- All API calls wrapped in try/catch
- Errors logged to console
- UI shows friendly Russian error messages
- Offline mode gracefully falls back to cached data

---

## Debugging

### Common Issues

**Service Worker not updating:**
- Increment `APP_VERSION` in `sw.js` and version in `frontend/version.json`
- DevTools → Application → Service Workers → Unregister
- Hard refresh (Cmd/Ctrl + Shift + R)

**Wind data not loading:**
- Check browser console for API errors
- Verify API endpoints in `config.js`
- Test API directly in browser/Postman
- Check network requests in DevTools

**Map not displaying:**
- Ensure Leaflet CSS/JS loaded (check Network tab)
- Verify `config.map.containerId` matches HTML element ID
- Check for JavaScript errors in console

**PWA not installable:**
- Must be served over HTTPS (or localhost)
- Check manifest.json is valid
- Verify all icon paths are correct
- Service Worker must be registered successfully

### Browser DevTools

**Application Tab:**
- Manifest: Verify PWA metadata
- Service Workers: Check registration status
- Storage → Local Storage: View wind history
- Cache Storage: Inspect cached assets

**Console Logging:**
The app logs initialization steps - look for:
- `✓` markers indicate successful initialization
- `⚠` markers indicate warnings (non-critical)
- `❌` markers indicate errors (critical)

---

## Important Notes

- **Language**: UI is in Russian (Cyrillic) - primary audience is Russian-speaking kitesurfers
- **Location-specific**: Hardcoded for Pak Nam Pran, Thailand - not easily portable to other spots
- **No Build Process**: Pure vanilla JS, no bundler/transpiler required
- **Mobile-first**: Designed primarily for mobile use on the beach
- **Offline-capable**: Full functionality in offline mode using cached data (up to 24h)

---

## Resources

- **Deployment Guide**: See `DEPLOY.md` for detailed deployment instructions
- **Wind Documentation**: See `docs/WIND_DIRECTION.md` for safety guidelines
- **Cache Strategy**: See `docs/CACHE.md` for caching details
- **Contact**: Telegram @gypsy_mermaid (project maintainer)
