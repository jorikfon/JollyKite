import SwiftUI
import WidgetKit
import JollyKiteShared

struct WindRectangularView: View {
    let entry: WindEntry

    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: "wind")
                        .font(.caption2)
                    Text("Ветер")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(String(format: "%.1f", entry.speedInUnit))
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                    Text(entry.unit.shortLabel)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 4) {
                    Text(entry.directionArrow)
                        .font(.caption2)
                    Text(entry.directionLabel)
                        .font(.caption2)
                    if let gust = entry.gustFormatted {
                        Text("|\(gust)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()
        }
        .widgetAccentable()
    }
}
