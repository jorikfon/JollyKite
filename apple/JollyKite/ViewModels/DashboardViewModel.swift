import Foundation
import SwiftUI
import JollyKiteShared

@Observable
final class DashboardViewModel {
    // MARK: - State
    private(set) var windData: WindData?
    private(set) var trend: WindTrend?
    private(set) var safety: SafetyLevel = .low
    private(set) var kiteRecommendation: KiteSizeRecommendation?
    private(set) var isLoading = true
    private(set) var error: String?

    // MARK: - Dependencies
    private let preferences: PreferencesStore
    private let sseService = WindSSEService()
    private var apiClient: JollyKiteAPIClient?
    private var dataService: WindDataService?
    private var refreshTask: Task<Void, Never>?

    init(preferences: PreferencesStore) {
        self.preferences = preferences
    }

    // MARK: - Lifecycle

    func onAppear() {
        let client = preferences.makeAPIClient()
        self.apiClient = client
        self.dataService = WindDataService(apiClient: client)

        sseService.onWindUpdate = { [weak self] data in
            self?.handleWindUpdate(data)
        }
        sseService.onTrendUpdate = { [weak self] trend in
            self?.trend = trend
        }

        sseService.connect(baseURL: preferences.serverURL)
        loadInitialData()
    }

    func onDisappear() {
        sseService.disconnect()
        refreshTask?.cancel()
    }

    func refresh() async {
        await loadWindData()
    }

    // MARK: - Private

    private func loadInitialData() {
        refreshTask = Task {
            await loadWindData()
        }
    }

    private func loadWindData() async {
        guard let dataService else { return }
        do {
            let wind = try await dataService.currentWind()
            await MainActor.run {
                handleWindUpdate(wind)
                self.isLoading = false
                self.error = nil
            }
        } catch {
            await MainActor.run {
                self.isLoading = false
                self.error = "Не удалось загрузить данные"
            }
        }
    }

    private func handleWindUpdate(_ data: WindData) {
        let previousSafety = self.safety
        self.windData = data
        self.safety = WindSafetyService.evaluate(windData: data)
        self.kiteRecommendation = KiteSizeService.recommend(
            windSpeedKnots: data.windSpeedKnots,
            riderWeight: preferences.riderWeight,
            boardType: preferences.boardType
        )

        if preferences.hapticFeedback {
            HapticService.windUpdate()
            if safety != previousSafety {
                HapticService.safetyChange(level: safety)
            }
        }
    }

    // MARK: - Computed

    var windUnit: WindUnit { preferences.windUnit }

    var speedText: String {
        guard let windData else { return "--" }
        return windData.speed(in: preferences.windUnit).oneDecimal
    }

    var gustText: String {
        guard let gust = windData?.gust(in: preferences.windUnit) else { return "--" }
        return gust.oneDecimal
    }

    var directionText: String {
        windData?.direction.compassLabelRu ?? "--"
    }

    var directionDegrees: Double {
        windData?.direction.degrees ?? 0
    }

    var temperatureText: String {
        guard let temp = windData?.temperatureCelsius else { return "--" }
        return "\(Int(temp))°"
    }

    var lastUpdateText: String {
        windData?.timestamp.relativeString ?? ""
    }

    // MARK: - Dashboard Card Properties

    var conditionNameRu: String {
        let speed = windData?.windSpeedKnots ?? 0
        switch speed {
        case ..<5: return "Штиль"
        case 5..<12: return "Лёгкий ветер"
        case 12..<20: return "Умеренный ветер"
        case 20..<30: return "Сильный ветер"
        default: return "Экстремальный ветер"
        }
    }

    var conditionIcon: String {
        let speed = windData?.windSpeedKnots ?? 0
        switch speed {
        case ..<5: return "🍃"
        case 5..<12: return "💨"
        case 12..<20: return "🌬️"
        case 20..<30: return "💨"
        default: return "⚡"
        }
    }

    var safetySubtitleRu: String {
        let safetyLabel = safety.labelRu
        let shoreLabel = windData?.direction.shoreType.labelRu ?? ""
        if shoreLabel.isEmpty {
            return safetyLabel
        }
        return "\(safetyLabel) • \(shoreLabel)"
    }

    var trendDescriptionRu: String? {
        guard let trend, trend.hasData else { return nil }
        let sign = trend.percentChange >= 0 ? "+" : ""
        return "\(trend.trend.labelRu) \(sign)\(trend.percentChange.oneDecimal)% (за 30 мин)"
    }
}
