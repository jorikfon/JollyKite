import Foundation

// MARK: - Shared Data Store

/// App Group UserDefaults wrapper for sharing data between iPhone, Watch, and Widgets.
/// Uses group.com.jollykite.shared for cross-target access.
public final class SharedDataStore: @unchecked Sendable {

    public static let appGroupIdentifier = "group.com.jollykite.shared"

    private let defaults: UserDefaults

    public init(defaults: UserDefaults? = nil) {
        self.defaults = defaults
            ?? UserDefaults(suiteName: SharedDataStore.appGroupIdentifier)
            ?? .standard
    }

    // MARK: - Wind Data (for widgets and complications)

    private enum Keys {
        static let lastWindData = "lastWindData"
        static let lastForecast = "lastForecast"
        static let lastUpdateTimestamp = "lastUpdateTimestamp"
        static let lastTodayTimeline = "lastTodayTimeline"
        static let lastWindTrend = "lastWindTrend"
    }

    /// Last known wind data. Written by iPhone app, read by widgets/watch.
    public var lastWindData: WindData? {
        get {
            guard let data = defaults.data(forKey: Keys.lastWindData) else { return nil }
            return try? JSONDecoder.shared.decode(WindData.self, from: data)
        }
        set {
            if let newValue, let data = try? JSONEncoder.shared.encode(newValue) {
                defaults.set(data, forKey: Keys.lastWindData)
                defaults.set(Date().timeIntervalSince1970, forKey: Keys.lastUpdateTimestamp)
            } else {
                defaults.removeObject(forKey: Keys.lastWindData)
            }
        }
    }

    /// Last known forecast entries. Written by iPhone app, read by widgets.
    public var lastForecast: [WindForecastEntry]? {
        get {
            guard let data = defaults.data(forKey: Keys.lastForecast) else { return nil }
            return try? JSONDecoder.shared.decode([WindForecastEntry].self, from: data)
        }
        set {
            if let newValue, let data = try? JSONEncoder.shared.encode(newValue) {
                defaults.set(data, forKey: Keys.lastForecast)
            } else {
                defaults.removeObject(forKey: Keys.lastForecast)
            }
        }
    }

    /// Last today's timeline data. Written by iPhone app, read by widgets.
    public var lastTodayTimeline: TodayFullTimeline? {
        get {
            guard let data = defaults.data(forKey: Keys.lastTodayTimeline) else { return nil }
            return try? JSONDecoder.shared.decode(TodayFullTimeline.self, from: data)
        }
        set {
            if let newValue, let data = try? JSONEncoder.shared.encode(newValue) {
                defaults.set(data, forKey: Keys.lastTodayTimeline)
            } else {
                defaults.removeObject(forKey: Keys.lastTodayTimeline)
            }
        }
    }

    /// Last wind trend data. Written by iPhone app, read by widgets.
    public var lastWindTrend: WindTrend? {
        get {
            guard let data = defaults.data(forKey: Keys.lastWindTrend) else { return nil }
            return try? JSONDecoder.shared.decode(WindTrend.self, from: data)
        }
        set {
            if let newValue, let data = try? JSONEncoder.shared.encode(newValue) {
                defaults.set(data, forKey: Keys.lastWindTrend)
            } else {
                defaults.removeObject(forKey: Keys.lastWindTrend)
            }
        }
    }

    /// Timestamp of last successful data update.
    public var lastUpdateDate: Date? {
        let interval = defaults.double(forKey: Keys.lastUpdateTimestamp)
        guard interval > 0 else { return nil }
        return Date(timeIntervalSince1970: interval)
    }

    /// Whether the cached data is stale (older than the given interval).
    public func isStale(maxAge: TimeInterval = 300) -> Bool {
        guard let lastUpdate = lastUpdateDate else { return true }
        return Date().timeIntervalSince(lastUpdate) > maxAge
    }
}

// MARK: - Shared Coders

extension JSONEncoder {
    static let shared: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
}

extension JSONDecoder {
    static let shared: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = ISO8601DateFormatter.withFractionalSeconds.date(from: string) {
                return date
            }
            if let date = ISO8601DateFormatter.standard.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(string)"
            )
        }
        return decoder
    }()
}
