import Foundation

// MARK: - Wind Unit

/// User-selectable wind speed unit with conversion support.
public enum WindUnit: String, Codable, Sendable, Hashable, CaseIterable {
    case knots
    case metersPerSecond

    public var label: String {
        switch self {
        case .knots: return "knots"
        case .metersPerSecond: return "m/s"
        }
    }

    public var shortLabel: String {
        switch self {
        case .knots: return "kn"
        case .metersPerSecond: return "m/s"
        }
    }

    public var labelRu: String {
        switch self {
        case .knots: return "узлы"
        case .metersPerSecond: return "м/с"
        }
    }

    public var shortLabelRu: String {
        switch self {
        case .knots: return "уз"
        case .metersPerSecond: return "м/с"
        }
    }

    /// Convert a value from knots to this unit.
    public func convert(fromKnots knots: Double) -> Double {
        switch self {
        case .knots: return knots
        case .metersPerSecond: return knots * UnitConverter.knotsToMsFactor
        }
    }

    /// Convert a value from this unit to knots.
    public func toKnots(_ value: Double) -> Double {
        switch self {
        case .knots: return value
        case .metersPerSecond: return value * UnitConverter.msToKnotsFactor
        }
    }

    /// Format a speed value with its unit label.
    public func format(_ knots: Double, decimals: Int = 1) -> String {
        let converted = convert(fromKnots: knots)
        return String(format: "%.\(decimals)f %@", converted, shortLabel)
    }

    /// Format for Russian UI.
    public func formatRu(_ knots: Double, decimals: Int = 1) -> String {
        let converted = convert(fromKnots: knots)
        return String(format: "%.\(decimals)f %@", converted, shortLabelRu)
    }
}
