import Foundation

// MARK: - Forecast Entry

/// A single hourly forecast entry.
/// Maps to each element in GET /api/wind/forecast response.
public struct WindForecastEntry: Codable, Sendable, Hashable, Identifiable {
    public var id: String { date.ISO8601Format() }

    public let date: Date
    public let time: Int
    public let speed: Double
    public let direction: Int
    public let gust: Double
    public let precipitationProbability: Int?
    public let waveHeight: Double?
    public let waveDirection: Int?
    public let wavePeriod: Double?

    /// Whether this entry was corrected by actual/forecast comparison.
    public let corrected: Bool?
    public let correctionFactor: Double?

    public init(
        date: Date,
        time: Int,
        speed: Double,
        direction: Int,
        gust: Double,
        precipitationProbability: Int? = nil,
        waveHeight: Double? = nil,
        waveDirection: Int? = nil,
        wavePeriod: Double? = nil,
        corrected: Bool? = nil,
        correctionFactor: Double? = nil
    ) {
        self.date = date
        self.time = time
        self.speed = speed
        self.direction = direction
        self.gust = gust
        self.precipitationProbability = precipitationProbability
        self.waveHeight = waveHeight
        self.waveDirection = waveDirection
        self.wavePeriod = wavePeriod
        self.corrected = corrected
        self.correctionFactor = correctionFactor
    }

    // MARK: - Computed

    /// Speed in knots (the backend already converts to knots).
    public var speedKnots: Double { speed }

    /// Gust in knots.
    public var gustKnots: Double { gust }

    /// Wind direction as a structured value.
    public var windDirection: WindDirection {
        WindDirection(degrees: Double(direction))
    }

    /// Speed in a given unit.
    public func speed(in unit: WindUnit) -> Double {
        unit.convert(fromKnots: speed)
    }

    /// Gust in a given unit.
    public func gust(in unit: WindUnit) -> Double {
        unit.convert(fromKnots: gust)
    }

    /// Wave data if available.
    public var wave: WaveData? {
        guard let waveHeight, let waveDirection, let wavePeriod else { return nil }
        return WaveData(height: waveHeight, direction: waveDirection, period: wavePeriod)
    }

    /// Safety assessment for this forecast hour.
    public var safety: SafetyLevel {
        WindSafetyService.evaluate(direction: direction, speedKnots: speed)
    }
}

// MARK: - Forecast Collection

/// A 3-day forecast collection with convenience accessors.
public struct WindForecast: Sendable, Hashable {
    public let entries: [WindForecastEntry]

    public init(entries: [WindForecastEntry]) {
        self.entries = entries
    }

    /// Entries grouped by calendar day (Bangkok timezone).
    public var byDay: [[WindForecastEntry]] {
        let calendar = Calendar.current
        let bangkok = TimeZone(identifier: "Asia/Bangkok")!
        var calendarBangkok = calendar
        calendarBangkok.timeZone = bangkok

        let grouped = Dictionary(grouping: entries) { entry in
            calendarBangkok.startOfDay(for: entry.date)
        }
        return grouped.keys.sorted().compactMap { grouped[$0] }
    }

    /// Best conditions entry (highest safety level with best speed).
    public var bestConditions: WindForecastEntry? {
        entries
            .filter { $0.safety == .excellent || $0.safety == .good }
            .max { a, b in a.speed < b.speed }
    }

    /// Peak wind speed across all forecast entries.
    public var peakSpeed: Double? {
        entries.map(\.speed).max()
    }

    /// Peak gust across all forecast entries.
    public var peakGust: Double? {
        entries.map(\.gust).max()
    }
}

// MARK: - Today Full Timeline

/// Combined history + forecast for today.
/// Maps to GET /api/wind/today/full response.
public struct TodayFullTimeline: Codable, Sendable {
    public let history: [TimelineEntry]
    public let forecast: [WindForecastEntry]
    public let correctionFactor: Double
    public let currentTime: CurrentTime?

    public init(
        history: [TimelineEntry],
        forecast: [WindForecastEntry],
        correctionFactor: Double,
        currentTime: CurrentTime?
    ) {
        self.history = history
        self.forecast = forecast
        self.correctionFactor = correctionFactor
        self.currentTime = currentTime
    }

    public struct CurrentTime: Codable, Sendable, Hashable {
        public let hour: Int
        public let minute: Int
    }

    /// Interval-aggregated history entry.
    public struct TimelineEntry: Codable, Sendable, Hashable {
        public let hour: Int
        public let minute: Int?
        public let time: String?
        public let avgSpeed: Double
        public let maxGust: Double?
        public let avgDirection: Double?
        public let measurements: Int?

        enum CodingKeys: String, CodingKey {
            case hour, minute, time
            case avgSpeed = "avg_speed"
            case maxGust = "max_gust"
            case avgDirection = "avg_direction"
            case measurements
        }
    }
}
