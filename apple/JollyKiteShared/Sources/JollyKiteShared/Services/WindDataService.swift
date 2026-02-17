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

/// Concrete wind data service using backend API only.
/// Caches results in SharedDataStore for widget and Watch access.
public actor WindDataService: WindDataServiceProtocol {
    private let apiClient: APIClient
    private let cache: WindDataCache
    private let store: SharedDataStore

    public init(
        apiClient: APIClient,
        cache: WindDataCache = WindDataCache(),
        store: SharedDataStore = SharedDataStore()
    ) {
        self.apiClient = apiClient
        self.cache = cache
        self.store = store
    }

    public func currentWind() async throws -> WindData {
        let data = try await apiClient.fetchCurrentWind()
        await cache.save(windData: data)
        store.lastWindData = data
        return data
    }

    public func forecast() async throws -> [WindForecastEntry] {
        let entries = try await apiClient.fetchForecast()
        await cache.save(forecast: entries)
        return entries
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
