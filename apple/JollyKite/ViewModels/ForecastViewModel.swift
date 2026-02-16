import Foundation
import SwiftUI
import JollyKiteShared

@Observable
final class ForecastViewModel {
    private(set) var forecast: WindForecast?
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
        Task { await loadForecast() }
    }

    func refresh() async {
        await loadForecast()
    }

    private func loadForecast() async {
        guard let dataService else { return }
        do {
            let entries = try await dataService.forecast()
            await MainActor.run {
                self.forecast = WindForecast(entries: entries)
                self.isLoading = false
                self.error = nil
            }
        } catch {
            await MainActor.run {
                self.isLoading = false
                self.error = "Не удалось загрузить прогноз"
            }
        }
    }

    // MARK: - Computed

    var windUnit: WindUnit { preferences.windUnit }

    var dayGroups: [[WindForecastEntry]] {
        forecast?.byDay ?? []
    }

    var bestCondition: WindForecastEntry? {
        forecast?.bestConditions
    }

    var peakSpeedText: String {
        guard let peak = forecast?.peakSpeed else { return "--" }
        return preferences.windUnit.format(peak)
    }
}
