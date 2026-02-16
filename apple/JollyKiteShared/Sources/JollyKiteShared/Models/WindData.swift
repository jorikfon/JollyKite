import Foundation

// MARK: - Current Wind Data

/// Real-time wind measurement from the backend API.
/// Maps to GET /api/wind/current response.
public struct WindData: Codable, Sendable, Hashable, Identifiable {
    public var id: String { timestamp.ISO8601Format() }

    public let timestamp: Date
    public let windSpeedKnots: Double
    public let windGustKnots: Double?
    public let maxGustKnots: Double?
    public let windDir: Int
    public let windDirAvg: Int?
    public let temperature: Double?
    public let humidity: Double?
    public let pressure: Double?

    public init(
        timestamp: Date,
        windSpeedKnots: Double,
        windGustKnots: Double?,
        maxGustKnots: Double?,
        windDir: Int,
        windDirAvg: Int?,
        temperature: Double?,
        humidity: Double?,
        pressure: Double?
    ) {
        self.timestamp = timestamp
        self.windSpeedKnots = windSpeedKnots
        self.windGustKnots = windGustKnots
        self.maxGustKnots = maxGustKnots
        self.windDir = windDir
        self.windDirAvg = windDirAvg
        self.temperature = temperature
        self.humidity = humidity
        self.pressure = pressure
    }

    // MARK: - Computed Properties

    /// Wind direction as a structured WindDirection value.
    public var direction: WindDirection {
        WindDirection(degrees: Double(windDir))
    }

    /// Average wind direction if available, otherwise current direction.
    public var averageDirection: WindDirection {
        WindDirection(degrees: Double(windDirAvg ?? windDir))
    }

    /// Wind speed in the user's preferred unit.
    public func speed(in unit: WindUnit) -> Double {
        unit.convert(fromKnots: windSpeedKnots)
    }

    /// Wind gust in the user's preferred unit.
    public func gust(in unit: WindUnit) -> Double? {
        guard let windGustKnots else { return nil }
        return unit.convert(fromKnots: windGustKnots)
    }

    /// Max daily gust in the user's preferred unit.
    public func maxGust(in unit: WindUnit) -> Double? {
        guard let maxGustKnots else { return nil }
        return unit.convert(fromKnots: maxGustKnots)
    }

    /// Temperature converted from Fahrenheit to Celsius.
    public var temperatureCelsius: Double? {
        guard let temperature else { return nil }
        return (temperature - 32) * 5 / 9
    }
}

// MARK: - SSE Wind Update

/// Wrapper for Server-Sent Events wind_update messages.
/// Maps to SSE data: { type, data, trend, timestamp }
public struct WindStreamUpdate: Codable, Sendable {
    public let type: String
    public let data: WindData
    public let trend: WindTrend?
    public let timestamp: Date

    public init(type: String, data: WindData, trend: WindTrend?, timestamp: Date) {
        self.type = type
        self.data = data
        self.trend = trend
        self.timestamp = timestamp
    }
}
