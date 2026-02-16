import SwiftUI
import JollyKiteShared

@main
struct JollyKiteApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var preferences = PreferencesStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(preferences)
                .environment(appDelegate.pushService)
                .task {
                    appDelegate.pushService = PushNotificationService(preferences: preferences)
                    if preferences.notificationsEnabled {
                        await appDelegate.pushService.checkCurrentStatus()
                    }
                }
        }
    }
}

// MARK: - AppDelegate for APNs Token Handling

final class AppDelegate: NSObject, UIApplicationDelegate {
    var pushService = PushNotificationService(preferences: PreferencesStore())

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        pushService.didRegisterForRemoteNotifications(deviceToken: deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        pushService.didFailToRegisterForRemoteNotifications(error: error)
    }
}
