import Foundation

// MARK: - Kite Size Service

/// Calculates recommended kite size based on wind, rider weight, and board type.
/// Matches KiteSizeCalculator.js logic.
public enum KiteSizeService {

    /// Available kite sizes in square meters.
    public static let availableSizes: [Double] = [8, 9, 10, 11, 12, 13.5, 14, 17]

    /// Default rider weight in kg.
    public static let defaultWeight: Double = 75

    // MARK: - Core Calculations

    /// Calculate optimal kite size for a rider at a given wind speed.
    /// Formula: kiteSize = (riderWeight * factor) / windSpeed^2
    public static func optimalSize(
        riderWeight: Double,
        windSpeedKnots: Double,
        boardType: BoardType
    ) -> Double {
        guard windSpeedKnots > 0 else { return .infinity }
        return (riderWeight * boardType.factor) / pow(windSpeedKnots, 2)
    }

    /// Calculate optimal rider weight for a kite size at a given wind speed.
    /// Formula: weight = (kiteSize * windSpeed^2) / factor
    public static func optimalWeight(
        kiteSize: Double,
        windSpeedKnots: Double,
        boardType: BoardType
    ) -> Int {
        let weight = (kiteSize * pow(windSpeedKnots, 2)) / boardType.factor
        return max(40, min(120, Int(weight.rounded())))
    }

    /// Find the closest available kite size to a calculated optimal.
    public static func closestAvailableSize(to optimal: Double) -> Double {
        availableSizes.min(by: { abs($0 - optimal) < abs($1 - optimal) }) ?? 12
    }

    // MARK: - Suitability

    /// Determine suitability of a kite size for given conditions.
    public static func suitability(
        kiteSize: Double,
        optimalSize: Double,
        windSpeedKnots: Double,
        boardType: BoardType
    ) -> KiteSuitability {
        if windSpeedKnots < boardType.minWind { return .tooWeak }
        if windSpeedKnots > boardType.maxWind { return .tooStrong }

        let percentDiff = abs(kiteSize - optimalSize) / optimalSize * 100

        if percentDiff <= 10 { return .optimal }
        if percentDiff <= 20 { return .good }
        if percentDiff <= 35 { return .acceptable }

        return kiteSize < optimalSize ? .tooSmall : .tooLarge
    }

    // MARK: - Full Recommendation

    /// Get the single best kite size recommendation.
    public static func recommend(
        windSpeedKnots: Double,
        riderWeight: Double = defaultWeight,
        boardType: BoardType = .twintip
    ) -> KiteSizeRecommendation? {
        guard windSpeedKnots >= boardType.minWind,
              windSpeedKnots <= boardType.maxWind else {
            return nil
        }

        let optimal = optimalSize(
            riderWeight: riderWeight,
            windSpeedKnots: windSpeedKnots,
            boardType: boardType
        )
        let closest = closestAvailableSize(to: optimal)
        let suit = suitability(
            kiteSize: closest,
            optimalSize: optimal,
            windSpeedKnots: windSpeedKnots,
            boardType: boardType
        )
        let weight = optimalWeight(
            kiteSize: closest,
            windSpeedKnots: windSpeedKnots,
            boardType: boardType
        )

        return KiteSizeRecommendation(
            size: closest,
            optimalSize: optimal,
            suitability: suit,
            recommendedWeight: weight,
            isOptimal: true
        )
    }

    /// Get recommendations for all available kite sizes.
    public static func allRecommendations(
        windSpeedKnots: Double,
        riderWeight: Double = defaultWeight,
        boardType: BoardType = .twintip
    ) -> [KiteSizeRecommendation] {
        let optimal = optimalSize(
            riderWeight: riderWeight,
            windSpeedKnots: windSpeedKnots,
            boardType: boardType
        )
        let closest = closestAvailableSize(to: optimal)

        return availableSizes.map { size in
            let suit = suitability(
                kiteSize: size,
                optimalSize: optimal,
                windSpeedKnots: windSpeedKnots,
                boardType: boardType
            )
            let weight = optimalWeight(
                kiteSize: size,
                windSpeedKnots: windSpeedKnots,
                boardType: boardType
            )

            return KiteSizeRecommendation(
                size: size,
                optimalSize: optimal,
                suitability: suit,
                recommendedWeight: weight,
                isOptimal: size == closest
            )
        }
    }
}
