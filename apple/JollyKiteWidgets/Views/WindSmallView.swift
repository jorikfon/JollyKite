import SwiftUI
import JollyKiteShared

struct WindSmallView: View {
    let entry: WindEntry

    var body: some View {
        VStack(spacing: 6) {
            HStack {
                Image(systemName: entry.safety.sfSymbol)
                    .foregroundStyle(entry.safety.color)
                Spacer()
                Text(entry.directionArrow)
                    .font(.title3)
            }

            Spacer()

            VStack(spacing: 2) {
                Text(String(format: "%.1f", entry.speedInUnit))
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.6)
                    .foregroundStyle(entry.safety.color)

                Text(entry.unit.shortLabel)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack {
                Text(entry.directionLabel)
                    .font(.caption2)
                Spacer()
                Text(entry.date.bangkokTimeString)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }
}
