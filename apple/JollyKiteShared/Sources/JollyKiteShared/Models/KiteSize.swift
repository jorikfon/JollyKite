import Foundation

// MARK: - Kite Size Recommendation

/// Recommended kite size for current conditions.
public struct KiteSizeRecommendation: Sendable, Hashable {
    /// Recommended kite size in square meters.
    public let size: Double

    /// Optimal calculated size before snapping.
    public let optimalSize: Double

    /// Suitability of this size for current conditions.
    public let suitability: KiteSuitability

    /// Recommended rider weight for this kite at current wind.
    public let recommendedWeight: Int

    /// Whether this is the closest available size to optimal.
    public let isOptimal: Bool

    public init(
        size: Double,
        optimalSize: Double,
        suitability: KiteSuitability,
        recommendedWeight: Int,
        isOptimal: Bool
    ) {
        self.size = size
        self.optimalSize = optimalSize
        self.suitability = suitability
        self.recommendedWeight = recommendedWeight
        self.isOptimal = isOptimal
    }

    /// Size formatted for display (e.g., "12 m" or "13.5 m").
    public var sizeFormatted: String {
        if size.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(size))m"
        }
        return "\(size)m"
    }
}

// MARK: - Kite Suitability

public enum KiteSuitability: String, Sendable, Hashable {
    case optimal    // Within 10% of ideal
    case good       // Within 20%
    case acceptable // Within 35%
    case tooSmall   // More than 35% smaller
    case tooLarge   // More than 35% larger
    case tooWeak    // Wind below minimum for board type
    case tooStrong  // Wind above maximum for board type

    public var label: String {
        switch self {
        case .optimal: return "Optimal"
        case .good: return "Good"
        case .acceptable: return "Acceptable"
        case .tooSmall: return "Too Small"
        case .tooLarge: return "Too Large"
        case .tooWeak: return "Too Weak"
        case .tooStrong: return "Too Strong"
        }
    }

    public var labelRu: String {
        switch self {
        case .optimal: return "Отлично!"
        case .good: return "Хорошо"
        case .acceptable: return "Подойдёт"
        case .tooSmall: return "Маловат"
        case .tooLarge: return "Великоват"
        case .tooWeak: return "Слабый ветер"
        case .tooStrong: return "Сильный ветер"
        }
    }

    public var sfSymbol: String {
        switch self {
        case .optimal: return "star.fill"
        case .good: return "checkmark.circle.fill"
        case .acceptable: return "hand.thumbsup"
        case .tooSmall: return "arrow.down"
        case .tooLarge: return "arrow.up"
        case .tooWeak: return "wind"
        case .tooStrong: return "exclamationmark.triangle"
        }
    }
}

// MARK: - Board Type

public enum BoardType: String, Codable, Sendable, Hashable, CaseIterable {
    case twintip
    case hydrofoil

    public var label: String {
        switch self {
        case .twintip: return "Twintip"
        case .hydrofoil: return "Hydrofoil"
        }
    }

    /// Calculation factor: kiteSize = (weight * factor) / speed^2
    public var factor: Double {
        switch self {
        case .twintip: return 35
        case .hydrofoil: return 25
        }
    }

    /// Minimum wind speed in knots for this board type.
    public var minWind: Double {
        switch self {
        case .twintip: return 8
        case .hydrofoil: return 6
        }
    }

    /// Maximum wind speed in knots for this board type.
    public var maxWind: Double {
        switch self {
        case .twintip: return 35
        case .hydrofoil: return 30
        }
    }

    public var sfSymbol: String {
        switch self {
        case .twintip: return "figure.surfing"
        case .hydrofoil: return "sailboat"
        }
    }
}
