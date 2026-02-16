import SwiftUI
import JollyKiteShared

struct WindDetailsCardView: View {
    let windData: WindData?
    let trend: WindTrend?
    let unit: WindUnit

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Детали")
                    .font(.headline)
                Spacer()
                if let trend, trend.hasData {
                    Label(trend.trend.sfSymbol, systemImage: trend.sfSymbol)
                        .font(.caption)
                        .foregroundStyle(trend.swiftUIColor)
                }
            }

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
            ], spacing: 12) {
                detailCell(
                    title: "Порывы",
                    value: windData?.gust(in: unit)?.oneDecimal ?? "--",
                    unit: unit.shortLabel,
                    icon: "wind"
                )
                detailCell(
                    title: "Макс. порыв",
                    value: windData?.maxGust(in: unit)?.oneDecimal ?? "--",
                    unit: unit.shortLabel,
                    icon: "arrow.up.forward"
                )
                detailCell(
                    title: "Температура",
                    value: windData?.temperatureCelsius.map { "\(Int($0))" } ?? "--",
                    unit: "°C",
                    icon: "thermometer.medium"
                )
                detailCell(
                    title: "Влажность",
                    value: windData?.humidity.map { "\(Int($0))" } ?? "--",
                    unit: "%",
                    icon: "humidity"
                )
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func detailCell(title: String, value: String, unit: String, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title3.bold())
                Text(unit)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
