import UIKit
import JollyKiteShared

enum HapticService {
    private static let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    private static let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
    private static let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
    private static let notificationGenerator = UINotificationFeedbackGenerator()

    static func windUpdate() {
        lightGenerator.impactOccurred()
    }

    static func safetyChange(level: SafetyLevel) {
        switch level {
        case .danger:
            notificationGenerator.notificationOccurred(.warning)
        case .excellent, .good:
            notificationGenerator.notificationOccurred(.success)
        default:
            mediumGenerator.impactOccurred()
        }
    }

    static func tabSwitch() {
        lightGenerator.impactOccurred(intensity: 0.5)
    }

    static func kiteSlider() {
        lightGenerator.impactOccurred(intensity: 0.3)
    }
}
