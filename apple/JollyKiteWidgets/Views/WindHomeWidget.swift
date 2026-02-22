import WidgetKit
import SwiftUI

struct WindHomeWidget: Widget {
    let kind = "WindHomeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WindTimelineProvider()) { entry in
            WindHomeWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Ветер")
        .description("Текущий ветер в Пак Нам Пран")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct WindHomeWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: WindEntry

    var body: some View {
        switch family {
        case .systemSmall:
            WindSmallView(entry: entry)
        case .systemMedium:
            WindMediumView(entry: entry)
        case .systemLarge:
            WindLargeView(entry: entry)
        default:
            WindSmallView(entry: entry)
        }
    }
}
