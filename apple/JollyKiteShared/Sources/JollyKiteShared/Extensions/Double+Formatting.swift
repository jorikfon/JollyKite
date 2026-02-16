import Foundation

// MARK: - Double Formatting

extension Double {
    /// Format with one decimal place (e.g., "12.5").
    public var oneDecimal: String {
        String(format: "%.1f", self)
    }

    /// Format with no decimal places (e.g., "12").
    public var noDecimal: String {
        String(format: "%.0f", self)
    }

    /// Format as wind speed with unit suffix.
    public func windSpeed(unit: WindUnit = .knots) -> String {
        let converted = unit.convert(fromKnots: self)
        return "\(converted.oneDecimal) \(unit.shortLabel)"
    }
}
