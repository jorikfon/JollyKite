import Foundation
import SwiftUI
import JollyKiteShared

@Observable
final class TimelineViewModel {
    private(set) var todayTimeline: TodayFullTimeline?
    private(set) var weekHistory: [WeekHistoryDay] = []
    private(set) var isLoading = true
    private(set) var error: String?

    private let preferences: PreferencesStore
    private var dataService: WindDataService?

    init(preferences: PreferencesStore) {
        self.preferences = preferences
    }

    func onAppear() {
        let client = preferences.makeAPIClient()
        self.dataService = WindDataService(apiClient: client)
        Task { await loadAll() }
    }

    func refresh() async {
        await loadAll()
    }

    private func loadAll() async {
        guard let dataService else { return }

        await withTaskGroup(of: Void.self) { group in
            group.addTask { [weak self] in
                do {
                    let timeline = try await dataService.todayTimeline()
                    await MainActor.run { self?.todayTimeline = timeline }
                } catch {
                    // Individual load failure
                }
            }
            group.addTask { [weak self, preferences] in
                do {
                    let client = preferences.makeAPIClient()
                    let days = try await client.fetchWeekHistory(days: 7)
                    await MainActor.run { self?.weekHistory = days }
                } catch {
                    // Individual load failure
                }
            }
        }

        await MainActor.run {
            self.isLoading = false
        }
    }

    var windUnit: WindUnit { preferences.windUnit }

    var todayEntries: [TodayFullTimeline.TimelineEntry] {
        todayTimeline?.history ?? []
    }

    var forecastEntries: [WindForecastEntry] {
        todayTimeline?.forecast ?? []
    }

    var currentHour: Int? {
        todayTimeline?.currentTime?.hour
    }
}
