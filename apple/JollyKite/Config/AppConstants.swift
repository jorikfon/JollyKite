import SwiftUI
import JollyKiteShared

enum AppConstants {
    // MARK: - API
    enum API {
        static let defaultBaseURL = URL(string: "https://pnp.miko.ru/api")!
        static let sseEndpoint = "wind/stream"
    }

    // MARK: - Location
    enum Location {
        static let latitude = 12.346596
        static let longitude = 99.998179
        static let name = "Pak Nam Pran"
        static let nameRu = "Пак Нам Пран"
    }

    // MARK: - Update Intervals
    enum Intervals {
        static let activeUpdate: TimeInterval = 30
        static let backgroundUpdate: TimeInterval = 300
        static let forecastUpdate: TimeInterval = 1800
        static let animationDuration: TimeInterval = 0.6
    }

    // MARK: - Wind Thresholds (knots)
    enum WindThresholds {
        static let minKiting: Double = 8
        static let goodKiting: Double = 12
        static let strongWind: Double = 20
        static let dangerousWind: Double = 30
        static let maxGauge: Double = 40
    }

    // MARK: - Colors
    enum Colors {
        static let accent = Color(red: 0.227, green: 0.686, blue: 0.918)
        static let background = Color(.systemGroupedBackground)

        static func safetyColor(for level: SafetyLevel) -> Color {
            level.color
        }

        static let windLow = Color.blue.opacity(0.6)
        static let windModerate = Color.green
        static let windGood = Color.yellow
        static let windStrong = Color.orange
        static let windDangerous = Color.red

        static func windSpeedColor(_ knots: Double) -> Color {
            switch knots {
            case ..<5: return windLow
            case 5..<12: return windModerate
            case 12..<20: return windGood
            case 20..<30: return windStrong
            default: return windDangerous
            }
        }
    }

    // MARK: - Kite Sizes
    enum KiteSizes {
        static let available: [Double] = KiteSizeService.availableSizes
        static let defaultWeight: Double = KiteSizeService.defaultWeight
    }
}
