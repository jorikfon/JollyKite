import SwiftUI
import JollyKiteShared

struct WindSpeedGaugeView: View {
    let speed: Double
    let unit: WindUnit

    private var displaySpeed: Double {
        unit.convert(fromKnots: speed)
    }

    private var normalizedSpeed: Double {
        min(speed / AppConstants.WindThresholds.maxGauge, 1.0)
    }

    private var speedColor: Color {
        AppConstants.Colors.windSpeedColor(speed)
    }

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                // Background arc
                Circle()
                    .trim(from: 0.15, to: 0.85)
                    .stroke(Color.secondary.opacity(0.2), style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .rotationEffect(.degrees(126))

                // Speed arc
                Circle()
                    .trim(from: 0.15, to: 0.15 + normalizedSpeed * 0.7)
                    .stroke(speedColor, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .rotationEffect(.degrees(126))
                    .animation(.easeInOut(duration: AppConstants.Intervals.animationDuration), value: speed)

                VStack(spacing: 2) {
                    AnimatedNumberView(value: displaySpeed, format: "%.1f")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(speedColor)

                    Text(unit.shortLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Text("Скорость")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
