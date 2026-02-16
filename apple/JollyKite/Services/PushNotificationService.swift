import Foundation
import UIKit
import UserNotifications
import JollyKiteShared

/// Manages APNs registration and device token lifecycle
@Observable
final class PushNotificationService: NSObject {
    private(set) var isAuthorized = false
    private(set) var deviceToken: String?
    private(set) var error: String?

    private let preferences: PreferencesStore

    init(preferences: PreferencesStore) {
        self.preferences = preferences
        super.init()
    }

    // MARK: - Permission Request

    func requestPermission() async {
        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await MainActor.run {
                self.isAuthorized = granted
                if granted {
                    self.registerForRemoteNotifications()
                }
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isAuthorized = false
            }
        }
    }

    func checkCurrentStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        await MainActor.run {
            self.isAuthorized = settings.authorizationStatus == .authorized
        }
    }

    // MARK: - Remote Notification Registration

    private func registerForRemoteNotifications() {
        UIApplication.shared.registerForRemoteNotifications()
    }

    /// Called by AppDelegate when APNs returns a device token
    func didRegisterForRemoteNotifications(deviceToken data: Data) {
        let token = data.map { String(format: "%02x", $0) }.joined()
        self.deviceToken = token

        Task {
            await registerTokenOnServer(token)
        }
    }

    /// Called by AppDelegate when APNs registration fails
    func didFailToRegisterForRemoteNotifications(error: Error) {
        self.error = error.localizedDescription
        print("✗ APNs registration failed: \(error.localizedDescription)")
    }

    // MARK: - Server Registration

    private func registerTokenOnServer(_ token: String) async {
        let url = preferences.serverURL.appendingPathComponent("notifications/apns/register")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(["deviceToken": token])

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                print("✓ APNs token registered on server")
            }
        } catch {
            print("✗ Failed to register APNs token: \(error.localizedDescription)")
        }
    }

    func unregisterFromServer() async {
        guard let token = deviceToken else { return }

        let url = preferences.serverURL.appendingPathComponent("notifications/apns/unregister")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(["deviceToken": token])

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                print("✓ APNs token unregistered from server")
            }
        } catch {
            print("✗ Failed to unregister APNs token: \(error.localizedDescription)")
        }

        UIApplication.shared.unregisterForRemoteNotifications()
    }
}
