import WidgetKit
import SwiftUI
import JollyKiteShared

@main
struct JollyKiteWidgetBundle: WidgetBundle {
    var body: some Widget {
        WindHomeWidget()
        WindLockScreenWidget()
        WindInlineLockScreenWidget()
    }
}

// MARK: - Lock Screen Widget

struct WindLockScreenWidget: Widget {
    let kind = "WindLockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WindTimelineProvider()) { entry in
            WindLockScreenEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Ветер (экран блокировки)")
        .description("Скорость ветра на экране блокировки")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular])
    }
}

struct WindLockScreenEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: WindEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            WindCircularView(entry: entry)
        case .accessoryRectangular:
            WindRectangularView(entry: entry)
        default:
            WindCircularView(entry: entry)
        }
    }
}

// MARK: - Inline Lock Screen Widget

struct WindInlineLockScreenWidget: Widget {
    let kind = "WindInlineLockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WindTimelineProvider()) { entry in
            WindInlineView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Ветер (строка)")
        .description("Скорость ветра в строке")
        .supportedFamilies([.accessoryInline])
    }
}
