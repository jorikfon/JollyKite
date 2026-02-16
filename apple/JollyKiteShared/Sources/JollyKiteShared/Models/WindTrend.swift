import Foundation
import SwiftUI

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

    public init(
        trend: TrendDirection,
        text: String,
        icon: String,
        color: String,
        change: Double,
        percentChange: Double,
        currentSpeed: Double? = nil,
        previousSpeed: Double? = nil
    ) {
        self.trend = trend
        self.text = text
        self.icon = icon
        self.color = color
        self.change = change
        self.percentChange = percentChange
        self.currentSpeed = currentSpeed
        self.previousSpeed = previousSpeed
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

    /// Whether the wind is getting stronger.
    public var isStrengthening: Bool {
        self == .increasing || self == .increasingStrong
    }

    /// Whether the wind is getting weaker.
    public var isWeakening: Bool {
        self == .decreasing || self == .decreasingStrong
    }
}
