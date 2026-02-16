import SwiftUI
import JollyKiteShared

struct ForecastBarView: View {
    let entries: [WindForecastEntry]
    let unit: WindUnit

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Прогноз")
                .font(.caption2)
                .foregroundStyle(.secondary)

            HStack(spacing: 4) {
                ForEach(entries) { entry in
                    VStack(spacing: 2) {
                        Text("\(entry.time)")
                            .font(.system(size: 8))
                            .foregroundStyle(.secondary)

                        RoundedRectangle(cornerRadius: 2)
                            .fill(entry.safety.color)
                            .frame(height: barHeight(for: entry.speedKnots))

                        Text(String(format: "%.0f", entry.speed(in: unit)))
                            .font(.system(size: 8))
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 50)
        }
    }

    private func barHeight(for speed: Double) -> CGFloat {
        let maxSpeed: Double = 30
        let normalized = min(speed / maxSpeed, 1.0)
        return max(4, 30 * normalized)
    }
}
