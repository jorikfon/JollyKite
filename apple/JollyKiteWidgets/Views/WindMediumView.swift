import SwiftUI
import JollyKiteShared

struct WindMediumView: View {
    let entry: WindEntry

    var body: some View {
        HStack(spacing: 16) {
            // Left: Wind speed
            VStack(spacing: 4) {
                Image(systemName: entry.safety.sfSymbol)
                    .font(.title3)
                    .foregroundStyle(entry.safety.color)

                Text(String(format: "%.1f", entry.speedInUnit))
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundStyle(entry.safety.color)

                Text(entry.unit.shortLabel)
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Text(entry.safety.labelRu)
                    .font(.caption2)
                    .foregroundStyle(entry.safety.color)
            }
            .frame(maxWidth: .infinity)

            Divider()

            // Right: Details
            VStack(alignment: .leading, spacing: 6) {
                detailRow(icon: "location.north.fill", label: entry.directionLabel, rotation: Double(entry.windDirection))
                if let gust = entry.gustFormatted {
                    detailRow(icon: "wind", label: "Порыв \(gust)")
                }
                detailRow(icon: "arrow.left.arrow.right", label: entry.shoreType.labelRu)

                Spacer()

                Text(entry.date.bangkokTimeString)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    private func detailRow(icon: String, label: String, rotation: Double = 0) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
                .rotationEffect(.degrees(rotation))
                .foregroundStyle(.secondary)
            Text(label)
                .font(.caption)
                .lineLimit(1)
        }
    }
}
