import SwiftUI
import WidgetKit
import JollyKiteShared

struct WindCircularView: View {
    let entry: WindEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()

            VStack(spacing: 0) {
                Image(systemName: "wind")
                    .font(.caption2)

                Text(String(format: "%.0f", entry.speedInUnit))
                    .font(.system(size: 22, weight: .bold, design: .rounded))

                Text(entry.unit.shortLabel)
                    .font(.system(size: 8))
                    .foregroundStyle(.secondary)
            }
        }
        .widgetAccentable()
    }
}
