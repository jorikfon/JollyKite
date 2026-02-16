import Foundation

// MARK: - Wind History

/// Historical wind data from GET /api/wind/history/:hours.
/// Array of WindData entries sorted by timestamp descending.
public struct WindHistory: Sendable, Hashable {
    public let entries: [WindData]
    public let hours: Int

    public init(entries: [WindData], hours: Int) {
        self.entries = entries
        self.hours = hours
    }

    /// Entries sorted chronologically (oldest first) for charting.
    public var chronological: [WindData] {
        entries.sorted { $0.timestamp < $1.timestamp }
    }

    /// Average speed over the period.
    public var averageSpeed: Double? {
        guard !entries.isEmpty else { return nil }
        return entries.map(\.windSpeedKnots).reduce(0, +) / Double(entries.count)
    }

    /// Peak speed in the period.
    public var peakSpeed: Double? {
        entries.map(\.windSpeedKnots).max()
    }

    /// Peak gust in the period.
    public var peakGust: Double? {
        entries.compactMap(\.windGustKnots).max()
    }
}

// MARK: - Week History

/// Weekly history data from GET /api/wind/history/week.
/// Grouped by day with only 6:00-19:00 Bangkok time entries.
public struct WeekHistoryDay: Codable, Sendable, Hashable {
    public let date: String
    public let data: [WeekHistoryEntry]

    public init(date: String, data: [WeekHistoryEntry]) {
        self.date = date
        self.data = data
    }

    /// Average speed for the day.
    public var averageSpeed: Double? {
        guard !data.isEmpty else { return nil }
        return data.map(\.avgSpeed).reduce(0, +) / Double(data.count)
    }

    /// Peak gust for the day.
    public var peakGust: Double? {
        data.map(\.maxGust).max()
    }
}

public struct WeekHistoryEntry: Codable, Sendable, Hashable {
    public let time: String
    public let avgSpeed: Double
    public let maxGust: Double
    public let direction: Int

    enum CodingKeys: String, CodingKey {
        case time
        case avgSpeed = "avg_speed"
        case maxGust = "max_gust"
        case direction
    }
}
