import SwiftUI
import Charts
import JollyKiteShared

struct ForecastChartView: View {
    let entries: [WindForecastEntry]
    let unit: WindUnit

    var body: some View {
        Chart {
            ForEach(entries) { entry in
                // Gust area
                AreaMark(
                    x: .value("Час", entry.time),
                    yStart: .value("Скорость", entry.speed(in: unit)),
                    yEnd: .value("Порыв", entry.gust(in: unit))
                )
                .foregroundStyle(.orange.opacity(0.2))

                // Speed line
                LineMark(
                    x: .value("Час", entry.time),
                    y: .value("Скорость", entry.speed(in: unit))
                )
                .foregroundStyle(Color.forSafety(entry.safety))
                .lineStyle(StrokeStyle(lineWidth: 2))

                // Speed points
                PointMark(
                    x: .value("Час", entry.time),
                    y: .value("Скорость", entry.speed(in: unit))
                )
                .foregroundStyle(Color.forSafety(entry.safety))
                .symbolSize(20)
            }

            // Kiting threshold
            RuleMark(y: .value("Мин", unit.convert(fromKnots: AppConstants.WindThresholds.minKiting)))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                .foregroundStyle(.green.opacity(0.5))
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: 3)) { value in
                AxisValueLabel {
                    if let hour = value.as(Int.self) {
                        Text("\(hour):00")
                            .font(.caption2)
                    }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading) { value in
                AxisValueLabel {
                    if let speed = value.as(Double.self) {
                        Text("\(Int(speed))")
                            .font(.caption2)
                    }
                }
            }
        }
    }
}
