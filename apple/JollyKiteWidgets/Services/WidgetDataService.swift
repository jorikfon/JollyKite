import Foundation
import JollyKiteShared

struct WidgetDataService {
    private let store = SharedDataStore()
    private let preferences = PreferencesStore()

    func fetchEntry() async -> WindEntry {
        let client = preferences.makeAPIClient()

        // Fetch wind data
        let windData: WindData?
        if let cached = store.lastWindData, !store.isStale(maxAge: 600) {
            windData = cached
        } else {
            windData = try? await client.fetchCurrentWind()
            if let windData {
                store.lastWindData = windData
            }
        }

        // Fetch timeline and trend concurrently (best effort)
        async let timelineResult = fetchTimeline(client: client)
        async let trendResult = fetchTrend(client: client)
        let (timeline, trend) = await (timelineResult, trendResult)

        guard let windData else {
            if let cached = store.lastWindData {
                return makeEntry(from: cached, timeline: timeline, trend: trend)
            }
            return .empty
        }

        return makeEntry(from: windData, timeline: timeline, trend: trend)
    }

    private func fetchTimeline(client: JollyKiteAPIClient) async -> TodayFullTimeline? {
        // Always fetch fresh data; fall back to cache only on failure
        if let result = try? await client.fetchTodayTimeline() {
            store.lastTodayTimeline = result
            return result
        }
        return store.lastTodayTimeline
    }

    private func fetchTrend(client: JollyKiteAPIClient) async -> WindTrend? {
        // Always fetch fresh data; fall back to cache only on failure
        if let result = try? await client.fetchTrend() {
            store.lastWindTrend = result
            return result
        }
        return store.lastWindTrend
    }

    private func makeEntry(
        from windData: WindData,
        timeline: TodayFullTimeline?,
        trend: WindTrend?
    ) -> WindEntry {
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
            isPlaceholder: false,
            todayHistory: timeline?.history ?? [],
            todayForecast: timeline?.forecast ?? [],
            currentHour: timeline?.currentTime?.hour,
            currentMinute: timeline?.currentTime?.minute,
            directionStability: trend?.directionTrend
        )
    }
}
