import Foundation
import SwiftUI

// MARK: - Direction Stability

/// Wind direction stability assessment from backend /api/wind/trend.
public enum DirectionStability: String, Codable, Sendable, Hashable {
    case stable
    case variable
    case changing
    case insufficientData = "insufficient_data"

    /// Localized Russian label.
    public var labelRu: String {
        switch self {
        case .stable: return "Стабильное"
        case .variable: return "Переменное"
        case .changing: return "Меняется"
        case .insufficientData: return "Нет данных"
        }
    }

    /// SF Symbol name for the stability indicator.
    public var sfSymbol: String {
        switch self {
        case .stable: return "safari"
        case .variable: return "arrow.left.arrow.right"
        case .changing: return "arrow.trianglehead.2.clockwise"
        case .insufficientData: return "hourglass"
        }
    }
}

// MARK: - Wind Trend

/// Wind trend data from GET /api/wind/trend.
/// Compares last 30 minutes vs previous 30 minutes.
public struct WindTrend: Codable, Sendable, Hashable {
    public let trend: TrendDirection
    public let text: String
    public let icon: String
    public let color: String
    public let change: Double
    public let percentChange: Double
    public let currentSpeed: Double?
    public let previousSpeed: Double?
    public let directionTrend: DirectionStability?
    public let directionSpread: Double?
    public let directionIcon: String?
    public let directionText: String?

    public init(
        trend: TrendDirection,
        text: String,
        icon: String,
        color: String,
        change: Double,
        percentChange: Double,
        currentSpeed: Double? = nil,
        previousSpeed: Double? = nil,
        directionTrend: DirectionStability? = nil,
        directionSpread: Double? = nil,
        directionIcon: String? = nil,
        directionText: String? = nil
    ) {
        self.trend = trend
        self.text = text
        self.icon = icon
        self.color = color
        self.change = change
        self.percentChange = percentChange
        self.currentSpeed = currentSpeed
        self.previousSpeed = previousSpeed
        self.directionTrend = directionTrend
        self.directionSpread = directionSpread
        self.directionIcon = directionIcon
        self.directionText = directionText
    }

    /// SwiftUI color parsed from hex string.
    public var swiftUIColor: Color {
        Color(hex: color)
    }

    /// SF Symbol name for the trend.
    public var sfSymbol: String {
        trend.sfSymbol
    }

    /// Whether there is enough data to show a meaningful trend.
    public var hasData: Bool {
        trend != .insufficientData
    }
}

// MARK: - Trend Direction

public enum TrendDirection: String, Codable, Sendable, Hashable, CaseIterable {
    case increasingStrong = "increasing_strong"
    case increasing
    case stable
    case decreasing
    case decreasingStrong = "decreasing_strong"
    case insufficientData = "insufficient_data"

    /// SF Symbol name for the trend arrow.
    public var sfSymbol: String {
        switch self {
        case .increasingStrong: return "arrow.up"
        case .increasing: return "arrow.up.right"
        case .stable: return "arrow.right"
        case .decreasing: return "arrow.down.right"
        case .decreasingStrong: return "arrow.down"
        case .insufficientData: return "hourglass"
        }
    }

    /// Localized Russian label for the trend.
    public var labelRu: String {
        switch self {
        case .increasingStrong: return "Раздувает"
        case .increasing: return "Усиление"
        case .stable: return "Стабильно"
        case .decreasing: return "Ослабление"
        case .decreasingStrong: return "Стихает"
        case .insufficientData: return "Нет данных"
        }
    }

    /// Whether the wind is getting stronger.
    public var isStrengthening: Bool {
        self == .increasing || self == .increasingStrong
    }

    /// Whether the wind is getting weaker.
    public var isWeakening: Bool {
        self == .decreasing || self == .decreasingStrong
    }
}
