import WidgetKit
import JollyKiteShared

struct WindEntry: TimelineEntry {
    let date: Date
    let windSpeed: Double        // knots
    let windGust: Double?        // knots
    let windDirection: Int       // degrees
    let safety: SafetyLevel
    let unit: WindUnit
    let forecast: [WindForecastEntry]
    let isPlaceholder: Bool
    let todayHistory: [TodayFullTimeline.TimelineEntry]
    let todayForecast: [WindForecastEntry]
    let currentHour: Int?
    let currentMinute: Int?
    let directionStability: DirectionStability?

    // MARK: - Convenience

    var speedFormatted: String {
        unit.format(windSpeed)
    }

    var gustFormatted: String? {
        windGust.map { unit.format($0) }
    }

    var directionLabel: String {
        WindDirection(degrees: Double(windDirection)).compassLabelRu
    }

    var directionArrow: String {
        WindDirection(degrees: Double(windDirection)).arrowSymbol
    }

    var shoreType: ShoreType {
        WindDirection(degrees: Double(windDirection)).shoreType
    }

    var speedInUnit: Double {
        unit.convert(fromKnots: windSpeed)
    }

    // MARK: - Placeholder

    static let placeholder = WindEntry(
        date: Date(),
        windSpeed: 14.5,
        windGust: 18.2,
        windDirection: 90,
        safety: .good,
        unit: .knots,
        forecast: [],
        isPlaceholder: true,
        todayHistory: [],
        todayForecast: [],
        currentHour: nil,
        currentMinute: nil,
        directionStability: nil
    )

    static let empty = WindEntry(
        date: Date(),
        windSpeed: 0,
        windGust: nil,
        windDirection: 0,
        safety: .low,
        unit: .knots,
        forecast: [],
        isPlaceholder: false,
        todayHistory: [],
        todayForecast: [],
        currentHour: nil,
        currentMinute: nil,
        directionStability: nil
    )
}
