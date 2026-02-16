import Foundation
import SwiftUI
import JollyKiteShared

@Observable
final class SettingsViewModel {
    private let preferences: PreferencesStore

    init(preferences: PreferencesStore) {
        self.preferences = preferences
    }

    var windUnit: WindUnit {
        get { preferences.windUnit }
        set { preferences.windUnit = newValue }
    }

    var language: AppLanguage {
        get { preferences.language }
        set { preferences.language = newValue }
    }

    var riderWeight: Double {
        get { preferences.riderWeight }
        set { preferences.riderWeight = newValue }
    }

    var boardType: BoardType {
        get { preferences.boardType }
        set { preferences.boardType = newValue }
    }

    var hapticFeedback: Bool {
        get { preferences.hapticFeedback }
        set { preferences.hapticFeedback = newValue }
    }

    var notificationsEnabled: Bool {
        get { preferences.notificationsEnabled }
        set { preferences.notificationsEnabled = newValue }
    }

    var serverURLString: String {
        get { preferences.serverURL.absoluteString }
        set {
            if let url = URL(string: newValue) {
                preferences.serverURL = url
            }
        }
    }

    var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}
