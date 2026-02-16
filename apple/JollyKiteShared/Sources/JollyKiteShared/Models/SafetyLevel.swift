import Foundation
import SwiftUI

// MARK: - Safety Level

/// Kitesurfing safety assessment combining wind direction and speed.
/// Matches the 5-level system from the existing app.
public enum SafetyLevel: String, Codable, Sendable, Hashable, CaseIterable, Comparable {
    case low        // < 5 knots, too weak
    case good       // Onshore light or sideshore moderate
    case moderate   // Sideshore or marginal conditions
    case excellent  // Onshore 12-25 knots (called "high" in backend)
    case danger     // Offshore or > 30 knots

    // MARK: - Display Properties

    public var label: String {
        switch self {
        case .low: return "Weak Wind"
        case .good: return "Good"
        case .moderate: return "Moderate"
        case .excellent: return "Excellent"
        case .danger: return "Dangerous"
        }
    }

    public var labelRu: String {
        switch self {
        case .low: return "Слабый ветер"
        case .good: return "Хорошо"
        case .moderate: return "Умеренно"
        case .excellent: return "Отлично!"
        case .danger: return "Опасно!"
        }
    }

    public var color: Color {
        switch self {
        case .low: return Color(hex: "#87CEEB")
        case .good: return Color(hex: "#FFD700")
        case .moderate: return Color(hex: "#FFA500")
        case .excellent: return Color(hex: "#00FF00")
        case .danger: return Color(hex: "#FF4500")
        }
    }

    public var sfSymbol: String {
        switch self {
        case .low: return "wind"
        case .good: return "checkmark.circle"
        case .moderate: return "exclamationmark.triangle"
        case .excellent: return "star.fill"
        case .danger: return "exclamationmark.octagon.fill"
        }
    }

    /// For Watch complications and widget tinting.
    public var tintColor: Color {
        color
    }

    /// Whether conditions are suitable for kitesurfing.
    public var isSuitable: Bool {
        self == .good || self == .excellent
    }

    /// Numeric order for Comparable conformance (higher = more intense).
    private var sortOrder: Int {
        switch self {
        case .low: return 0
        case .good: return 1
        case .moderate: return 2
        case .excellent: return 3
        case .danger: return 4
        }
    }

    public static func < (lhs: SafetyLevel, rhs: SafetyLevel) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }
}
