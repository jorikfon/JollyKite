import SwiftUI
import Charts
import JollyKiteShared

struct TodayTimelineChartView: View {
    let history: [TodayFullTimeline.TimelineEntry]
    let forecast: [WindForecastEntry]
    let currentHour: Int?
    let currentMinute: Int?
    let correctionFactor: Double
    let unit: WindUnit

    @Environment(\.verticalSizeClass) private var verticalSizeClass

    // MARK: - Timeline Point

    private struct TimelinePoint: Identifiable {
        let id = UUID()
        let timeInMinutes: Double
        let speedKnots: Double
        let isForecast: Bool
    }

    // MARK: - Peak

    private struct Peak {
        let timeInMinutes: Double
        let speedKnots: Double
    }

    // MARK: - Layout

    private var isLandscape: Bool {
        verticalSizeClass == .compact
    }

    private var chartHeight: CGFloat {
        isLandscape ? 280 : 220
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: isLandscape ? 4 : 8) {
            if !isLandscape {
                Text("Сегодня")
                    .font(.headline)
                    .padding(.leading, 4)
            }

            if history.isEmpty && forecast.isEmpty {
                ContentUnavailableView {
                    Label("Нет данных", systemImage: "chart.xyaxis.line")
                } description: {
                    Text("Данные за сегодня пока недоступны")
                }
                .frame(height: 200)
            } else {
                chartContent
                legend
            }
        }
    }

    // MARK: - Timeline Building

    private var timelinePoints: [TimelinePoint] {
        var points: [TimelinePoint] = []

        // History points
        for entry in history {
            let minutes = Double(entry.hour) * 60 + Double(entry.minute ?? 0)
            points.append(TimelinePoint(
                timeInMinutes: minutes,
                speedKnots: entry.avgSpeed,
                isForecast: false
            ))
        }

        // Forecast points — extract hour/minute from date in Bangkok timezone
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

        // Sort and filter to working hours
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

    // MARK: - Current Time

    private var currentTimeInMinutes: Double? {
        guard let hour = currentHour, let minute = currentMinute else { return nil }
        return Double(hour) * 60 + Double(minute)
    }

    // MARK: - Peaks

    private var peaks: [Peak] {
        let historyPoints = timelinePoints.filter { !$0.isForecast }
        guard !historyPoints.isEmpty else { return [] }

        let sorted = historyPoints.sorted { $0.speedKnots > $1.speedKnots }
        var selected: [Peak] = []

        for point in sorted {
            let tooClose = selected.contains { abs($0.timeInMinutes - point.timeInMinutes) < 90 }
            if !tooClose {
                selected.append(Peak(timeInMinutes: point.timeInMinutes, speedKnots: point.speedKnots))
                if selected.count >= 3 { break }
            }
        }

        return selected.sorted { $0.timeInMinutes < $1.timeInMinutes }
    }

    // MARK: - Gradient Stops

    /// Area gradient: full opacity for history, faded for forecast.
    private var areaGradientStops: [Gradient.Stop] {
        let points = timelinePoints
        guard points.count >= 2 else { return [.init(color: .blue.opacity(0.3), location: 0)] }
        let minTime = points.first!.timeInMinutes
        let maxTime = points.last!.timeInMinutes
        let range = maxTime - minTime
        guard range > 0 else { return [.init(color: .blue.opacity(0.3), location: 0)] }
        return points.map { point in
            let location = (point.timeInMinutes - minTime) / range
            let color = AppConstants.Colors.windSpeedColorDetailed(point.speedKnots)
            let opacity: Double = point.isForecast ? 0.15 : 0.6
            return Gradient.Stop(color: color.opacity(opacity), location: location)
        }
    }

    /// Line gradient: full opacity for history, dimmed for forecast.
    private var lineGradientStops: [Gradient.Stop] {
        let points = timelinePoints
        guard points.count >= 2 else { return [.init(color: .blue, location: 0)] }
        let minTime = points.first!.timeInMinutes
        let maxTime = points.last!.timeInMinutes
        let range = maxTime - minTime
        guard range > 0 else { return [.init(color: .blue, location: 0)] }
        return points.map { point in
            let location = (point.timeInMinutes - minTime) / range
            let color = AppConstants.Colors.windSpeedColorDetailed(point.speedKnots)
            let opacity: Double = point.isForecast ? 0.3 : 1.0
            return Gradient.Stop(color: color.opacity(opacity), location: location)
        }
    }

    // MARK: - Y Axis

    private var yAxisValues: [Double] {
        let max = maxDisplaySpeed
        let half = max * 0.5
        return [0, (half * 10).rounded() / 10, (max * 10).rounded() / 10]
    }

    // MARK: - Chart

    private var chartContent: some View {
        Chart {
            // Horizontal grid lines (Y-axis hidden, grid via RuleMarks)
            ForEach(yAxisValues, id: \.self) { value in
                RuleMark(y: .value("Grid", value))
                    .lineStyle(StrokeStyle(lineWidth: 0.5, dash: [4, 4]))
                    .foregroundStyle(.white.opacity(0.1))
            }

            // Unified area fill (history rich, forecast faded via gradient)
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

            // Unified line (history bright, forecast dimmed via gradient)
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
                .lineStyle(StrokeStyle(lineWidth: 2.5))
            }

            // Forecast dashed overlay
            ForEach(timelinePoints.filter(\.isForecast)) { point in
                LineMark(
                    x: .value("Время", point.timeInMinutes),
                    y: .value("Скорость", unit.convert(fromKnots: point.speedKnots)),
                    series: .value("Серия", "forecast")
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(Color(hex: "#FFD700").opacity(0.5))
                .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
            }

            // Golden divider at current time
            if let currentTime = currentTimeInMinutes {
                RuleMark(x: .value("Сейчас", currentTime))
                    .lineStyle(StrokeStyle(lineWidth: 2, dash: [8, 4]))
                    .foregroundStyle(Color(hex: "#FFD700").opacity(0.8))
                    .annotation(position: .top, alignment: .trailing) {
                        HStack(spacing: 4) {
                            Text("Факт")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.9))
                            Text("|")
                                .font(.caption2)
                                .foregroundStyle(.white.opacity(0.3))
                            Text(correctionFactor != 1.0
                                 ? "Прогноз ×\(String(format: "%.1f", correctionFactor))"
                                 : "Прогноз")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color(hex: "#FFD700").opacity(0.9))
                        }
                    }

                // Pulsing marker at current time on curve
                if let currentPoint = findClosestPoint(to: currentTime) {
                    PointMark(
                        x: .value("Сейчас", currentTime),
                        y: .value("Скорость", unit.convert(fromKnots: currentPoint.speedKnots))
                    )
                    .foregroundStyle(Color(hex: "#FFD700"))
                    .symbolSize(100)
                    .symbol {
                        ZStack {
                            Circle()
                                .fill(Color(hex: "#FFD700").opacity(0.3))
                                .frame(width: 20, height: 20)
                            Circle()
                                .fill(Color(hex: "#FFD700"))
                                .stroke(.white, lineWidth: 2)
                                .frame(width: 10, height: 10)
                            Circle()
                                .fill(.white.opacity(0.8))
                                .frame(width: 4, height: 4)
                        }
                    }
                }
            }

            // Peak markers
            ForEach(Array(peaks.enumerated()), id: \.offset) { _, peak in
                PointMark(
                    x: .value("Пик", peak.timeInMinutes),
                    y: .value("Скорость", unit.convert(fromKnots: peak.speedKnots))
                )
                .foregroundStyle(Color(hex: "#FF6B6B"))
                .symbolSize(60)
                .symbol {
                    Circle()
                        .fill(Color(hex: "#FF6B6B"))
                        .stroke(.white, lineWidth: 2)
                        .frame(width: 10, height: 10)
                }
                .annotation(position: .top, spacing: 4) {
                    VStack(spacing: 1) {
                        Text(unit.formatRu(peak.speedKnots, decimals: 1))
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color(hex: "#FF6B6B").opacity(0.9))
                            )
                        Text(formatTime(peak.timeInMinutes))
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color(hex: "#FF6B6B").opacity(0.9))
                    }
                }
            }
        }
        .frame(height: chartHeight)
        .chartXScale(domain: 360...1140)
        .chartYScale(domain: 0...maxDisplaySpeed)
        .chartYAxis(.hidden)
        .chartXAxis {
            AxisMarks(values: Array(stride(from: 360, through: 1080, by: 120))) { value in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [4, 4]))
                    .foregroundStyle(.white.opacity(0.1))
                AxisValueLabel {
                    if let minutes = value.as(Double.self) {
                        let hour = Int(minutes) / 60
                        Text("\(hour):00")
                            .font(.system(size: 10))
                    }
                }
            }
        }
        .chartOverlay { proxy in
            GeometryReader { geo in
                if let anchor = proxy.plotFrame {
                    let plotRect = geo[anchor]
                    yAxisLabelsOverlay(proxy: proxy, plotRect: plotRect)
                }
            }
            .allowsHitTesting(false)
        }
    }

    // MARK: - Y Axis Overlay

    @ViewBuilder
    private func yAxisLabelsOverlay(proxy: ChartProxy, plotRect: CGRect) -> some View {
        let values = yAxisValues
        ForEach(Array(values.enumerated()), id: \.offset) { index, value in
            if let yPos = proxy.position(forY: value) {
                Text(index == values.count - 1
                     ? "\(Int(value)) \(unit.shortLabelRu)"
                     : "\(Int(value))")
                    .font(.system(size: 9))
                    .foregroundStyle(.white.opacity(0.6))
                    .position(
                        x: plotRect.minX + (index == values.count - 1 ? 18 : 10),
                        y: plotRect.minY + yPos
                    )
            }
        }
    }

    // MARK: - Legend

    private var legend: some View {
        HStack(spacing: isLandscape ? 20 : 16) {
            // Fact — gradient bar
            HStack(spacing: 4) {
                LinearGradient(
                    colors: [Color(hex: "#87CEEB"), Color(hex: "#00FF00"), Color(hex: "#FFD700")],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: 20, height: 6)
                .clipShape(RoundedRectangle(cornerRadius: 2))
                Text("Факт")
                    .foregroundStyle(.secondary)
            }
            // Forecast — gold dashed
            HStack(spacing: 4) {
                Rectangle()
                    .fill(Color(hex: "#FFD700"))
                    .frame(width: 12, height: 2)
                Text("Прогноз")
                    .foregroundStyle(.secondary)
            }
            // Peaks — red dot
            HStack(spacing: 4) {
                Circle()
                    .fill(Color(hex: "#FF6B6B"))
                    .frame(width: 6, height: 6)
                Text("Пиковые")
                    .foregroundStyle(.secondary)
            }
        }
        .font(.caption2)
        .padding(.leading, 4)
    }

    // MARK: - Helpers

    private func findClosestPoint(to timeMinutes: Double) -> TimelinePoint? {
        timelinePoints.min(by: { abs($0.timeInMinutes - timeMinutes) < abs($1.timeInMinutes - timeMinutes) })
    }

    private func formatTime(_ minutes: Double) -> String {
        let h = Int(minutes) / 60
        let m = Int(minutes) % 60
        return String(format: "%d:%02d", h, m)
    }
}
