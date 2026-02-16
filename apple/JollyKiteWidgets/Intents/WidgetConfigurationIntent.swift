import AppIntents
import JollyKiteShared

enum WindUnitOption: String, AppEnum {
    case knots
    case metersPerSecond

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Единицы скорости ветра")

    static var caseDisplayRepresentations: [WindUnitOption: DisplayRepresentation] = [
        .knots: "Узлы (kn)",
        .metersPerSecond: "Метры в секунду (м/с)",
    ]

    var windUnit: WindUnit {
        switch self {
        case .knots: return .knots
        case .metersPerSecond: return .metersPerSecond
        }
    }
}

struct WindWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Настройка виджета ветра"
    static var description = IntentDescription("Настройка отображения данных ветра")

    @Parameter(title: "Единицы", default: .knots)
    var unit: WindUnitOption
}
