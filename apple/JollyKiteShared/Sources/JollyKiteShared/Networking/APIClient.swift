import Foundation

// MARK: - API Client Protocol

/// Protocol for the JollyKite backend API client.
/// All endpoints return data already converted to knots by the backend.
public protocol APIClient: Sendable {
    /// Fetch current wind data. GET /api/wind/current
    func fetchCurrentWind() async throws -> WindData

    /// Fetch 3-day wind forecast. GET /api/wind/forecast
    func fetchForecast() async throws -> [WindForecastEntry]

    /// Fetch wind trend. GET /api/wind/trend
    func fetchTrend() async throws -> WindTrend

    /// Fetch wind history. GET /api/wind/history/:hours
    func fetchHistory(hours: Int) async throws -> [WindData]

    /// Fetch weekly history. GET /api/wind/history/week
    func fetchWeekHistory(days: Int) async throws -> [WeekHistoryDay]

    /// Fetch wind statistics. GET /api/wind/statistics/:hours
    func fetchStatistics(hours: Int) async throws -> WindStatistics

    /// Fetch today's full timeline (history + forecast). GET /api/wind/today/full
    func fetchTodayTimeline() async throws -> TodayFullTimeline
}

// MARK: - JollyKite API Client

/// Concrete implementation of the backend API client.
public final class JollyKiteAPIClient: APIClient {
    private let session: URLSession
    private let baseURL: URL
    private let decoder: JSONDecoder
    private let maxRetries: Int
    private let normalTimeout: TimeInterval

    public init(
        baseURL: URL,
        session: URLSession? = nil,
        maxRetries: Int = 3,
        normalTimeout: TimeInterval = 10
    ) {
        // Ensure trailing slash so relative paths resolve correctly
        let urlString = baseURL.absoluteString
        self.baseURL = urlString.hasSuffix("/") ? baseURL : URL(string: urlString + "/")!
        self.maxRetries = maxRetries
        self.normalTimeout = normalTimeout

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)

            // Try ISO 8601 with fractional seconds first
            if let date = ISO8601DateFormatter.withFractionalSeconds.date(from: string) {
                return date
            }
            // Fall back to standard ISO 8601
            if let date = ISO8601DateFormatter.standard.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(string)"
            )
        }
        self.decoder = decoder

        if let session {
            self.session = session
        } else {
            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = normalTimeout
            config.waitsForConnectivity = true
            self.session = URLSession(configuration: config)
        }
    }

    // MARK: - APIClient Conformance

    public func fetchCurrentWind() async throws -> WindData {
        try await request(path: "wind/current")
    }

    public func fetchForecast() async throws -> [WindForecastEntry] {
        try await request(path: "wind/forecast")
    }

    public func fetchTrend() async throws -> WindTrend {
        try await request(path: "wind/trend")
    }

    public func fetchHistory(hours: Int = 24) async throws -> [WindData] {
        try await request(path: "wind/history/\(hours)")
    }

    public func fetchWeekHistory(days: Int = 7) async throws -> [WeekHistoryDay] {
        try await request(path: "wind/history/week?days=\(days)")
    }

    public func fetchStatistics(hours: Int = 24) async throws -> WindStatistics {
        try await request(path: "wind/statistics/\(hours)")
    }

    public func fetchTodayTimeline() async throws -> TodayFullTimeline {
        try await request(path: "wind/today/full?interval=5")
    }

    // MARK: - Private

    private func request<T: Decodable>(path: String) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        var lastError: Error = APIError.networkError(underlying: URLError(.unknown))

        for attempt in 0..<maxRetries {
            if attempt > 0 {
                // Exponential backoff: 1s, 2s, 4s
                let delay = pow(2.0, Double(attempt - 1))
                try await Task.sleep(for: .seconds(delay))
            }

            do {
                let (data, response) = try await session.data(from: url)

                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.networkError(underlying: URLError(.badServerResponse))
                }

                guard (200...299).contains(httpResponse.statusCode) else {
                    let body = String(data: data, encoding: .utf8)
                    let error = APIError.httpError(statusCode: httpResponse.statusCode, body: body)
                    if !error.isRetryable { throw error }
                    lastError = error
                    continue
                }

                do {
                    return try decoder.decode(T.self, from: data)
                } catch {
                    throw APIError.decodingError(underlying: error)
                }
            } catch let error as APIError {
                if !error.isRetryable { throw error }
                lastError = error
            } catch let error as URLError where error.code == .timedOut {
                lastError = APIError.timeout
            } catch let error as URLError where error.code == .cancelled {
                throw APIError.cancelled
            } catch {
                lastError = APIError.networkError(underlying: error)
            }
        }

        throw lastError
    }
}

// MARK: - ISO8601 Formatters

extension ISO8601DateFormatter {
    static let withFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let standard: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}
