import Foundation
import Combine

// MARK: - Preferences Store

/// User settings shared across iPhone, Watch, and Widgets.
/// Stored in App Group UserDefaults.
public final class PreferencesStore: ObservableObject, @unchecked Sendable {

    private let defaults: UserDefaults

    public init(defaults: UserDefaults? = nil) {
        self.defaults = defaults
            ?? UserDefaults(suiteName: SharedDataStore.appGroupIdentifier)
            ?? .standard
    }

    // MARK: - Keys

    private enum Keys {
        static let windUnit = "pref_windUnit"
        static let language = "pref_language"
        static let riderWeight = "pref_riderWeight"
        static let boardType = "pref_boardType"
        static let serverURL = "pref_serverURL"
        static let notificationsEnabled = "pref_notificationsEnabled"
        static let hapticFeedback = "pref_hapticFeedback"
    }

    // MARK: - Wind Unit

    /// Preferred wind speed unit (knots or m/s).
    public var windUnit: WindUnit {
        get {
            guard let raw = defaults.string(forKey: Keys.windUnit),
                  let unit = WindUnit(rawValue: raw) else {
                return .knots
            }
            return unit
        }
        set {
            objectWillChange.send()
            defaults.set(newValue.rawValue, forKey: Keys.windUnit)
        }
    }

    // MARK: - Language

    /// Preferred language. Defaults to Russian (primary audience).
    public var language: AppLanguage {
        get {
            guard let raw = defaults.string(forKey: Keys.language),
                  let lang = AppLanguage(rawValue: raw) else {
                return .russian
            }
            return lang
        }
        set {
            objectWillChange.send()
            defaults.set(newValue.rawValue, forKey: Keys.language)
        }
    }

    // MARK: - Rider Weight

    /// Rider weight in kg for kite size calculations.
    public var riderWeight: Double {
        get {
            let value = defaults.double(forKey: Keys.riderWeight)
            return value > 0 ? value : KiteSizeService.defaultWeight
        }
        set {
            objectWillChange.send()
            defaults.set(newValue, forKey: Keys.riderWeight)
        }
    }

    // MARK: - Board Type

    /// Preferred board type for kite size calculations.
    public var boardType: BoardType {
        get {
            guard let raw = defaults.string(forKey: Keys.boardType),
                  let type = BoardType(rawValue: raw) else {
                return .twintip
            }
            return type
        }
        set {
            objectWillChange.send()
            defaults.set(newValue.rawValue, forKey: Keys.boardType)
        }
    }

    // MARK: - Server URL

    /// Backend server URL. Defaults to production.
    public var serverURL: URL {
        get {
            if let string = defaults.string(forKey: Keys.serverURL),
               let url = URL(string: string) {
                return url
            }
            return URL(string: "https://pnp.miko.ru/api")!
        }
        set {
            objectWillChange.send()
            defaults.set(newValue.absoluteString, forKey: Keys.serverURL)
        }
    }

    // MARK: - Notifications

    /// Whether push notifications are enabled.
    public var notificationsEnabled: Bool {
        get { defaults.bool(forKey: Keys.notificationsEnabled) }
        set {
            objectWillChange.send()
            defaults.set(newValue, forKey: Keys.notificationsEnabled)
        }
    }

    // MARK: - Haptic Feedback

    /// Whether haptic feedback is enabled (Watch).
    public var hapticFeedback: Bool {
        get {
            // Default to true if never set
            if defaults.object(forKey: Keys.hapticFeedback) == nil { return true }
            return defaults.bool(forKey: Keys.hapticFeedback)
        }
        set {
            objectWillChange.send()
            defaults.set(newValue, forKey: Keys.hapticFeedback)
        }
    }

    // MARK: - Factory for API Client

    /// Create an APIClient configured with the user's server URL.
    public func makeAPIClient() -> JollyKiteAPIClient {
        JollyKiteAPIClient(baseURL: serverURL)
    }
}

// MARK: - App Language

public enum AppLanguage: String, Codable, Sendable, Hashable, CaseIterable {
    case russian = "ru"
    case english = "en"

    public var label: String {
        switch self {
        case .russian: return "Русский"
        case .english: return "English"
        }
    }
}
