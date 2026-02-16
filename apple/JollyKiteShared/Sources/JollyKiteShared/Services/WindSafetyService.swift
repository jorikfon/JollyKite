import Foundation

// MARK: - Wind Safety Service

/// Calculates safety level from wind direction and speed.
/// Matches the safety logic from the existing web app (WindUtils.js + config.js).
public enum WindSafetyService {
    // MARK: - Direction Thresholds (Pak Nam Pran)

    /// Offshore range: 225-315 degrees (SW-NW). Wind from land to sea. DANGEROUS.
    private static let offshoreMin = 225
    private static let offshoreMax = 315

    /// Onshore range: 45-135 degrees (NE-SE). Wind from sea to land. SAFE.
    private static let onshoreMin = 45
    private static let onshoreMax = 135

    // MARK: - Speed Thresholds (knots)

    private static let veryLow: Double = 5
    private static let low: Double = 8
    private static let moderate: Double = 12
    private static let good: Double = 15
    private static let strong: Double = 20
    private static let veryStrong: Double = 25
    private static let extreme: Double = 30

    // MARK: - Evaluation

    /// Evaluate safety from direction (degrees) and speed (knots).
    /// This is the authoritative safety calculation, matching WindUtils.getWindSafety().
    public static func evaluate(direction: Int, speedKnots: Double) -> SafetyLevel {
        let isOffshore = direction >= offshoreMin && direction <= offshoreMax
        let isOnshore = direction >= onshoreMin && direction <= onshoreMax

        if speedKnots < veryLow {
            return .low
        }

        if isOffshore || speedKnots > extreme {
            return .danger
        }

        if isOnshore && speedKnots >= moderate && speedKnots <= veryStrong {
            return .excellent
        }

        if isOnshore && speedKnots >= veryLow && speedKnots < moderate {
            return .good
        }

        // Sideshore with moderate wind
        if speedKnots >= low && speedKnots <= good {
            return .good
        }

        return .moderate
    }

    /// Evaluate safety from a WindData value.
    public static func evaluate(windData: WindData) -> SafetyLevel {
        evaluate(direction: windData.windDir, speedKnots: windData.windSpeedKnots)
    }

    /// Whether conditions are suitable for kitesurfing.
    public static func isSuitableForKiting(direction: Int, speedKnots: Double) -> Bool {
        let isOffshore = direction >= offshoreMin && direction <= offshoreMax
        if isOffshore { return false }
        if speedKnots < low { return false }
        if speedKnots > extreme { return false }
        return true
    }
}
