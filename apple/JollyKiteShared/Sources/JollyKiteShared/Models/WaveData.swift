import Foundation

// MARK: - Wave Data

/// Marine wave conditions from Open-Meteo marine API.
public struct WaveData: Codable, Sendable, Hashable {
    /// Wave height in meters.
    public let height: Double

    /// Wave direction in degrees (0-360).
    public let direction: Int

    /// Wave period in seconds.
    public let period: Double

    public init(height: Double, direction: Int, period: Double) {
        self.height = height
        self.direction = direction
        self.period = period
    }

    // MARK: - Computed

    /// Wave direction as a structured value.
    public var waveDirection: WindDirection {
        WindDirection(degrees: Double(direction))
    }

    /// Height formatted with one decimal and unit.
    public var heightFormatted: String {
        String(format: "%.1f m", height)
    }

    /// Period formatted with one decimal and unit.
    public var periodFormatted: String {
        String(format: "%.1f s", period)
    }

    /// Wave condition category.
    public var condition: WaveCondition {
        switch height {
        case ..<0.3: return .calm
        case 0.3..<0.8: return .slight
        case 0.8..<1.5: return .moderate
        case 1.5..<2.5: return .rough
        default: return .veryRough
        }
    }
}

// MARK: - Wave Condition

public enum WaveCondition: String, Sendable, Hashable {
    case calm
    case slight
    case moderate
    case rough
    case veryRough

    public var label: String {
        switch self {
        case .calm: return "Calm"
        case .slight: return "Slight"
        case .moderate: return "Moderate"
        case .rough: return "Rough"
        case .veryRough: return "Very Rough"
        }
    }

    public var sfSymbol: String {
        switch self {
        case .calm: return "water.waves"
        case .slight: return "water.waves"
        case .moderate: return "water.waves"
        case .rough: return "water.waves.and.arrow.up"
        case .veryRough: return "water.waves.and.arrow.up"
        }
    }
}
