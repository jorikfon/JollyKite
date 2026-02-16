import Foundation

// MARK: - Wind Data Cache

/// File-based JSON cache in the App Group container.
/// Provides offline access to wind data for up to 24 hours.
public actor WindDataCache {

    private let cacheDirectory: URL
    private let maxAge: TimeInterval

    public init(maxAge: TimeInterval = 86400) { // 24 hours default
        self.maxAge = maxAge

        if let groupURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: SharedDataStore.appGroupIdentifier
        ) {
            self.cacheDirectory = groupURL.appendingPathComponent("WindCache", isDirectory: true)
        } else {
            self.cacheDirectory = FileManager.default.temporaryDirectory
                .appendingPathComponent("WindCache", isDirectory: true)
        }

        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    // MARK: - Wind Data

    private var windDataURL: URL {
        cacheDirectory.appendingPathComponent("current_wind.json")
    }

    public func save(windData: WindData) {
        save(windData, to: windDataURL)
    }

    public func loadWindData() -> WindData? {
        load(WindData.self, from: windDataURL)
    }

    // MARK: - Forecast

    private var forecastURL: URL {
        cacheDirectory.appendingPathComponent("forecast.json")
    }

    public func save(forecast: [WindForecastEntry]) {
        save(forecast, to: forecastURL)
    }

    public func loadForecast() -> [WindForecastEntry]? {
        load([WindForecastEntry].self, from: forecastURL)
    }

    // MARK: - History

    private func historyURL(hours: Int) -> URL {
        cacheDirectory.appendingPathComponent("history_\(hours)h.json")
    }

    public func save(history: [WindData], hours: Int) {
        save(history, to: historyURL(hours: hours))
    }

    public func loadHistory(hours: Int) -> [WindData]? {
        load([WindData].self, from: historyURL(hours: hours))
    }

    // MARK: - Cleanup

    /// Remove cache files older than maxAge.
    public func cleanup() {
        guard let files = try? FileManager.default.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: [.contentModificationDateKey]
        ) else { return }

        let cutoff = Date().addingTimeInterval(-maxAge)

        for file in files {
            guard let attributes = try? FileManager.default.attributesOfItem(atPath: file.path),
                  let modified = attributes[.modificationDate] as? Date,
                  modified < cutoff else { continue }
            try? FileManager.default.removeItem(at: file)
        }
    }

    // MARK: - Private

    private func save<T: Encodable>(_ value: T, to url: URL) {
        guard let data = try? JSONEncoder.shared.encode(value) else { return }
        try? data.write(to: url, options: .atomic)
    }

    private func load<T: Decodable>(_ type: T.Type, from url: URL) -> T? {
        guard let data = try? Data(contentsOf: url) else { return nil }

        // Check age
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
              let modified = attributes[.modificationDate] as? Date,
              Date().timeIntervalSince(modified) < maxAge else {
            return nil
        }

        return try? JSONDecoder.shared.decode(type, from: data)
    }
}
