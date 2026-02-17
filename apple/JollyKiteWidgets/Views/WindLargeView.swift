import SwiftUI
import JollyKiteShared

struct WindLargeView: View {
    let entry: WindEntry

    var body: some View {
        VStack(spacing: 12) {
            // Top: Safety + Speed
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(entry.safety.labelRu)
                        .font(.headline)
                        .foregroundStyle(entry.safety.color)
                    HStack(spacing: 4) {
                        Text(entry.shoreType.labelRu)
                        if let stability = entry.directionStability, stability != .insufficientData {
                            Text("•")
                            Image(systemName: stability.sfSymbol)
                                .font(.caption2)
                            Text(stability.labelRu)
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing) {
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(String(format: "%.1f", entry.speedInUnit))
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .foregroundStyle(entry.safety.color)
                        Text(entry.unit.shortLabel)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Divider()

            // Details grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                detailCell(icon: "location.north.fill", title: "Направление", value: entry.directionLabel)
                if let gust = entry.gustFormatted {
                    detailCell(icon: "wind", title: "Порывы", value: gust)
                }
            }

            // Timeline chart or forecast bar fallback
            if !entry.todayHistory.isEmpty || !entry.todayForecast.isEmpty {
                Divider()
                WidgetTimelineChartView(
                    history: entry.todayHistory,
                    forecast: entry.todayForecast,
                    currentHour: entry.currentHour,
                    currentMinute: entry.currentMinute,
                    unit: entry.unit
                )
            } else if !entry.forecast.isEmpty {
                Divider()
                ForecastBarView(entries: Array(entry.forecast.prefix(8)), unit: entry.unit)
            }

            Spacer()

            HStack {
                Text("Пак Нам Пран")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(entry.date.bangkokTimeString)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    private func detailCell(icon: String, title: String, value: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.subheadline.bold())
            }
            Spacer()
        }
    }
}
