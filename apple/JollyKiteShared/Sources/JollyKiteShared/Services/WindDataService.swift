import Foundation

// MARK: - Wind Data Service Protocol

/// High-level service for fetching and caching wind data.
/// Used by iPhone app, Watch app, and widgets.
public protocol WindDataServiceProtocol: Sendable {
    func currentWind() async throws -> WindData
    func forecast() async throws -> [WindForecastEntry]
    func trend() async throws -> WindTrend
    func statistics(hours: Int) async throws -> WindStatistics
    func todayTimeline() async throws -> TodayFullTimeline
}

// MARK: - Wind Data Service

/// Concrete wind data service with backend-first, fallback-to-direct strategy.
/// Caches results in SharedDataStore for widget and Watch access.
public actor WindDataService: WindDataServiceProtocol {
    private let apiClient: APIClient
    private let openMeteo: OpenMeteoClient
    private let ambientWeather: AmbientWeatherClient
    private let cache: WindDataCache
    private let store: SharedDataStore

    public init(
        apiClient: APIClient,
        openMeteo: OpenMeteoClient = OpenMeteoClient(),
        ambientWeather: AmbientWeatherClient = AmbientWeatherClient(),
        cache: WindDataCache = WindDataCache(),
        store: SharedDataStore = SharedDataStore()
    ) {
        self.apiClient = apiClient
        self.openMeteo = openMeteo
        self.ambientWeather = ambientWeather
        self.cache = cache
        self.store = store
    }

    public func currentWind() async throws -> WindData {
        do {
            let data = try await apiClient.fetchCurrentWind()
            await cache.save(windData: data)
            store.lastWindData = data
            return data
        } catch {
            // Fallback to Ambient Weather directly
            let data = try await ambientWeather.fetchCurrentWind()
            await cache.save(windData: data)
            store.lastWindData = data
            return data
        }
    }

    public func forecast() async throws -> [WindForecastEntry] {
        do {
            let entries = try await apiClient.fetchForecast()
            await cache.save(forecast: entries)
            return entries
        } catch {
            // Fallback to Open-Meteo directly
            let entries = try await openMeteo.fetchWindForecast()
            await cache.save(forecast: entries)
            return entries
        }
    }

    public func trend() async throws -> WindTrend {
        try await apiClient.fetchTrend()
    }

    public func statistics(hours: Int = 24) async throws -> WindStatistics {
        try await apiClient.fetchStatistics(hours: hours)
    }

    public func todayTimeline() async throws -> TodayFullTimeline {
        try await apiClient.fetchTodayTimeline()
    }
}
