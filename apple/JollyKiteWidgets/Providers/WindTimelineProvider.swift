import WidgetKit
import JollyKiteShared

struct WindTimelineProvider: TimelineProvider {
    private let dataService = WidgetDataService()

    func placeholder(in context: Context) -> WindEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (WindEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }

        Task {
            let entry = await dataService.fetchEntry()
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WindEntry>) -> Void) {
        Task {
            let entry = await dataService.fetchEntry()

            // Smart refresh: shorter interval during working hours
            let refreshInterval: TimeInterval
            if WorkingHoursService.isWithinWorkingHours() {
                refreshInterval = 5 * 60  // 5 minutes during working hours
            } else {
                refreshInterval = 60 * 60  // 1 hour outside working hours
            }

            let nextUpdate = Date().addingTimeInterval(refreshInterval)
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }
}
