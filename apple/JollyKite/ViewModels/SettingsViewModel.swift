import Foundation
import SwiftUI
import JollyKiteShared

@Observable
final class SettingsViewModel {
    private let preferences: PreferencesStore

    var windUnit: WindUnit {
        didSet { preferences.windUnit = windUnit }
    }

    var language: AppLanguage {
        didSet { preferences.language = language }
    }

    var riderWeight: Double {
        didSet { preferences.riderWeight = riderWeight }
    }

    var boardType: BoardType {
        didSet { preferences.boardType = boardType }
    }

    var hapticFeedback: Bool {
        didSet { preferences.hapticFeedback = hapticFeedback }
    }

    var notificationsEnabled: Bool {
        didSet { preferences.notificationsEnabled = notificationsEnabled }
    }

    var serverURLString: String {
        didSet {
            if let url = URL(string: serverURLString) {
                preferences.serverURL = url
            }
        }
    }

    init(preferences: PreferencesStore) {
        self.preferences = preferences
        self.windUnit = preferences.windUnit
        self.language = preferences.language
        self.riderWeight = preferences.riderWeight
        self.boardType = preferences.boardType
        self.hapticFeedback = preferences.hapticFeedback
        self.notificationsEnabled = preferences.notificationsEnabled
        self.serverURLString = preferences.serverURL.absoluteString
    }

    var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}
