import SwiftUI
import JollyKiteShared

extension Color {
    static let windSafe = Color.green
    static let windCaution = Color.yellow
    static let windWarning = Color.orange
    static let windDanger = Color.red
    static let windCalm = Color.blue.opacity(0.6)

    static func forWindSpeed(_ knots: Double) -> Color {
        AppConstants.Colors.windSpeedColor(knots)
    }

    static func forSafety(_ level: SafetyLevel) -> Color {
        level.color
    }

    static func forShoreType(_ type: ShoreType) -> Color {
        switch type {
        case .onshore: return .windSafe
        case .offshore: return .windDanger
        case .sideshore: return .windCaution
        }
    }
}
