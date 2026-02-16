import Foundation
import JollyKiteShared

struct WidgetDataService {
    private let store = SharedDataStore()
    private let preferences = PreferencesStore()

    func fetchEntry() async -> WindEntry {
        // Try shared data first (from main app)
        if let windData = store.lastWindData, !store.isStale(maxAge: 600) {
            return makeEntry(from: windData)
        }

        // Fallback: fetch from API
        do {
            let client = preferences.makeAPIClient()
            let windData = try await client.fetchCurrentWind()

            // Cache for next widget update
            store.lastWindData = windData

            return makeEntry(from: windData)
        } catch {
            // Return cached data even if stale, or empty
            if let windData = store.lastWindData {
                return makeEntry(from: windData)
            }
            return .empty
        }
    }

    private func makeEntry(from windData: WindData) -> WindEntry {
        let safety = WindSafetyService.evaluate(windData: windData)
        let forecast = store.lastForecast ?? []

        return WindEntry(
            date: windData.timestamp,
            windSpeed: windData.windSpeedKnots,
            windGust: windData.windGustKnots,
            windDirection: windData.windDir,
            safety: safety,
            unit: preferences.windUnit,
            forecast: forecast,
            isPlaceholder: false
        )
    }
}
