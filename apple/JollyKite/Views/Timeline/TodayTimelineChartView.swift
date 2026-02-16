import SwiftUI
import Charts
import JollyKiteShared

struct TodayTimelineChartView: View {
    let history: [TodayFullTimeline.TimelineEntry]
    let forecast: [WindForecastEntry]
    let currentHour: Int?
    let unit: WindUnit

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Сегодня")
                .font(.headline)

            if history.isEmpty && forecast.isEmpty {
                ContentUnavailableView {
                    Label("Нет данных", systemImage: "chart.xyaxis.line")
                } description: {
                    Text("Данные за сегодня пока недоступны")
                }
                .frame(height: 200)
            } else {
                Chart {
                    // History bars
                    ForEach(history, id: \.hour) { entry in
                        BarMark(
                            x: .value("Час", entry.hour),
                            y: .value("Скорость", unit.convert(fromKnots: entry.avgSpeed))
                        )
                        .foregroundStyle(AppConstants.Colors.windSpeedColor(entry.avgSpeed))
                        .opacity(0.8)

                        // Gust markers
                        if let gust = entry.maxGust {
                            PointMark(
                                x: .value("Час", entry.hour),
                                y: .value("Порыв", unit.convert(fromKnots: gust))
                            )
                            .foregroundStyle(.orange)
                            .symbolSize(16)
                        }
                    }

                    // Forecast line
                    ForEach(forecast) { entry in
                        LineMark(
                            x: .value("Час", entry.time),
                            y: .value("Прогноз", entry.speed(in: unit))
                        )
                        .foregroundStyle(.blue.opacity(0.6))
                        .lineStyle(StrokeStyle(lineWidth: 2, dash: [5, 3]))
                    }

                    // Current hour marker
                    if let hour = currentHour {
                        RuleMark(x: .value("Сейчас", hour))
                            .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [3, 2]))
                            .foregroundStyle(.red)
                    }

                    // Min kiting threshold
                    RuleMark(y: .value("Мин", unit.convert(fromKnots: AppConstants.WindThresholds.minKiting)))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(.green.opacity(0.4))
                }
                .frame(height: 200)
                .chartXAxis {
                    AxisMarks(values: .stride(by: 2)) { value in
                        AxisValueLabel {
                            if let hour = value.as(Int.self) {
                                Text("\(hour)")
                                    .font(.caption2)
                            }
                        }
                    }
                }
                .chartYAxisLabel(unit.shortLabel)

                // Legend
                HStack(spacing: 16) {
                    legendItem(color: .blue, label: "Факт", style: .solid)
                    legendItem(color: .blue.opacity(0.6), label: "Прогноз", style: .dashed)
                    legendItem(color: .orange, label: "Порывы", style: .dot)
                }
                .font(.caption2)
            }
        }
    }

    private enum LegendStyle { case solid, dashed, dot }

    private func legendItem(color: Color, label: String, style: LegendStyle) -> some View {
        HStack(spacing: 4) {
            switch style {
            case .solid:
                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: 12, height: 8)
            case .dashed:
                Rectangle()
                    .fill(color)
                    .frame(width: 12, height: 2)
            case .dot:
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
            }
            Text(label)
                .foregroundStyle(.secondary)
        }
    }
}
