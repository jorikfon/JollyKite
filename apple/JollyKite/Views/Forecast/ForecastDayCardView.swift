import SwiftUI
import JollyKiteShared

struct ForecastDayCardView: View {
    let date: Date
    let entries: [WindForecastEntry]
    let unit: WindUnit

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Day header
            HStack {
                Text(date.bangkokShortDateString)
                    .font(.headline)
                Spacer()
                if let peak = entries.map(\.speedKnots).max() {
                    Text("макс \(unit.format(peak))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Chart
            ForecastChartView(entries: entries, unit: unit)
                .frame(height: 120)

            // Hour details
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(entries) { entry in
                        hourCell(entry)
                    }
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func hourCell(_ entry: WindForecastEntry) -> some View {
        VStack(spacing: 4) {
            Text("\(entry.time)")
                .font(.caption2)
                .foregroundStyle(.secondary)

            Image(systemName: "location.north.fill")
                .font(.caption)
                .rotationEffect(.degrees(Double(entry.direction)))
                .foregroundStyle(Color.forSafety(entry.safety))

            Text(entry.speed(in: unit).oneDecimal)
                .font(.caption.bold())

            Text(unit.shortLabel)
                .font(.system(size: 8))
                .foregroundStyle(.secondary)
        }
        .frame(width: 44)
        .padding(.vertical, 6)
        .background(entry.safety.color.opacity(0.1), in: RoundedRectangle(cornerRadius: 8))
    }
}
