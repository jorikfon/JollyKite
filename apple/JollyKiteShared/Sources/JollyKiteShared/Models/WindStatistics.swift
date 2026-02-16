import Foundation

// MARK: - Wind Statistics

/// Aggregated wind statistics for a time period.
/// Maps to GET /api/wind/statistics/:hours response.
public struct WindStatistics: Codable, Sendable, Hashable {
    public let count: Int
    public let avgSpeed: Double
    public let minSpeed: Double
    public let maxSpeed: Double
    public let maxGust: Double?
    public let avgDirection: Double?

    public init(
        count: Int,
        avgSpeed: Double,
        minSpeed: Double,
        maxSpeed: Double,
        maxGust: Double? = nil,
        avgDirection: Double? = nil
    ) {
        self.count = count
        self.avgSpeed = avgSpeed
        self.minSpeed = minSpeed
        self.maxSpeed = maxSpeed
        self.maxGust = maxGust
        self.avgDirection = avgDirection
    }

    enum CodingKeys: String, CodingKey {
        case count
        case avgSpeed = "avg_speed"
        case minSpeed = "min_speed"
        case maxSpeed = "max_speed"
        case maxGust = "max_gust"
        case avgDirection = "avg_direction"
    }

    // MARK: - Computed

    /// Speed range in knots.
    public var speedRange: ClosedRange<Double> {
        minSpeed...maxSpeed
    }

    /// Average speed in the given unit.
    public func averageSpeed(in unit: WindUnit) -> Double {
        unit.convert(fromKnots: avgSpeed)
    }

    /// Min speed in the given unit.
    public func minimumSpeed(in unit: WindUnit) -> Double {
        unit.convert(fromKnots: minSpeed)
    }

    /// Max speed in the given unit.
    public func maximumSpeed(in unit: WindUnit) -> Double {
        unit.convert(fromKnots: maxSpeed)
    }

    /// Dominant wind direction if available.
    public var dominantDirection: WindDirection? {
        guard let avgDirection else { return nil }
        return WindDirection(degrees: avgDirection)
    }

    /// Whether there is enough data for meaningful statistics.
    public var hasEnoughData: Bool {
        count >= 3
    }
}
