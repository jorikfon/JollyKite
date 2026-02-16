import SwiftUI
import JollyKiteShared

struct WindArrowAnnotation: View {
    let degrees: Double
    let speedText: String
    let unit: WindUnit
    let safety: SafetyLevel

    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                Circle()
                    .fill(safety.color)
                    .frame(width: 44, height: 44)
                    .shadow(color: safety.color.opacity(0.4), radius: 6)

                Image(systemName: "location.north.fill")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                    .rotationEffect(.degrees(degrees))
            }

            VStack(spacing: 0) {
                Text(speedText)
                    .font(.caption2.bold())
                Text(unit.shortLabel)
                    .font(.system(size: 8))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(.ultraThinMaterial, in: Capsule())
        }
    }
}
