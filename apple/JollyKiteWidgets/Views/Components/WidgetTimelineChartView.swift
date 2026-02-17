import SwiftUI
import Charts
import JollyKiteShared

struct WidgetTimelineChartView: View {
    let history: [TodayFullTimeline.TimelineEntry]
    let forecast: [WindForecastEntry]
    let currentHour: Int?
    let currentMinute: Int?
    let unit: WindUnit

    // MARK: - Timeline Point

    private struct TimelinePoint: Identifiable {
        let id = UUID()
        let timeInMinutes: Double
        let speedKnots: Double
        let isForecast: Bool
    }

    // MARK: - Body

    var body: some View {
        if timelinePoints.isEmpty {
            EmptyView()
        } else {
            chartContent
        }
    }

    // MARK: - Timeline Building

    private var timelinePoints: [TimelinePoint] {
        var points: [TimelinePoint] = []

        for entry in history {
            let minutes = Double(entry.hour) * 60 + Double(entry.minute ?? 0)
            points.append(TimelinePoint(
                timeInMinutes: minutes,
                speedKnots: entry.avgSpeed,
                isForecast: false
            ))
        }

        let bangkok = TimeZone(identifier: "Asia/Bangkok")!
        var calendar = Calendar.current
        calendar.timeZone = bangkok

        var forecastPoints: [TimelinePoint] = []
        for entry in forecast {
            let hour = calendar.component(.hour, from: entry.date)
            let minute = calendar.component(.minute, from: entry.date)
            let minutes = Double(hour) * 60 + Double(minute)
            forecastPoints.append(TimelinePoint(
                timeInMinutes: minutes,
                speedKnots: entry.speedKnots,
                isForecast: true
            ))
        }

        // Interpolation bridge if gap > 30 min
        if let lastHistory = points.last, let firstForecast = forecastPoints.first {
            let gap = firstForecast.timeInMinutes - lastHistory.timeInMinutes
            if gap > 30 {
                var t = lastHistory.timeInMinutes + 30
                while t < firstForecast.timeInMinutes {
                    let ratio = (t - lastHistory.timeInMinutes) / gap
                    let speed = lastHistory.speedKnots + (firstForecast.speedKnots - lastHistory.speedKnots) * ratio
                    points.append(TimelinePoint(
                        timeInMinutes: t,
                        speedKnots: speed,
                        isForecast: true
                    ))
                    t += 30
                }
            }
        }

        points.append(contentsOf: forecastPoints)
        points.sort { $0.timeInMinutes < $1.timeInMinutes }
        return points.filter { $0.timeInMinutes >= 360 && $0.timeInMinutes <= 1140 }
    }

    private var maxSpeed: Double {
        let points = timelinePoints
        guard !points.isEmpty else { return 20 }
        return (points.map(\.speedKnots).max() ?? 20) * 1.15
    }

    private var maxDisplaySpeed: Double {
        unit.convert(fromKnots: maxSpeed)
    }

    private var currentTimeInMinutes: Double? {
        guard let hour = currentHour, let minute = currentMinute else { return nil }
        return Double(hour) * 60 + Double(minute)
    }

    // MARK: - Gradient Stops

    private var areaGradientStops: [Gradient.Stop] {
        let points = timelinePoints
        guard points.count >= 2 else { return [.init(color: .blue.opacity(0.3), location: 0)] }
        let minTime = points.first!.timeInMinutes
        let maxTime = points.last!.timeInMinutes
        let range = maxTime - minTime
        guard range > 0 else { return [.init(color: .blue.opacity(0.3), location: 0)] }
        return points.map { point in
            let location = (point.timeInMinutes - minTime) / range
            let color = Self.windSpeedColor(point.speedKnots)
            let opacity: Double = point.isForecast ? 0.15 : 0.5
            return Gradient.Stop(color: color.opacity(opacity), location: location)
        }
    }

    private var lineGradientStops: [Gradient.Stop] {
        let points = timelinePoints
        guard points.count >= 2 else { return [.init(color: .blue, location: 0)] }
        let minTime = points.first!.timeInMinutes
        let maxTime = points.last!.timeInMinutes
        let range = maxTime - minTime
        guard range > 0 else { return [.init(color: .blue, location: 0)] }
        return points.map { point in
            let location = (point.timeInMinutes - minTime) / range
            let color = Self.windSpeedColor(point.speedKnots)
            let opacity: Double = point.isForecast ? 0.3 : 1.0
            return Gradient.Stop(color: color.opacity(opacity), location: location)
        }
    }

    // MARK: - Chart

    private var chartContent: some View {
        Chart {
            // Area fill
            ForEach(timelinePoints) { point in
                AreaMark(
                    x: .value("Время", point.timeInMinutes),
                    y: .value("Скорость", unit.convert(fromKnots: point.speedKnots))
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(
                    LinearGradient(
                        stops: areaGradientStops,
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
            }

            // Line
            ForEach(timelinePoints) { point in
                LineMark(
                    x: .value("Время", point.timeInMinutes),
                    y: .value("Скорость", unit.convert(fromKnots: point.speedKnots))
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(
                    LinearGradient(
                        stops: lineGradientStops,
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .lineStyle(StrokeStyle(lineWidth: 1.5))
            }

            // Current time marker
            if let currentTime = currentTimeInMinutes {
                RuleMark(x: .value("Сейчас", currentTime))
                    .lineStyle(StrokeStyle(lineWidth: 1))
                    .foregroundStyle(Color(hex: "#FFD700").opacity(0.7))
            }
        }
        .frame(height: 75)
        .chartXScale(domain: 360...1140)
        .chartYScale(domain: 0...maxDisplaySpeed)
        .chartYAxis(.hidden)
        .chartXAxis {
            AxisMarks(values: [360, 720, 1080]) { value in
                AxisValueLabel {
                    if let minutes = value.as(Double.self) {
                        Text("\(Int(minutes) / 60)")
                            .font(.system(size: 8))
                    }
                }
            }
        }
    }

    // MARK: - Wind Speed Color (widget-local, matches PWA 7-tier scale)

    private static func windSpeedColor(_ knots: Double) -> Color {
        switch knots {
        case ..<5: return Color(hex: "#87CEEB")
        case 5..<10: return Color(hex: "#00CED1")
        case 10..<15: return Color(hex: "#00FF00")
        case 15..<20: return Color(hex: "#FFD700")
        case 20..<25: return Color(hex: "#FFA500")
        case 25..<30: return Color(hex: "#FF4500")
        default: return Color(hex: "#8B0000")
        }
    }
}
