import AppIntents
import JollyKiteShared

struct ToggleWindUnitIntent: AppIntent {
    static var title: LocalizedStringResource = "Переключить единицы ветра"
    static var description = IntentDescription("Переключает между узлами и м/с")

    func perform() async throws -> some IntentResult {
        let preferences = PreferencesStore()
        switch preferences.windUnit {
        case .knots:
            preferences.windUnit = .metersPerSecond
        case .metersPerSecond:
            preferences.windUnit = .knots
        }
        return .result()
    }
}
