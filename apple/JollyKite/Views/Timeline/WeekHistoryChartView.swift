import SwiftUI
import Charts
import JollyKiteShared

struct WeekHistoryChartView: View {
    let days: [WeekHistoryDay]
    let unit: WindUnit

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Неделя")
                .font(.headline)

            if days.isEmpty {
                ContentUnavailableView {
                    Label("Нет данных", systemImage: "calendar")
                } description: {
                    Text("История за неделю пока недоступна")
                }
                .frame(height: 200)
            } else {
                Chart {
                    ForEach(days, id: \.date) { day in
                        if let avg = day.averageSpeed {
                            BarMark(
                                x: .value("День", day.date),
                                y: .value("Средняя", unit.convert(fromKnots: avg))
                            )
                            .foregroundStyle(AppConstants.Colors.windSpeedColor(avg))
                        }

                        if let gust = day.peakGust {
                            PointMark(
                                x: .value("День", day.date),
                                y: .value("Порыв", unit.convert(fromKnots: gust))
                            )
                            .foregroundStyle(.orange)
                            .symbolSize(30)
                            .symbol(.diamond)
                        }
                    }

                    // Min kiting threshold
                    RuleMark(y: .value("Мин", unit.convert(fromKnots: AppConstants.WindThresholds.minKiting)))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(.green.opacity(0.4))
                }
                .frame(height: 200)
                .chartXAxis {
                    AxisMarks { value in
                        AxisValueLabel {
                            if let date = value.as(String.self) {
                                Text(shortDate(date))
                                    .font(.caption2)
                            }
                        }
                    }
                }
                .chartYAxisLabel(unit.shortLabel)

                // Day summaries
                ForEach(days, id: \.date) { day in
                    daySummaryRow(day)
                }
            }
        }
    }

    private func daySummaryRow(_ day: WeekHistoryDay) -> some View {
        HStack {
            Text(shortDate(day.date))
                .font(.subheadline)
                .frame(width: 60, alignment: .leading)

            if let avg = day.averageSpeed {
                HStack(spacing: 2) {
                    Image(systemName: "wind")
                        .font(.caption2)
                    Text(unit.format(avg))
                        .font(.subheadline)
                }
                .foregroundStyle(AppConstants.Colors.windSpeedColor(avg))
            }

            Spacer()

            if let gust = day.peakGust {
                HStack(spacing: 2) {
                    Image(systemName: "arrow.up.forward")
                        .font(.caption2)
                    Text(unit.format(gust))
                        .font(.caption)
                }
                .foregroundStyle(.orange)
            }
        }
        .padding(.vertical, 2)
    }

    private func shortDate(_ dateStr: String) -> String {
        // Input: YYYY-MM-DD
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        return "\(parts[2]).\(parts[1])"
    }
}
