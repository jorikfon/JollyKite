import SwiftUI
import WidgetKit
import JollyKiteShared

struct WindInlineView: View {
    let entry: WindEntry

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "wind")
            Text("\(String(format: "%.0f", entry.speedInUnit)) \(entry.unit.shortLabel)")
            Text(entry.directionArrow)
            Text(entry.directionLabel)
        }
    }
}
